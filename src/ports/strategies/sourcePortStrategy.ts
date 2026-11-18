import { NativePortConfig } from '../../types/nativePorts';
import { PortStrategyHandler } from './types';

export const sourcePortStrategy: PortStrategyHandler = {
  meta: {
    id: 'source-port',
    title: 'Open-Source C/C++ Source Port',
    shortLabel: 'Source Port (C/C++)',
    tagline:
      'Перенос игр и движков с открытым кодом (DevilutionX, vkQuake, Ghostship, OpenMW) через ps5-native-app-boilerplate + SDL2 / ps5-opengl / PS5_Vulkan.',
    recommendedGpu: 'ps5-vulkan-radv',
    memoryNote: 'Стандартный Direct Memory + 448–640 MiB Flexible Memory для кэша текстур/мешей.',
    keyPitfalls: [
      'Заменить все вызовы statvfs()/statfs() на проверку ENOSPC при записи.',
      'Перевести пути ассетов на /app0/assets/ (read-only), а сохранения на /data/<app>/ с fallback в /download0/.',
      'Очистить CMakeLists от X11/Wayland/PulseAudio и подключить pacbrew-repo sysroot.',
    ],
  },
  getStrategyCmakeFlags: () => [
    '-DPS5_PORT_MODE=SOURCE_PORT',
    '-DUSE_CLEAN_ROOM_LIBC_PRX=ON',
    '-DENABLE_POSIX_SHIMS=ON',
  ],
  getStrategyCppDefines: () => [
    '#define PS5_PORT_STRATEGY "OPEN_SOURCE_CPP"',
    '#define PS5_ASSERT_NO_STATVFS 1',
  ],
  getStrategyInitBlock: (config: NativePortConfig) => `  // Стратегия: Open-Source C/C++ Source Port (${config.sourceProject})
  // Перенаправляем стандартные каталоги движка на песочницу PS5:
  //   assets -> /app0/assets/ (RO)
  //   saves  -> /data/${config.portName}/ (или /download0/${config.portName}/)`,
  getStrategyWorkflowSteps: (config: NativePortConfig) => [
    `Клонировать drakmor/ps5-native-app-boilerplate и перенести исходники ${config.sourceProject} в src/upstream/.`,
    'Подключить зависимости из ps5-payload-dev/pacbrew-repo (SDL2, zlib, freetype, libpng) и выбранный графический стек.',
    'Заменить платформенную обвязку (окно, DualSense, звук, пути к сейвам) на ps5_port_bridge.cpp.',
    'Прогнать check-title-imports.py на eboot.bin и упаковать в папку или .ffpkg/.ffpfsc для ShadowMountPlus.',
  ],
};
