import {
  NativePortCatalogEntry,
  PortApiMappingRow,
  PortCatalogCategory,
  PortGpuBackendId,
  PortGpuBackendMeta,
} from '../types/nativePorts';

export const PORT_CATALOG_CATEGORIES: { id: PortCatalogCategory; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'graphics-sdk', label: 'Графика и SDK' },
  { id: 'game-ports', label: 'Порты игр' },
  { id: 'recomp-proton', label: 'Recomp и Proton' },
  { id: 'stores-tooling', label: 'Магазины и сборки' },
];

export const PORT_GPU_BACKEND_META: Record<PortGpuBackendId, PortGpuBackendMeta> = {
  'ps5-vulkan-radv': {
    id: 'ps5-vulkan-radv',
    label: 'PS5_Vulkan (Mesa RADV 1.4+)',
    repo: 'mihawk-99/PS5_Vulkan + PS5_Mesa',
    apiLevel: 'Vulkan 1.4 / SPIR-V -> gfx1013',
    bestFor: '3D-игры, Recomp-порты, vkQuake, RetroArch, paraLLEl-RDP, DXVK',
    cmakeLinkLibs: 'vulkan SceAgcDriver SceVideoOut',
    initSnippet: `// PS5_Vulkan (RADV winsys -> sceAgcDriverSubmitDcb + libSceVideoOut)
VkApplicationInfo appInfo{VK_STRUCTURE_TYPE_APPLICATION_INFO};
appInfo.pApplicationName = "ps5_native_port";
appInfo.apiVersion = VK_API_VERSION_1_3;`,
  },
  'ps5-opengl-46': {
    id: 'ps5-opengl-46',
    label: 'ps5-opengl (Mesa Gallium GL 4.6)',
    repo: 'darkxex/ps5-opengl + SDL 2.30.12',
    apiLevel: 'OpenGL 4.6 Core / GLSL 4.60 / EGL',
    bestFor: 'Классические C/C++ порты на OpenGL / SDL_GL_CreateContext',
    cmakeLinkLibs: 'GL EGL SDL2 SceVideoOut',
    initSnippet: `// ps5-opengl + patched SDL 2.30.12 (static dynapi)
SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);
SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 4);
SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 6);`,
  },
  'sdl2-videoout': {
    id: 'sdl2-videoout',
    label: 'SDL2 + libSceVideoOut (PacBrew)',
    repo: 'ps5-payload-dev/SDL + pacbrew-repo',
    apiLevel: 'SDL2 Software / 2D Renderer / ImGui',
    bestFor: '2D-игры, UI-оболочки, DevilutionX, PICO-8, быстрые MVP',
    cmakeLinkLibs: 'SDL2 SceVideoOut ScePad SceAudioOut',
    initSnippet: `// ps5-payload-dev/SDL2 over libSceVideoOut
SDL_Init(SDL_INIT_VIDEO | SDL_INIT_AUDIO | SDL_INIT_GAMECONTROLLER);
SDL_Window* win = SDL_CreateWindow("PS5Port", 0, 0, 1920, 1080, SDL_WINDOW_FULLSCREEN);`,
  },
  'agc-direct': {
    id: 'agc-direct',
    label: 'Direct AGC (gfx1013 Low-Level)',
    repo: 'mpereiraesaa/ps5-agc-gears',
    apiLevel: 'Raw AGC / DCB / RDNA2 ISA Shaders',
    bestFor: 'Ультра-лёгкие рендеры, кастомные шейдерные пайплайны без Mesa',
    cmakeLinkLibs: 'SceAgcDriver SceVideoOut kernel',
    initSnippet: `// Direct RDNA2 (gfx1013) Command Buffer via libSceAgcDriver
// Требует Direct Memory выравнивания под 64 KiB для DCB/shaders`,
  },
  'proton-dxvk': {
    id: 'proton-dxvk',
    label: 'Wine / Proton + DXVK -> RADV',
    repo: 'mihawk-99/PS5_MihawkOS (ps5proton)',
    apiLevel: 'DirectX 9/10/11 -> DXVK -> PS5_Vulkan',
    bestFor: 'Запуск готовых x86/x64 Windows-игр без исходного кода',
    cmakeLinkLibs: 'wine_ps5 dxvk_d3d11 vulkan',
    initSnippet: `// Запуск через слой MihawkOS / ps5proton без Linux
// Локальный префикс на консоли: /data/ps5proton/`,
  },
};

export const NATIVE_PORT_CATALOG: NativePortCatalogEntry[] = [
  {
    id: 'ps5-vulkan',
    name: 'PS5_Vulkan & PS5_Mesa (RADV 1.4+)',
    repo: 'mihawk-99/PS5_Vulkan',
    category: 'graphics-sdk',
    stackLabel: 'Vulkan 1.4 / RADV / AGC',
    status2026: 'Активно (2026)',
    summary:
      'Полноценный аппаратный Vulkan-драйвер для GPU PS5 (gfx1013). Кастомный winsys маппит Direct Memory, сбрасывает кэши и отправляет команды через sceAgcDriverSubmitDcb + libSceVideoOut.',
    keyTech: ['RADV gfx1013', 'Khronos CTS', 'sceAgcDriverSubmitDcb'],
    preset: {
      strategy: 'source-port',
      gpuBackend: 'ps5-vulkan-radv',
      sourceProject: 'vkQuake / Khronos Vulkan App',
      portName: 'ps5_vulkan_port',
    },
  },
  {
    id: 'ps5-vulkan-template',
    name: 'PS5_VulkanTemplate',
    repo: 'mihawk-99/PS5_VulkanTemplate',
    category: 'graphics-sdk',
    stackLabel: 'Vulkan + Title Generator',
    status2026: 'Активно (2026)',
    summary:
      'Готовый шаблон старта нативного Vulkan-порта: генератор Title ID, загрузка glTF-моделей, PBR, shadow mapping и deferred shading на реальном железе PS5.',
    keyTech: ['glTF / PBR', 'Title Generator', 'Swapchain VideoOut'],
    preset: {
      strategy: 'source-port',
      gpuBackend: 'ps5-vulkan-radv',
      sourceProject: 'Vulkan 3D Engine',
      portName: 'vulkan_template_port',
    },
  },
  {
    id: 'ps5-opengl',
    name: 'ps5-opengl (OpenGL 4.6 Core + SDL 2.30.12)',
    repo: 'darkxex/ps5-opengl',
    category: 'graphics-sdk',
    stackLabel: 'OpenGL 4.6 / EGL / SDL2',
    status2026: 'Активно (2026)',
    summary:
      'Порт Mesa/Gallium с OpenGL 4.6 Core, GLSL 4.60, EGL и пропатченным SDL 2.30.12 (static dynapi). Позволяет переносить классические OpenGL-движки почти без переписывания рендера.',
    keyTech: ['OpenGL 4.6 Core', 'EGL', 'SDL 2.30.12 dynapi'],
    preset: {
      strategy: 'source-port',
      gpuBackend: 'ps5-opengl-46',
      sourceProject: 'OpenGL 4.x Game / Engine',
      portName: 'ps5_gl46_port',
    },
  },
  {
    id: 'ps5-native-boilerplate',
    name: 'ps5-native-app-boilerplate & ps5-homebrew-starter',
    repo: 'drakmor/ps5-native-app-boilerplate · MiladRTX/ps5-homebrew-starter',
    category: 'stores-tooling',
    stackLabel: 'C++20 / libc.prx / PC Simulator',
    status2026: 'Базовый стандарт 13.60',
    summary:
      'Канонический каркас eboot.bin с clean-room libc.prx, воспроизводимой сборкой под ShadowMountPlus (.ffpkg/.ffpfsc) и 12-главным стартером с PC-симулятором DualSense.',
    keyTech: ['C++20', 'libc.prx', 'PC DualSense Sim', 'GPL-3.0'],
  },
  {
    id: 'pacbrew-repo',
    name: 'ps5-payload-dev/pacbrew-repo & SDL2',
    repo: 'ps5-payload-dev/pacbrew-repo',
    category: 'stores-tooling',
    stackLabel: 'Pacman Sysroot / SDK v0.45',
    status2026: 'SDK v0.45 (2026)',
    summary:
      'Пакетный менеджер готовых статических библиотек для PS5: SDL2, FFmpeg, mbedTLS, libcurl, zlib, FreeType, libpng, libvorbis — убирает необходимость собирать зависимости вручную.',
    keyTech: ['SDL2', 'mbedTLS 3.6.7', 'libcurl', 'FFmpeg'],
  },
  {
    id: 'liberty-recompiled',
    name: 'Liberty Recompiled (GTA IV PS5)',
    repo: 'OZORDI / gta4-ps5 (ReXGlue SDK)',
    category: 'recomp-proton',
    stackLabel: 'Static Recomp / Vulkan 4K120',
    status2026: 'Релиз 2026',
    summary:
      'Статическая перекомпиляция GTA IV + DLC в нативный код PS5 через ReXGlue SDK. Поддержка 4K/120Hz, адаптивных курков DualSense, нативных трофеев и прямой работы с GPU через Vulkan.',
    keyTech: ['Static Recomp', 'ReXGlue SDK', 'DualSense Haptics'],
    preset: {
      strategy: 'static-recomp',
      gpuBackend: 'ps5-vulkan-radv',
      sourceProject: 'ReXGlue / N64Recomp Output',
      portName: 'recomp_ps5_title',
    },
  },
  {
    id: 'ps5-ghostship',
    name: 'PS5_Ghostship (Super Mario 64 PC Port)',
    repo: 'griches/PS5_Ghostship · sm64-ps5',
    category: 'game-ports',
    stackLabel: 'libultraship / Vulkan 4K60',
    status2026: 'Активно (2026)',
    summary:
      'Нативный порт декомпиляции SM64 на базе libultraship с Vulkan/AGC рендером, работающий в 4K/60 FPS при предоставлении пользовательского ROM-образа в /data/.',
    keyTech: ['libultraship', '4K 60fps', 'External Assets'],
    preset: {
      strategy: 'source-port',
      gpuBackend: 'ps5-vulkan-radv',
      sourceProject: 'HarbourMasters / libultraship',
      portName: 'ghostship_ps5',
    },
  },
  {
    id: 'ps5-vkquake',
    name: 'PS5_vkQuake & DevilutionX-PS5',
    repo: 'PS5_vkQuake · diasurgical/DevilutionX',
    category: 'game-ports',
    stackLabel: 'Vulkan RADV / SDL2',
    status2026: 'Проверено на 13.60',
    summary:
      'Эталонные open-source порты классических C/C++ игр: vkQuake демонстрирует high-FPS Vulkan/RADV, а DevilutionX (Diablo + Hellfire) даёт полный маппинг DualSense и чтение DIABDAT.MPQ.',
    keyTech: ['High-FPS Vulkan', 'libScePad', 'MPQ / PAK Assets'],
    preset: {
      strategy: 'source-port',
      gpuBackend: 'sdl2-videoout',
      sourceProject: 'DevilutionX (C++17 / SDL2)',
      portName: 'devilutionx_ps5',
    },
  },
  {
    id: 'ps5-retroarch-mupen',
    name: 'PS5_RetroArch & Mupen64Plus-PS5',
    repo: 'mihawk-99/PS5_RetroArch · TheRealRetro/mupen64plus-ps5',
    category: 'game-ports',
    stackLabel: 'x86-64 Dynarec / paraLLEl-RDP',
    status2026: 'Активно (2026)',
    summary:
      'Нативные эмуляторы с x86-64 JIT/dynarec, Vulkan-рендерингом (paraLLEl-RDP), потоковым чтением ROM по SMB из локальной сети и поддержкой вибрации DualSense.',
    keyTech: ['x86-64 Dynarec', 'paraLLEl-RDP', 'SMB Streaming'],
    preset: {
      strategy: 'emulator-dynarec',
      gpuBackend: 'ps5-vulkan-radv',
      sourceProject: 'Libretro Core / Mupen64Plus',
      portName: 'dynarec_emu_ps5',
      enableJitDynarec: true,
    },
  },
  {
    id: 'ps5-mihawkos-proton',
    name: 'MihawkOS & ps5proton',
    repo: 'mihawk-99/PS5_MihawkOS',
    category: 'recomp-proton',
    stackLabel: 'Wine + Proton + DXVK (без Linux)',
    status2026: 'Активно (2026)',
    summary:
      'Слой совместимости Wine + Proton + DXVK поверх PS5_Vulkan, запускающий 32/64-битные Windows-игры и Steam Big Picture прямо из Orbis/Prospero OS (папка /data/ps5proton).',
    keyTech: ['Wine/Proton', 'DXVK -> RADV', '/data/ps5proton'],
    preset: {
      strategy: 'proton-wrapper',
      gpuBackend: 'proton-dxvk',
      sourceProject: 'Windows x64 Game (.exe + DX11)',
      portName: 'ps5_proton_wrap',
    },
  },
  {
    id: 'recomp-prospero-store',
    name: 'RecompStore & ProsperoStore',
    repo: 'elripalda/RecompStore · darkxex/ProsperoStore',
    category: 'stores-tooling',
    stackLabel: 'Native Catalogs (PPSA99000+)',
    status2026: 'Активно (2026)',
    summary:
      'Нативные магазины/обновляторы прямо на PS5 для распространения статических рекомпиляций, эмуляторов и портов в виде стандартизированных папок или .ffpkg пакетов.',
    keyTech: ['Auto-Update', 'Recomp Distribution', 'Title Manifest'],
  },
  {
    id: 'prospero-sunshine',
    name: 'ProsperoSunshine (PPSA47989)',
    repo: 'Darkatek7/ProsperoSunshine',
    category: 'game-ports',
    stackLabel: 'Avcap2 H.264/HEVC / Virtual DualSense',
    status2026: 'Установлено на вашей PS5',
    summary:
      'Нативный порт Sunshine-хоста для Moonlight: использует аппаратный видеокодер Avcap2 (H.264/HEVC/HDR), системный захват аудио и эмуляцию виртуального DualSense.',
    keyTech: ['Avcap2 Encoder', 'Opus/PCM', 'Virtual DualSense'],
    preset: {
      strategy: 'media-native',
      gpuBackend: 'sdl2-videoout',
      sourceProject: 'Media / Streaming Daemon App',
      portName: 'prospero_stream_port',
    },
  },
];

export const PORT_API_MAPPING_ROWS: PortApiMappingRow[] = [
  {
    id: 'map-gfx',
    subsystem: 'Графика / Шейдеры',
    upstreamApi: 'Vulkan / OpenGL 4.6 / DirectX 11',
    ps5NativeApi: 'PS5_Vulkan (RADV) / ps5-opengl / DXVK',
    pitfallNote: 'GPU gfx1013 требует 64 KiB выравнивания Direct Memory и сброса кэшей через winsys.',
  },
  {
    id: 'map-window',
    subsystem: 'Окно и презентация',
    upstreamApi: 'GLFW / X11 / Win32 HWND',
    ps5NativeApi: 'libSceVideoOut + SDL2 (ps5-payload-dev/SDL)',
    pitfallNote: 'Только полноэкранный swapchain (1080p / 4K); оконные resize-события не поддерживаются.',
  },
  {
    id: 'map-input',
    subsystem: 'Геймпад и DualSense',
    upstreamApi: 'XInput / SDL_GameController / evdev',
    ps5NativeApi: 'libScePad (или SDL2 поверх ScePad)',
    pitfallNote: 'Для адаптивных триггеров и HD-вибрации нужны вызовы scePadSetTriggerEffect / libScePad.',
  },
  {
    id: 'map-audio',
    subsystem: 'Вывод звука',
    upstreamApi: 'ALSA / WASAPI / PulseAudio / OpenAL',
    ps5NativeApi: 'libSceAudioOut (48 kHz PCM) / SDL_Audio',
    pitfallNote: 'Аудиобуферы должны кратно совпадать с гранулярностью кадра (256/512/1024 семпла).',
  },
  {
    id: 'map-fs',
    subsystem: 'Файловая система и сохранения',
    upstreamApi: './assets, ~/.local/share, statvfs()',
    ps5NativeApi: '/app0/assets/ (RO) + /data/<app>/ + /download0/',
    pitfallNote: 'ЗАПРЕЩЕНО statvfs()/statfs() в eboot.bin (null import crash). Обязателен fallback в /download0/.',
  },
  {
    id: 'map-net',
    subsystem: 'Сеть, HTTPS и Rest Mode',
    upstreamApi: 'OpenSSL / System TLS / BSD Sockets',
    ps5NativeApi: 'mbedTLS 3.6.7 + libcurl + /system/common/cert/CA_LIST',
    pitfallNote: 'Системный TLS падает при elevated ucred. После S3 Resume сокеты нужно переоткрывать.',
  },
];
