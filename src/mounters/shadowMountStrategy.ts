import {
  MountableTitleEntry,
  MounterActionId,
  MounterContainerFormat,
  MounterSimulationPayload,
  MounterStrategy,
} from '../types/mounter';

const INITIAL_SHADOWMOUNT_ENTRIES: MountableTitleEntry[] = [
  {
    titleId: 'PPSA99808',
    titleName: 'NASBridge PS5 (Hybrid)',
    contentVersion: '01.04',
    containerType: 'folder',
    path: '/data/homebrew/PPSA99808',
    mounted: true,
    backendInfo: 'SceShellCore / TitleDir -> /app0',
  },
  {
    titleId: 'FAKE00001',
    titleName: 'PSP5 Vulkan Emulator (RADV)',
    contentVersion: '01.02',
    containerType: 'ffpfsc',
    path: '/data/homebrew/FAKE00001.ffpfsc',
    mounted: true,
    backendInfo: 'Compressed PFS (mkpfs) -> /app0',
  },
  {
    titleId: 'PPSA99210',
    titleName: 'ProsperoTV Media Player',
    contentVersion: '01.01',
    containerType: 'ffpkg',
    path: '/data/homebrew/PPSA99210.ffpkg',
    mounted: false,
    backendInfo: 'UFS2 Image Container -> /app0',
  },
];

type ShadowActionHandler = (
  entries: MountableTitleEntry[],
  selectedTitleId: string,
  ps5Ip: string
) => {
  updatedEntries: MountableTitleEntry[];
  payload: MounterSimulationPayload;
};

const SHADOW_ACTION_HANDLERS: Record<MounterActionId, ShadowActionHandler> = {
  discover: (entries, _selectedTitleId, ps5Ip) => ({
    updatedEntries: entries,
    payload: {
      status: 'ok',
      daemon: 'ShadowMountPlus v1.7beta11',
      endpoint: `GET http://${ps5Ip}:10101/api/v1/games`,
      bridge: 'SceShellCore / TitleDir (FW 12.00–13.60)',
      storagePaths: ['/data/homebrew/', '/mnt/usb0/homebrew/', '/mnt/ext0/homebrew/'],
      games: entries,
    },
  }),
  mount: (entries, selectedTitleId, ps5Ip) => {
    const updatedEntries = entries.map((item) =>
      item.titleId === selectedTitleId ? { ...item, mounted: true } : item
    );
    const target = updatedEntries.find((i) => i.titleId === selectedTitleId);
    return {
      updatedEntries,
      payload: {
        status: 'mounted',
        daemon: 'ShadowMountPlus v1.7beta11',
        endpoint: `POST http://${ps5Ip}:10101/api/v1/games/mount`,
        bridge: 'SceShellCore TitleDir Mounted (/app0 bound)',
        storagePaths: ['/data/homebrew/'],
        target,
        games: updatedEntries,
      },
    };
  },
  rebuild: (entries, _selectedTitleId, ps5Ip) => ({
    updatedEntries: entries,
    payload: {
      status: 'scanned',
      daemon: 'ShadowMountPlus v1.7beta11',
      endpoint: `POST http://${ps5Ip}:10101/api/v1/scan`,
      bridge: 'SceShellCore / TitleDir Rescan',
      storagePaths: ['/data/homebrew/', '/mnt/usb0/homebrew/'],
      games: entries,
    },
  }),
  config: (entries, _selectedTitleId, ps5Ip) => ({
    updatedEntries: entries,
    payload: {
      status: 'ok',
      daemon: 'ShadowMountPlus v1.7beta11',
      endpoint: `GET http://${ps5Ip}:10101/api/v1/status`,
      bridge: 'SceShellCore / TitleDir',
      storagePaths: ['/data/homebrew/'],
      configPreview: `# ShadowMountPlus v1.7 Runtime Config\nlisten_addr = "0.0.0.0:10101"\nscan_paths = ["/data/homebrew", "/mnt/usb0/homebrew"]\ncontainers = ["folder", "ffpkg", "ffpfsc"]`,
      logTail: [
        '[ShadowMountPlus] SceShellCore bridge initialized on FW 13.60',
        '[ShadowMountPlus] Listening on 127.0.0.1:10101/api/v1',
      ],
      games: entries,
    },
  }),
};

const EXTENSION_BY_FORMAT: Record<MounterContainerFormat, string> = {
  folder: '',
  ffpkg: '.ffpkg',
  ffpfsc: '.ffpfsc',
  pkg: '.pkg',
  zstd: '.zst',
  lz4: '.lz4',
};

export const shadowMountStrategy: MounterStrategy = {
  spec: {
    id: 'shadowmount-1.7',
    name: 'ShadowMountPlus',
    version: 'v1.7 (1.7beta6-fix2+ / beta 11)',
    repository: 'drakmor/ShadowMountPlus',
    releaseUrl: 'https://github.com/drakmor/ShadowMountPlus/releases',
    defaultPort: 10101,
    baseUrlTemplate: 'http://127.0.0.1:10101/api/v1',
    backendBridge: 'SceShellCore / TitleDir Bridge',
    dataDirectory: '/data/homebrew/',
    configPath: '/data/ShadowMountPlus/config.ini',
    logPath: '/data/ShadowMountPlus/shadowmount.log',
    deployCommand: 'nc -w 10 $PS5_HOST 9021 < ShadowMountPlus.elf',
    supportedFormats: ['folder', 'ffpkg', 'ffpfsc'],
    formatDescriptions: {
      folder: 'Распакованная директория /data/homebrew/<TITLE_ID>/eboot.bin',
      ffpkg: 'Образ файловой системы UFS2 (.ffpkg)',
      ffpfsc: 'Сжатый контейнер PFS (.ffpfsc через pip install mkpfs)',
    },
    actions: [
      {
        id: 'discover',
        method: 'GET',
        endpoint: '/api/v1/games',
        label: 'GET /api/v1/games',
        description: 'Список обнаруженных нативных приложений в /data/homebrew/',
      },
      {
        id: 'rebuild',
        method: 'POST',
        endpoint: '/api/v1/scan',
        label: 'POST /api/v1/scan',
        description: 'Пересканировать /data/homebrew/ и внешние USB-носители',
      },
      {
        id: 'mount',
        method: 'POST',
        endpoint: '/api/v1/games/mount',
        label: 'POST /api/v1/games/mount',
        description: 'Смонтировать выбранный Title ID на главный экран PS5',
      },
      {
        id: 'config',
        method: 'GET',
        endpoint: '/api/v1/status',
        label: 'Конфиг и логи',
        description: 'Просмотр конфигурации и состояния моста SceShellCore',
      },
    ],
    initialEntries: INITIAL_SHADOWMOUNT_ENTRIES,
  },

  executeAction(actionId, entries, selectedTitleId, ps5Ip) {
    const handler = SHADOW_ACTION_HANDLERS[actionId];
    return handler(entries, selectedTitleId, ps5Ip);
  },

  createEntry(titleId, titleName, format) {
    const ext = EXTENSION_BY_FORMAT[format];
    return {
      titleId,
      titleName,
      contentVersion: '01.00',
      containerType: format,
      path: `/data/homebrew/${titleId}${ext}`,
      mounted: false,
      backendInfo: `ShadowMountPlus (${format}) -> /app0`,
    };
  },
};
