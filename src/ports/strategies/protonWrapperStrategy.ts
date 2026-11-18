import { NativePortConfig } from '../../types/nativePorts';
import { PortStrategyHandler } from './types';

export const protonWrapperStrategy: PortStrategyHandler = {
  meta: {
    id: 'proton-wrapper',
    title: 'Wine / Proton + DXVK Wrapper (ps5proton)',
    shortLabel: 'Proton / DXVK',
    tagline:
      'Запуск готовых Windows x86/x64 игр (DX9/DX10/DX11) без исходного кода поверх стека MihawkOS / ps5proton + DXVK -> PS5_Vulkan.',
    recommendedGpu: 'proton-dxvk',
    memoryNote: 'Windows-бинарники и DXVK требуют минимум 768–1024 MiB Flexible Memory (уменьшает Direct Memory).',
    keyPitfalls: [
      'Не все Win32 NT-сисколлы эмулируются без патчей Wine; критична совместимость WoW64 для 32-bit .exe.',
      'Префикс и кэш DXVK хранить в /data/ps5proton/<title>/, не внутри read-only /app0/.',
      'Для сетевых функций внутри Wine-контейнера пробрасывать сокеты без системного WinHTTP TLS.',
    ],
  },
  getStrategyCmakeFlags: () => [
    '-DPS5_PORT_MODE=PROTON_DXVK_WRAPPER',
    '-DUSE_PS5_PROTON_PREFIX=ON',
    '-DDXVK_ASYNC_SHADER_COMPILE=ON',
  ],
  getStrategyCppDefines: () => [
    '#define PS5_PORT_STRATEGY "WINE_PROTON_DXVK"',
    '#define PS5_PROTON_PREFIX_DIR "/data/ps5proton"',
  ],
  getStrategyInitBlock: (config: NativePortConfig) => `  // Стратегия: Wine / Proton + DXVK (${config.sourceProject})
  // Лаунчер-обёртка передаёт конфигурацию префикса в /data/ps5proton/${config.portName}/
  setenv("WINEPREFIX", "/data/ps5proton/${config.portName}", 1);
  setenv("DXVK_STATE_CACHE_PATH", "/data/ps5proton/${config.portName}/dxvk_cache", 1);`,
  getStrategyWorkflowSteps: (config: NativePortConfig) => [
    `Подготовить чистый Windows x64/x86 каталог игры (${config.sourceProject}) без DRM/античитов.`,
    'Разместить файлы в /data/ps5proton/<game>/ и сгенерировать нативный лаунчер eboot.bin с PPSA Title ID.',
    'Настроить DXVK state cache + VKD3D/RADV переменные окружения и маппинг XInput -> libScePad.',
    'Выделить 768–1024 MiB Flexible Memory в param.json и протестировать запуск через ShadowMountPlus.',
  ],
};
