import type { DumpModStrategyHandler } from './types.ts';

export const bootAmprNpFixStrategy: DumpModStrategyHandler = {
  id: 'boot-ampr-npfix',
  label: '1. Фикс запуска дампа (ampr-emu-ng v0.4.1 + NP-Fix + 16 CNT)',
  shortBadge: 'Boot & Save Fix',
  architectureSummary:
    'Инжектирует ampr-emu-ng v0.4.1 (без лимита 48 MiB) для игр с APR-стримингом, нейтрализует проверку PSN через libSceNpOfflineStub + param.json (standard DRM) и распаковывает все 16 защищённых контейнеров sce_sys (фикс CE-107112-2).',
  requiredRuntimeStack: [
    'kstuff-lite v1.11+ (или OnionHEN v0.9.0)',
    'TITAN-CORE Mod v2 / Kraken Mount v0.2.1 / ShadowMountPlus 1.7b12',
    'ampr-emu-ng v0.4.1-675b0c6',
  ],
  generateArtifacts: (config) => [
    {
      id: 'pipeline-sh',
      filename: `fix_boot_${config.titleId.toLowerCase()}.sh`,
      label: '1. Скрипт подготовки дампа (.sh)',
      language: 'bash',
      description:
        'Автоматическая установка ampr-emu-ng v0.4.1, распаковка 16 контейнеров sce_sys, выставление прав UID (umask 0) и инъекция NP-Fix стаба.',
      content: `#!/usr/bin/env bash
# ==============================================================================
# PS5 13.60 Dump Boot & Save Fix Pipeline (${config.gameTitle} - ${config.titleId})
# Strategy: ampr-emu-ng v0.4.1 + libSceNp Offline Stub + 16 CNT Fallbacks
# ==============================================================================
set -euo pipefail

GAME_DIR="\${1:-/data/games/${config.titleId}}"
AMPR_SRC="/data/krakenmount/ampr/libSceAmpr.sprx"

echo "[1/4] Выставление прав доступа (umask 0) для SceSaveData и SceTrophy..."
umask 0
mkdir -p "\${GAME_DIR}/sce_module" "\${GAME_DIR}/fakelib" "\${GAME_DIR}/sce_sys/trophy2" "\${GAME_DIR}/sce_sys/uds"

${
  config.includeAmpr041
    ? `echo "[2/4] Инъекция ampr-emu-ng v0.4.1 (Unlimited >48 MiB Index + Zstd/LZ4 APR)..."
if [ -f "\${AMPR_SRC}" ]; then
  cp -f "\${AMPR_SRC}" "\${GAME_DIR}/sce_module/libSceAmpr.sprx"
  cp -f "\${AMPR_SRC}" "\${GAME_DIR}/fakelib/libSceAmpr.sprx"
  chmod 0755 "\${GAME_DIR}/sce_module/libSceAmpr.sprx" "\${GAME_DIR}/fakelib/libSceAmpr.sprx"
fi`
    : 'echo "[2/4] Инъекция ampr-emu-ng пропущена по настройкам рецепта."'
}

${
  config.extract16ProtectedCnt
    ? `echo "[3/4] Проверка и фикс прав 16 системных контейнеров sce_sys (фикс CE-107112-2)..."
chmod -R 0777 "\${GAME_DIR}/sce_sys"
find "\${GAME_DIR}/sce_sys" -type f -exec chmod 0666 {} +
# Гарантируем чтение трофеев и иконок сохранений системными UID:
for f in save_data.png icon0.png pic0.png pic1.png snd0.at9 nptitle.dat trophy2/trophy00.ucp trophy2/npbind.dat uds/uds00.ucp uds/npbind.dat; do
  [ -f "\${GAME_DIR}/sce_sys/\${f}" ] && chmod 0644 "\${GAME_DIR}/sce_sys/\${f}"
done`
    : 'echo "[3/4] Извлечение 16 CNT контейнеров пропущено."'
}

echo "[4/4] Готово! Дамп ${config.titleId} подготовлен к монтированию на PS5 FW 13.60."
`,
    },
    {
      id: 'param-json',
      filename: 'sce_sys/param.json',
      label: '2. Патченный sce_sys/param.json',
      language: 'json',
      description:
        'Манифест дампа со сброшенным DRM-типом upgradable -> standard и нормализованным порогом прошивки 13.60.',
      content: JSON.stringify(
        {
          titleId: config.titleId,
          contentVersion: config.contentVersion,
          applicationCategoryType: 0,
          applicationDrmType: config.rewriteUpgradableDrm ? 'standard' : 'upgradable',
          requiredSystemSoftwareVersion: config.targetSdkHex,
          sdkVersion: config.targetSdkHex,
          attribute: [4, 32],
          localizedParameters: {
            defaultLanguage: 'en-US',
            'en-US': {
              titleName: `${config.gameTitle} [13.60 Dump Fixed]`,
            },
          },
          pubtools: {
            creationDate: '2026-11-16',
            toolVersion: 'TITAN-CORE-Mod-v2 / Kraken-v0.2.1',
          },
        },
        null,
        2
      ),
    },
    {
      id: 'patch-manifest',
      filename: `/data/krakenmount/config.toml`,
      label: '3. Конфиг монтировщика (config.toml)',
      language: 'xml',
      description:
        'Конфигурация для TITAN-CORE Mod v2 / Kraken Mount v0.2.1 с включенным AMPR v0.4.1 и кэшем STAMP_V=2.',
      content: `# Конфигурация TITAN-CORE Mod v2 / Kraken Mount v0.2.1 для ${config.titleId}
scan_paths = ["/data/games", "/data/homebrew", "/mnt/usb0/games"]
game_fakelib = "${config.includeNpOfflineStub || config.includeAmpr041 ? 'auto' : 'off'}"
inject_ampr_emu_ng = ${config.includeAmpr041 ? 'true' : 'false'}
extract_protected_cnt_16 = ${config.extract16ProtectedCnt ? 'true' : 'false'}
rewrite_upgradable_drm = ${config.rewriteUpgradableDrm ? 'true' : 'false'}

[titles.${config.titleId}]
name = "${config.gameTitle}"
np_offline_stub = ${config.includeNpOfflineStub ? 'true' : 'false'}
force_umask_zero = true
`,
    },
    {
      id: 'ai-prompt',
      filename: `PROMPT_${config.titleId}_BOOT_FIX.md`,
      label: '4. Промпт для ИИ-агента (.md)',
      language: 'markdown',
      description:
        'Готовое техническое задание для ИИ-агента по диагностике и починке незапускающегося дампа на PS5 13.60.',
      content: `# Задача: Починка запуска и сохранений дампа ${config.gameTitle} (${config.titleId}) на PS5 FW 13.60

## Контекст целевой консоли
- **Прошивка**: PS5 FW 13.60 (Relapse + Y2JB / WebKit)
- **Активный стек**: \`kstuff-lite v1.11\`, \`TITAN-CORE Mod v2\` / \`Kraken Mount v0.2.1\`, \`ShadowMountPlus 1.7beta12\`
- **Целевой дамп**: \`${config.titleId}\` (версия \`${config.contentVersion}\`, целевой SDK \`${config.targetSdkHex}\`)

## Чек-лист исправлений для агента
1. **AMPR Asset Streaming**: ${config.includeAmpr041 ? 'Заменить `libSceAmpr.sprx` на `ampr-emu-ng v0.4.1-675b0c6` (снят лимит 48 MiB на индекс файлов).' : 'Не требуется.'}
2. **DRM & PSN Bypass**: ${config.rewriteUpgradableDrm ? 'В `sce_sys/param.json` переписать `"applicationDrmType": "upgradable"` на `"standard"`.' : 'Оставить стандартный.'} ${config.includeNpOfflineStub ? 'Подключить оффлайн-стаб `libSceNp` в `fakelib/`.' : ''}
3. **Фикс CE-107112-2 (Сейвы и Трофеи)**: ${config.extract16ProtectedCnt ? 'Извлечь все 16 защищённых контейнеров CNT (`save_data.png`, `trophy00.ucp`, `uds00.ucp`, `nptitle.dat`, `npbind.dat`) и выставить права `0777` на папки и `+0444` на файлы при `umask(0)`.' : 'Пропустить.'}
`,
    },
  ],
};
