import { NativePortConfig } from '../../types/nativePorts';
import { PortStrategyHandler } from './types';

export const staticRecompStrategy: PortStrategyHandler = {
  meta: {
    id: 'static-recomp',
    title: 'Static Recompilation (ReXGlue / N64Recomp)',
    shortLabel: 'Static Recomp',
    tagline:
      'Статическая перекомпиляция бинарников старых консолей/ПК (Liberty Recompiled, N64Recomp, XenonRecomp) в нативный C/C++ + PS5_Vulkan (RADV).',
    recommendedGpu: 'ps5-vulkan-radv',
    memoryNote: 'Рекомендуется 640–768 MiB Flexible Memory под скомпилированные блоки и SPIR-V кэш.',
    keyPitfalls: [
      'Преобразовать HLSL/DXBC/F3D микрокод в SPIR-V заранее при сборке или через runtime-кэш в /data/.',
      'Не хардкодить пути хоста — загружать оригинальные образы/ресурсы пользователя из /data/<app>/roms/.',
      'Оптимизировать выравнивание 64 KiB для Direct Memory при частых сабмитах Vulkan/AGC.',
    ],
  },
  getStrategyCmakeFlags: () => [
    '-DPS5_PORT_MODE=STATIC_RECOMP',
    '-DRECOMP_PRECOMPILED_SPIRV=ON',
    '-march=znver2 -O3',
  ],
  getStrategyCppDefines: () => [
    '#define PS5_PORT_STRATEGY "STATIC_RECOMPILATION"',
    '#define PS5_CPU_TARGET "AMD_ZEN2_ZNVER2"',
  ],
  getStrategyInitBlock: (config: NativePortConfig) => `  // Стратегия: Static Recompilation (${config.sourceProject})
  // CPU PS5 — Zen 2 (x86_64): собираем перекомпилированный C-код с -march=znver2 -O3
  // Ассеты пользователя и кэш шейдеров размещаем в /data/${config.portName}/shader_cache/`,
  getStrategyWorkflowSteps: (config: NativePortConfig) => [
    `Прогнать исходный бинарник (${config.sourceProject}) через N64Recomp / ReXGlue / XenonRecomp для получения C/C++ функций.`,
    'Слинковать сгенерированный код с mihak-99/PS5_Vulkan (RADV) и -march=znver2 -O3.',
    'Настроить маппинг пользовательских ресурсов (ISO/PAK/ROM) из /data/ без включения копирайтных ассетов в eboot.',
    'Добавить кэш SPIR-V на диск для мгновенного старта без статтеров и протестировать публикацию под RecompStore.',
  ],
};
