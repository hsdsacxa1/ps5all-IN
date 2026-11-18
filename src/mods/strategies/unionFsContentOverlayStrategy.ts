import { DumpModStrategyHandler } from './types';

export const unionFsContentOverlayStrategy: DumpModStrategyHandler = {
  id: 'unionfs-content-mod',
  label: '5. Оверлей модов ассетов и Русификаторов (Stacked UnionFS / ~mods)',
  shortBadge: 'UnionFS Mod Layer',
  architectureSummary:
    'Неразрушающее подключение русификаторов озвучки/текста, реплейсеров моделей и модов Unreal Engine 4/5 (.pak / .utoc / .ucas) поверх неизменного базового дампа через многослойный FreeBSD UnionFS (аналог AFR на PS5).',
  requiredRuntimeStack: [
    'KrakenShadow-Mix / TITAN-CORE Mod v2 / ShadowMountPlus 1.7b12',
    'UE4/UE5 IoStore (.sig) Signature Bypass в eboot.bin',
    'ampr-emu-ng v0.4.1 (при замене крупных контейнеров озвучки)',
  ],
  generateArtifacts: (config) => [
    {
      id: 'pipeline-sh',
      filename: `mount_mod_overlay_${config.titleId.toLowerCase()}.sh`,
      label: '1. Скрипт монтирования мода (.sh)',
      language: 'bash',
      description:
        'Создаёт каталог верхнего слоя /data/mods/<PPSA>, накладывает файлы русификатора/модов через unionfs поверх /app0 без пересборки дампа.',
      content: `#!/usr/bin/env bash
# ==============================================================================
# PS5 13.60 Stacked UnionFS Mod & Localization Overlay (${config.gameTitle} - ${config.titleId})
# Zero-repack non-destructive asset override (AFR equivalent for PS5)
# ==============================================================================
set -euo pipefail

TITLE_ID="${config.titleId}"
BASE_DUMP_DIR="/data/games/\${TITLE_ID}"
MOD_UPPER_DIR="/data/mods/\${TITLE_ID}_overlay"
MERGED_MOUNT="/data/homebrew/\${TITLE_ID}"

echo "[1/3] Подготовка верхнего слоя модов и русификатора в \${MOD_UPPER_DIR}..."
mkdir -p "\${MOD_UPPER_DIR}/Content/Paks/~mods" "\${MERGED_MOUNT}"
chmod -R 0777 "\${MOD_UPPER_DIR}"

echo "[2/3] Наложение Stacked UnionFS (lowerdir=чистый дамп, upperdir=папка модов)..."
# Сначала привязываем базовый дамп в точку монтирования только для чтения:
mount_nullfs -o ro "\${BASE_DUMP_DIR}" "\${MERGED_MOUNT}" 2>/dev/null || true
# Накладываем поверх слой модов (приоритет у файлов из MOD_UPPER_DIR):
mount -t unionfs -o noatime "\${MOD_UPPER_DIR}" "\${MERGED_MOUNT}" 2>/dev/null || true

echo "[3/3] Оповещение ShadowMountPlus / TITAN-CORE о готовности модифицированного дампа..."
curl -s -X POST http://127.0.0.1:10101/api/v1/scan -H "Content-Type: application/json" -d '{}' || true
echo "Оверлей модов для \${TITLE_ID} активен! Оригинальные файлы дампа не затронуты."
`,
    },
    {
      id: 'param-json',
      filename: 'sce_sys/param.json',
      label: '2. param.json (Mod Overlay Tag)',
      language: 'json',
      description:
        'Манифест верхнего слоя /data/mods/<PPSA>/sce_sys/param.json с отметкой активного мод-пака на иконке главного экрана.',
      content: JSON.stringify(
        {
          titleId: config.titleId,
          contentVersion: config.contentVersion,
          applicationCategoryType: 0,
          applicationDrmType: 'standard',
          requiredSystemSoftwareVersion: config.targetSdkHex,
          localizedParameters: {
            defaultLanguage: 'ru-RU',
            'ru-RU': {
              titleName: `${config.gameTitle} [RU Voice + Mods Overlay]`,
            },
            'en-US': {
              titleName: `${config.gameTitle} [Mod Overlay Active]`,
            },
          },
        },
        null,
        2
      ),
    },
    {
      id: 'patch-manifest',
      filename: `/data/mods/${config.titleId}_overlay/mod_layer.toml`,
      label: '3. Конфиг слоёв модов (mod_layer.toml)',
      language: 'xml',
      description:
        'Декларативное описание подключаемых слоёв (русификатор звука, HD-текстуры, UE5 ~mods паки) и обхода проверки .sig.',
      content: `# Stacked UnionFS Mod Overlay Configuration (${config.titleId})
[overlay]
title_id = "${config.titleId}"
base_dump = "/data/games/${config.titleId}"
upper_mod_dir = "/data/mods/${config.titleId}_overlay"
bypass_ue5_pak_sig = true
invalidate_ampr_cache_on_change = ${config.includeAmpr041 ? 'true' : 'false'}

[[layers]]
priority = 10
name = "Russian Voiceover & Subtitles Pack"
path = "Content/Paks/~mods/pakchunk99_ru_voice_P.pak"
enabled = true

[[layers]]
priority = 20
name = "Custom Outfits & Gameplay Rebalance (IoStore .utoc/.ucas)"
path = "Content/Paks/~mods/zz_custom_content_P.utoc"
enabled = true
`,
    },
    {
      id: 'ai-prompt',
      filename: `PROMPT_${config.titleId}_MOD_OVERLAY.md`,
      label: '4. Промпт для ИИ-агента (.md)',
      language: 'markdown',
      description:
        'Промпт для ИИ-агента по настройке неразрушающего моддинга ассетов и отключению проверки подписи .pak/.utoc на PS5.',
      content: `# Задача: Подключение модов ассетов и русификатора к ${config.gameTitle} (${config.titleId}) без перепаковки дампа

## Архитектурное решение (PS5 13.60)
Вместо пересборки 100 ГБ образа используется **Stacked UnionFS Overlay**:
1. Чистый дамп остаётся в \`/data/games/${config.titleId}\` (read-only \`lowerdir\`).
2. Все модифицированные файлы (\`.pak\`, \`.utoc\`, \`.ucas\`, локализации \`.bnk\`) размещаются в \`/data/mods/${config.titleId}_overlay/\` (\`upperdir\`).
3. Для игр на Unreal Engine 4/5 в \`eboot.bin\` патчится \`FPakPlatformFile::CheckSignature\` (возврат \`true\`), чтобы движок загружал неподписанные архивы из \`Content/Paks/~mods/\`.
`,
    },
  ],
};
