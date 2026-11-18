import { NativePortConfig } from '../../types/nativePorts';
import { PortStrategyHandler } from './types';

export const emulatorDynarecStrategy: PortStrategyHandler = {
  meta: {
    id: 'emulator-dynarec',
    title: 'Emulator Core & x86-64 Dynarec',
    shortLabel: 'Emulator / JIT',
    tagline:
      'Нативные эмуляторы и ядра (PS5_RetroArch, Mupen64Plus-PS5, PPSSPP, Flycast) с аппаратным RADV/Vulkan и JIT-перекомпиляцией.',
    recommendedGpu: 'ps5-vulkan-radv',
    memoryNote: 'Для тяжёлых ядер (GC/Wii/PS2) заложить 768 MiB Flexible Memory + контроль Direct Memory.',
    keyPitfalls: [
      'Обычный Title-процесс запрещает RWX-страницы: для JIT/dynarec требуется поддержка kstuff-lite / HEN или interpreter fallback.',
      'Стриминг тяжёлых ISO/ROM лучше делать по SMB/HTTP, чтобы не переполнять внутренний /user.',
      'Учитывать Rest Mode (S3 Resume) для сброса сетевых сокетов SMB и переинициализации аудиопотока.',
    ],
  },
  getStrategyCmakeFlags: () => [
    '-DPS5_PORT_MODE=EMULATOR_DYNAREC',
    '-DHAVE_PARALLEL_RDP=ON',
    '-DENABLE_SMB_NETPLAY=ON',
  ],
  getStrategyCppDefines: () => [
    '#define PS5_PORT_STRATEGY "EMULATOR_DYNAREC"',
    '#define PS5_JIT_SAFE_FALLBACK 1',
  ],
  getStrategyInitBlock: (config: NativePortConfig) => `  // Стратегия: Emulator / Dynarec (${config.sourceProject})
  // Проверяем возможность выделения JIT-буфера (при блокировке — автоматический Cached Interpreter fallback)
  const bool jitAllowed = probe_jit_executable_pages();
  printf("[PS5Port] Dynarec JIT status: %s\\n", jitAllowed ? "ENABLED" : "INTERPRETER_FALLBACK");`,
  getStrategyWorkflowSteps: (config: NativePortConfig) => [
    `Адаптировать CMake/Makefile ядра (${config.sourceProject}) под таргет x86_64-scei-ps5.`,
    'Добавить проверку JIT-страниц (mmap + mprotect PROT_EXEC) с безопасным переключением на Cached Interpreter.',
    'Подключить PS5_Vulkan для paraLLEl-RDP / Vulkan-бэкенда ядра и libScePad с вибрацией DualSense.',
    'Проверить чтение ROM/BIOS из /data/ и опционально по SMB без использования statvfs().',
  ],
};
