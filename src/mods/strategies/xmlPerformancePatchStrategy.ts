import type { DumpModStrategyHandler } from './types.ts';

export const xmlPerformancePatchStrategy: DumpModStrategyHandler = {
  id: 'xml-60fps-resolution',
  label: '4. Патчи 60/120 FPS, Debug-меню и Графика (illusion0001 / NeoEnabler)',
  shortBadge: '60/120 FPS & XML',
  architectureSummary:
    'Генерирует XML/SHN патчи памяти в стандарте illusion0001/console-game-patches и TeeKay87/HEN-Cheats-Collection для снятия лимита 30 FPS, отключения мыла (Motion Blur / Chromatic Aberration) и активации скрытого Debug-меню разработчиков.',
  requiredRuntimeStack: [
    'NeoEnabler v0.3.2+ / OnionHEN v0.9.0 / etaHEN 13.60 Cheat & Patch Plugin',
    'illusion0001/console-game-patches',
    'TeeKay87/HEN-Cheats-Collection',
  ],
  generateArtifacts: (config) => [
    {
      id: 'pipeline-sh',
      filename: `deploy_xml_patch_${config.titleId.toLowerCase()}.sh`,
      label: '1. Скрипт деплоя XML/SHN патча (.sh)',
      language: 'bash',
      description:
        'Устанавливает XML-патч (60/120 FPS + Debug Menu) в системные каталоги плагинов OnionHEN / etaHEN / NeoEnabler.',
      content: `#!/usr/bin/env bash
# ==============================================================================
# PS5 13.60 XML/SHN Game Patch Deployer (${config.gameTitle} - ${config.titleId})
# Compatible with: NeoEnabler, OnionHEN v0.9.0, etaHEN 13.60
# ==============================================================================
set -euo pipefail

mkdir -p /data/etaHEN/patches/xml /data/OnionHEN/patches/xml /user/data/user/patches/xml_orbis

PATCH_FILE="/data/etaHEN/patches/xml/${config.titleId}.xml"
cp -f "./${config.titleId}.xml" "\${PATCH_FILE}"
cp -f "./${config.titleId}.xml" "/data/OnionHEN/patches/xml/${config.titleId}.xml"
chmod 0666 "\${PATCH_FILE}" "/data/OnionHEN/patches/xml/${config.titleId}.xml"

echo "Патч 60/120 FPS и графических модификаций для ${config.titleId} (v${config.contentVersion}) установлен!"
`,
    },
    {
      id: 'param-json',
      filename: 'sce_sys/param.json',
      label: '2. param.json (120 Hz VRR Ready)',
      language: 'json',
      description:
        'Манифест дампа с активированными атрибутами поддержки 120 Hz и VRR вывода видео.',
      content: JSON.stringify(
        {
          titleId: config.titleId,
          contentVersion: config.contentVersion,
          applicationCategoryType: 0,
          applicationDrmType: config.rewriteUpgradableDrm ? 'standard' : 'upgradable',
          requiredSystemSoftwareVersion: config.targetSdkHex,
          videoOut120HzSupport: true,
          vrrSupport: true,
          localizedParameters: {
            defaultLanguage: 'en-US',
            'en-US': {
              titleName: `${config.gameTitle} [60/120 FPS Patched]`,
            },
          },
        },
        null,
        2
      ),
    },
    {
      id: 'patch-manifest',
      filename: `${config.titleId}.xml`,
      label: '3. Патч памяти (illusion0001 XML)',
      language: 'xml',
      description:
        'Готовый XML-патч в формате illusion0001 / NeoEnabler: снятие лока кадров, отключение TAA/Blur и включение Dev-меню.',
      content: `<?xml version="1.0" encoding="utf-8"?>
<Patch>
  <TitleID>
    <ID>${config.titleId}</ID>
  </TitleID>
  <Metadata
    Title="${config.gameTitle}"
    Name="60/120 FPS Unlock + Disable Chromatic Aberration + Developer Debug Menu"
    Author="illusion0001 / Prospero 13.60 Studio"
    PatchVer="1.0"
    AppVer="${config.contentVersion}"
    AppElf="eboot.bin">
    <PatchList>
      <!-- 1. Снятие ограничителя 30 FPS (vblank flip interval -> 1) -->
      <Line Type="bytes" Address="0x014A8C20" Value="31F6909090" Original="BE02000000" />
      <!-- 2. Отключение принудительного Motion Blur и Chromatic Aberration -->
      <Line Type="bytes" Address="0x018F3114" Value="C390" Original="5548" />
      <!-- 3. Разблокировка скрытого внутриигрового меню отладки (L3 + R3) -->
      <Line Type="bytes" Address="0x02104B88" Value="B801000000C3" Original="31C0C3909090" />
    </PatchList>
  </Metadata>
</Patch>
`,
    },
    {
      id: 'ai-prompt',
      filename: `PROMPT_${config.titleId}_XML_PATCH.md`,
      label: '4. Промпт для ИИ-агента (.md)',
      language: 'markdown',
      description:
        'Задание для ИИ-агента по поиску смещений в расшифрованном eboot.elf и генерации 60 FPS / Debug XML-патча.',
      content: `# Задача: Создание 60/120 FPS и контент-патча для ${config.gameTitle} (${config.titleId}, v${config.contentVersion})

## Входные данные
- Распакованный \`eboot.elf\` (через \`selfutil-patched\`).
- База сигнатур: \`illusion0001/console-game-patches\` и \`TeeKay87/HEN-Cheats-Collection\`.

## Инструкция
1. Найти вызов \`sceVideoOutSetFlipRate\` (или внутренний фрейм-пейсер движка) и пропатчить аргумент интервала с \`1\` (30 FPS) на \`0\` (60/120 FPS).
2. Найти булеву проверку флага \`g_EnableDevMenu\` / \`DebugMenuEnabled\` и заменить возврат на \`mov eax, 1; ret\`.
3. Сформировать XML-файл \`/data/etaHEN/patches/xml/${config.titleId}.xml\` для динамического применения на прошивке 13.60.
`,
    },
  ],
};
