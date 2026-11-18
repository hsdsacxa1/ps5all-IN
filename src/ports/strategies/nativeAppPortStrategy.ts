import { NativePortConfig } from '../../types/nativePorts';
import { PortStrategyHandler } from './types';

export const nativeAppPortStrategy: PortStrategyHandler = {
  meta: {
    id: 'media-native',
    title: 'Native Media / Stream / System App',
    shortLabel: 'Media / App Port',
    tagline:
      'Портирование десктопных и стриминговых приложений (ProsperoSunshine, Stremio Plus, ProsperoTV, Orbit Store) с ImGui/SDL2, Avcap2 и mbedTLS.',
    recommendedGpu: 'sdl2-videoout',
    memoryNote: 'Стандартные 448 MiB Flexible Memory оставляют максимум Direct Memory для видеокодеков.',
    keyPitfalls: [
      'При повышенных привилегиях (ucred elevated) системный TLS недоступен — статически линковать mbedTLS 3.6.7 + libcurl.',
      'Проверять сертификаты по /system/common/cert/CA_LIST.',
      'Веб-серверы и сокеты обязаны переоткрываться после выхода из Rest Mode (S3 Resume).',
    ],
  },
  getStrategyCmakeFlags: () => [
    '-DPS5_PORT_MODE=NATIVE_MEDIA_APP',
    '-DUSE_STATIC_MBEDTLS=ON',
    '-DENABLE_S3_RESUME_WATCHDOG=ON',
  ],
  getStrategyCppDefines: () => [
    '#define PS5_PORT_STRATEGY "NATIVE_MEDIA_PORT"',
    '#define PS5_CA_LIST_PATH "/system/common/cert/CA_LIST"',
  ],
  getStrategyInitBlock: (config: NativePortConfig) => `  // Стратегия: Native Media / Utility Port (${config.sourceProject})
  // TLS строго через статический mbedTLS + libcurl с /system/common/cert/CA_LIST
  // Поддержка переподключения сокетов после Rest Mode (S3 Resume)`,
  getStrategyWorkflowSteps: (config: NativePortConfig) => [
    `Встроить UI-оболочку (${config.sourceProject}) в каркас ps5-native-app-boilerplate с SDL2 + ImGui.`,
    'Линковать mbedTLS 3.6.7 + libcurl статически и указать CURLOPT_CAINFO = /system/common/cert/CA_LIST.',
    'Реализовать хранение кеша/конфига в /data/<app>/ с автоматическим fallback в /download0/<app>/.',
    'Добавить watchdog на Rest Mode (S3 Resume) и явный return false в нереализованных системных диалогах.',
  ],
};
