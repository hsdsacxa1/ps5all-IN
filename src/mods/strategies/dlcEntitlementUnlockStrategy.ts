import type { DumpModStrategyHandler } from './types.ts';

export const dlcEntitlementUnlockStrategy: DumpModStrategyHandler = {
  id: 'dlc-entitlement-unlock',
  label: '3. Разблокировка DLC и Контента (ps5-dlc-toolchain + addcont Hook)',
  shortBadge: 'DLC Unlocker',
  architectureSummary:
    'Перехватывает обращения к libSceAppContent и libSceNpEntitlementAccess, монтируя сюжетные расширения из папки addcont/<DLC_LABEL> и разблокируя внутриигровые ключи (Deluxe/Pre-Order DLC) без PSN-тикетов.',
  requiredRuntimeStack: [
    'ps5-dlc-toolchain / nankhor/kite-pack v0.1.3',
    'fakelib/libSceAppContent.sprx (или патч eboot.bin)',
    'MacheteSVG v1.3.17 (опционально для NG+ сейвов)',
  ],
  generateArtifacts: (config) => [
    {
      id: 'pipeline-sh',
      filename: `unlock_dlc_${config.titleId.toLowerCase()}.sh`,
      label: '1. Скрипт разблокировки DLC (.sh)',
      language: 'bash',
      description:
        'Создаёт иерархию addcont/, генерирует манифесты дополнений и инжектирует хук libSceAppContent.',
      content: `#!/usr/bin/env bash
# ==============================================================================
# PS5 13.60 DLC Unlocker & Addcont Redirector (${config.gameTitle} - ${config.titleId})
# Supports: Story Expansions (addcont/) + Entitlement-Only Unlock Keys
# ==============================================================================
set -euo pipefail

GAME_DIR="\${1:-/data/games/${config.titleId}}"
mkdir -p "\${GAME_DIR}/addcont" "\${GAME_DIR}/fakelib"

echo "[1/3] Нормализация структуры папок дополнений (совместимо с kite-pack v0.1.3)..."
for dlc_dir in "\${GAME_DIR}/addcont/"*; do
  [ -d "\${dlc_dir}" ] || continue
  dlc_label="\$(basename "\${dlc_dir}")"
  mkdir -p "\${dlc_dir}/sce_sys"
  chmod -R 0777 "\${dlc_dir}"
  echo "  -> Обнаружен пакет дополнения: \${dlc_label}"
done

echo "[2/3] Установка редиректора прав libSceAppContent / libSceNpEntitlementAccess..."
cp -f /opt/ps5-dlc-toolchain/libSceAppContent_unlocker.sprx "\${GAME_DIR}/fakelib/libSceAppContent.sprx" 2>/dev/null || true
cp -f /opt/ps5-dlc-toolchain/libSceNpEntitlementAccess_unlocker.sprx "\${GAME_DIR}/fakelib/libSceNpEntitlementAccess.sprx" 2>/dev/null || true

echo "[3/3] Генерация таблицы разблокированных ключей dlc_entitlements.json..."
cat > "\${GAME_DIR}/addcont/dlc_entitlements.json" <<EOF
{
  "titleId": "${config.titleId}",
  "unlockAllEntitlements": true,
  "mountStatusOverride": "SCE_APP_CONTENT_MOUNT_STATUS_INSTALLED",
  "entries": [
    { "label": "DLC001EXPANSION0", "type": "story_addcont", "mountedPath": "/app0/addcont/DLC001EXPANSION0" },
    { "label": "DLCDELUXEPACK001", "type": "key_only", "entitled": true },
    { "label": "DLCPREORDERBONUS", "type": "key_only", "entitled": true }
  ]
}
EOF
chmod 0666 "\${GAME_DIR}/addcont/dlc_entitlements.json"
echo "Все DLC для ${config.titleId} успешно активированы."
`,
    },
    {
      id: 'param-json',
      filename: 'addcont/DLC001EXPANSION0/sce_sys/param.json',
      label: '2. Манифест DLC (addcont param.json)',
      language: 'json',
      description:
        'Эталонный sce_sys/param.json для сюжетного дополнения PS5 без PSN-привязки.',
      content: JSON.stringify(
        {
          titleId: config.titleId,
          contentId: `UP0001-${config.titleId}_00-DLC001EXPANSION0`,
          contentVersion: '01.000.000',
          applicationCategoryType: 1024,
          applicationDrmType: 'standard',
          requiredSystemSoftwareVersion: config.targetSdkHex,
          localizedParameters: {
            defaultLanguage: 'en-US',
            'en-US': {
              titleName: `${config.gameTitle} - Expansion Pack DLC`,
            },
          },
        },
        null,
        2
      ),
    },
    {
      id: 'patch-manifest',
      filename: 'fakelib/dlc_hook_rules.toml',
      label: '3. Правила хука libSceAppContent',
      language: 'xml',
      description:
        'Конфигурация перехвата вызовов sceAppContentGetAddcontInfoList и sceAppContentAddcontMount.',
      content: `# Конфигурация эмулятора DLC (libSceAppContent + libSceNpEntitlementAccess)
[dlc_unlocker]
target_title = "${config.titleId}"
redirect_addcont_root = "/app0/addcont"
unlock_all_key_entitlements = ${config.enableDlcRedirect ? 'true' : 'false'}
force_standard_drm = ${config.rewriteUpgradableDrm ? 'true' : 'false'}

[hooks]
sceAppContentGetAddcontInfoList = "ENUMERATE_ADDCONT_DIRS_AND_KEYS"
sceAppContentAddcontMount = "REDIRECT_TO_APP0_ADDCONT_SUBDIR"
sceNpEntitlementAccessGetAddcontEntitlementInfoList = "RETURN_FULL_ENTITLEMENT_OK"
`,
    },
    {
      id: 'ai-prompt',
      filename: `PROMPT_${config.titleId}_DLC_UNLOCK.md`,
      label: '4. Промпт для ИИ-агента (.md)',
      language: 'markdown',
      description:
        'Промпт для ИИ-агента по интеграции сюжетных дополнений и анлокеров контента в дамп PS5.',
      content: `# Задача: Разблокировка всех DLC и расширений для ${config.gameTitle} (${config.titleId})

## Цель
Подключить сюжетные дополнения из \`addcont/\` и активировать внутриигровые бонусы (Deluxe / Pre-Order) на оффлайн-консоли PS5 FW 13.60.

## Шаги реализации
1. Проверить структуру \`<GAME_ROOT>/addcont/<DLC_LABEL>/sce_sys/param.json\` (установить \`applicationDrmType = "standard"\`).
2. Инжектировать перехватчик \`libSceAppContent.sprx\` и \`libSceNpEntitlementAccess.sprx\` в каталог \`fakelib/\`.
3. При упаковке сжатого пакета использовать \`kite-pack v0.1.3+\` или \`ps5-dump-forge v0.5.6\`, чтобы папки \`addcont/\` корректно попали в индекс \`ampr-emu-ng v0.4.1\`.
`,
    },
  ],
};
