import type { DumpModStrategyHandler } from './types.ts';

export const fakelibBackportStrategy: DumpModStrategyHandler = {
  id: 'fakelib-backport',
  label: '2. Бэкпорт прошивки и fakelib (BackPork + selfutil-patched)',
  shortBadge: 'Backport & fakelib',
  architectureSummary:
    'Распаковывает FSELF-бинарники (eboot.bin и *.prx) через CyB1K selfutil-patched, понижает заголовки PT_SCE_PROCPARAM до целевого SDK 13.60 и монтирует каталог fakelib/ с пропатченными системными модулями через BestPig/BackPork (UnionFS).',
  requiredRuntimeStack: [
    'BestPig/BackPork v0.4 (или встроенный UnionFS fakelib в TITAN-CORE / Kraken Mount)',
    'CyB1K/selfutil-patched + PS5-BACKPORK-KITCHEN',
    'kstuff-lite v1.11+',
  ],
  generateArtifacts: (config) => [
    {
      id: 'pipeline-sh',
      filename: `backport_${config.titleId.toLowerCase()}.sh`,
      label: '1. Скрипт бэкпорта и fakelib (.sh)',
      language: 'bash',
      description:
        'Конвейер распаковки FSELF -> ELF, патчинга SDK-версии в PT_SCE_PROCPARAM и сборки директории fakelib/.',
      content: `#!/usr/bin/env bash
# ==============================================================================
# PS5 13.60 BackPork & SDK Downgrade Pipeline (${config.gameTitle} - ${config.titleId})
# Target SDK Version: ${config.targetSdkHex}
# ==============================================================================
set -euo pipefail

GAME_DIR="\${1:-/data/games/${config.titleId}}"
TARGET_SDK="${config.targetSdkHex}"

echo "[1/4] Распаковка FSELF -> ELF64 через selfutil-patched..."
selfutil-patched --unpack "\${GAME_DIR}/eboot.bin" --output "\${GAME_DIR}/eboot.elf"
for prx in "\${GAME_DIR}/sce_module/"*.prx "\${GAME_DIR}/sce_module/"*.sprx; do
  [ -f "\${prx}" ] || continue
  selfutil-patched --unpack "\${prx}" --output "\${prx}.elf"
done

echo "[2/4] Понижение PT_SCE_PROCPARAM / PT_SCE_MODULE_PARAM до \${TARGET_SDK}..."
python3 downgrade_elf_sdk.py --target-sdk "\${TARGET_SDK}" "\${GAME_DIR}/eboot.elf"
for elf in "\${GAME_DIR}/sce_module/"*.elf; do
  [ -f "\${elf}" ] || continue
  python3 downgrade_elf_sdk.py --target-sdk "\${TARGET_SDK}" "\${elf}"
done

echo "[3/4] Подпись Fake-SELF (совместимая с kstuff-lite v1.11)..."
make_fself_ps5 "\${GAME_DIR}/eboot.elf" "\${GAME_DIR}/eboot.bin"
rm -f "\${GAME_DIR}/eboot.elf"

echo "[4/4] Формирование каталога fakelib/ для BestPig/BackPork..."
mkdir -p "\${GAME_DIR}/fakelib"
# Копирование BPS-пропатченных библиотек из PS5-BACKPORK-KITCHEN:
cp -f /opt/backpork-kitchen/1360/*.sprx "\${GAME_DIR}/fakelib/" 2>/dev/null || true
${
  config.includeAmpr041
    ? 'cp -f /data/krakenmount/ampr/libSceAmpr.sprx "${GAME_DIR}/fakelib/libSceAmpr.sprx"'
    : ''
}
chmod -R 0755 "\${GAME_DIR}/fakelib"
echo "Бэкпорт дампа ${config.titleId} под SDK \${TARGET_SDK} успешно завершён."
`,
    },
    {
      id: 'param-json',
      filename: 'sce_sys/param.json',
      label: '2. Бэкпортированный param.json',
      language: 'json',
      description:
        'Манифест с пониженными полями requiredSystemSoftwareVersion и sdkVersion для беспрепятственного старта на 13.60.',
      content: JSON.stringify(
        {
          titleId: config.titleId,
          contentVersion: config.contentVersion,
          applicationCategoryType: 0,
          applicationDrmType: config.rewriteUpgradableDrm ? 'standard' : 'upgradable',
          requiredSystemSoftwareVersion: config.targetSdkHex,
          sdkVersion: config.targetSdkHex,
          fakelibUnionFs: true,
          localizedParameters: {
            defaultLanguage: 'en-US',
            'en-US': {
              titleName: `${config.gameTitle} [BackPork ${config.targetSdkHex}]`,
            },
          },
        },
        null,
        2
      ),
    },
    {
      id: 'patch-manifest',
      filename: 'fakelib/backpork_manifest.toml',
      label: '3. Манифест подмены fakelib (.toml)',
      language: 'xml',
      description:
        'Список перенаправляемых системных библиотек (.sprx) в папке fakelib/ для монтирования через UnionFS.',
      content: `# BackPork / UnionFS fakelib Redirection Manifest (${config.titleId})
[backpork]
title_id = "${config.titleId}"
target_sdk = "${config.targetSdkHex}"
mount_mode = "unionfs_overlay"
fakelib_dir = "/data/games/${config.titleId}/fakelib"

[modules]
libSceAgc = "fakelib/libSceAgc_1360_backport.sprx"
libScePlayGo = "fakelib/libScePlayGo_stub.sprx"
libSceAmpr = "${config.includeAmpr041 ? 'fakelib/libSceAmpr.sprx (v0.4.1)' : 'system_default'}"
libSceNpManager = "${config.includeNpOfflineStub ? 'fakelib/libSceNpManager_offline.sprx' : 'system_default'}"
`,
    },
    {
      id: 'ai-prompt',
      filename: `PROMPT_${config.titleId}_BACKPORT.md`,
      label: '4. Промпт для ИИ-агента (.md)',
      language: 'markdown',
      description:
        'Инструкция для ИИ-агента по выполнению бэкпорта апдейта игры и сборке fakelib/ под прошивку 13.60.',
      content: `# Задача: Бэкпорт дампа/апдейта ${config.gameTitle} (${config.titleId}) под PS5 FW 13.60

## Проблема
Апдейт \`${config.contentVersion}\` скомпилирован под более новый SDK и падает с \`CE-100008-9\` или требует обновления прошивки.

## Алгоритм действий
1. Распаковать \`eboot.bin\` и все модули в \`sce_module/\` с помощью \`selfutil-patched\`.
2. Пропатчить сегменты \`PT_SCE_PROCPARAM\` (\`0x61000001\`) и \`PT_SCE_MODULE_PARAM\` (\`0x61000002\`), установив \`sdk_version = ${config.targetSdkHex}\`.
3. Подготовить папку \`<GAME_ROOT>/fakelib/\` с адаптированными \`.sprx\` модулями и активировать \`game_fakelib = "auto"\` в монтировщике (\`BackPork\` / \`TITAN-CORE Mod v2\`).
`,
    },
  ],
};
