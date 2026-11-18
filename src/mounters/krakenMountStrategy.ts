import {
  MountableTitleEntry,
  MounterActionId,
  MounterContainerFormat,
  MounterSimulationPayload,
  MounterStrategy,
} from '../types/mounter';

const INITIAL_KRAKEN_ENTRIES: MountableTitleEntry[] = [
  {
    titleId: 'PPSA04192',
    titleName: 'Bloodborne Prospero Test Dump (LZ4 Pack)',
    contentVersion: '01.09',
    containerType: 'lz4',
    path: '/mnt/ext0/games/PPSA04192.lz4',
    mounted: true,
    backendInfo: 'ampr-emu-ng v0.4.0 (LZ4 Direct Stream)',
  },
  {
    titleId: 'PPSA10407',
    titleName: 'Astro Sandbox Benchmark (ZSTD Pack)',
    contentVersion: '01.02',
    containerType: 'zstd',
    path: '/data/games/PPSA10407.zst',
    mounted: true,
    backendInfo: 'ampr-emu-ng v0.4.0 (ZSTD Decompress Hook)',
  },
  {
    titleId: 'PPSA99808',
    titleName: 'NASBridge PS5 Debug FPKG',
    contentVersion: '01.04',
    containerType: 'pkg',
    path: '/mnt/usb0/pkgs/PPSA99808-debug.pkg',
    mounted: false,
    backendInfo: 'ampr-emu-ng v0.4.0 (Direct Debug FPKG Mount)',
  },
  {
    titleId: 'FAKE00009',
    titleName: 'Kraken Homebrew Unpacked Folder',
    contentVersion: '01.00',
    containerType: 'folder',
    path: '/data/homebrew/FAKE00009',
    mounted: false,
    backendInfo: 'ampr-emu-ng v0.4.0 (Plain Folder Dump)',
  },
];

type KrakenActionHandler = (
  entries: MountableTitleEntry[],
  selectedTitleId: string,
  ps5Ip: string
) => {
  updatedEntries: MountableTitleEntry[];
  payload: MounterSimulationPayload;
};

const KRAKEN_ACTION_HANDLERS: Record<MounterActionId, KrakenActionHandler> = {
  discover: (entries, _selectedTitleId, ps5Ip) => ({
    updatedEntries: entries,
    payload: {
      status: 'ok',
      daemon: 'quer3q/kraken-mount v0.0.1-beta',
      endpoint: `GET http://${ps5Ip}:8097/api/games`,
      bridge: 'ampr-emu-ng v0.4.0 (/data/krakenmount/ampr/)',
      storagePaths: ['/data/games/', '/data/homebrew/', '/mnt/ext0/games/', '/mnt/usb0/pkgs/'],
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
        status: 'mounted_via_ampr',
        daemon: 'quer3q/kraken-mount v0.0.1-beta',
        endpoint: `POST http://${ps5Ip}:8097/api/mount`,
        bridge: 'ampr-emu-ng v0.4.0 + SceShellCore Home Tile Registered',
        storagePaths: ['/data/krakenmount/ampr/'],
        target,
        games: updatedEntries,
      },
    };
  },
  rebuild: (entries, _selectedTitleId, ps5Ip) => {
    const remounted = entries.map((item) => ({ ...item, mounted: true }));
    return {
      updatedEntries: remounted,
      payload: {
        status: 'cache_rebuilt',
        daemon: 'quer3q/kraken-mount v0.0.1-beta',
        endpoint: `POST http://${ps5Ip}:8097/api/rebuild`,
        bridge: 'ampr-emu-ng v0.4.0 Cache & Home Screen Tiles Rebuilt',
        storagePaths: ['/data/krakenmount/cache.db', '/data/krakenmount/ampr/'],
        logTail: [
          '[kraken-mount] Cleared stale title cache in /data/krakenmount/',
          '[kraken-mount] Bundled ampr-emu-ng v0.4.0 verified in /data/krakenmount/ampr/',
          `[kraken-mount] Registered ${remounted.length} individual Home Screen tiles`,
        ],
        games: remounted,
      },
    };
  },
  config: (entries, _selectedTitleId, ps5Ip) => ({
    updatedEntries: entries,
    payload: {
      status: 'ok',
      daemon: 'quer3q/kraken-mount v0.0.1-beta',
      endpoint: `GET http://${ps5Ip}:8097/api/config`,
      bridge: 'ampr-emu-ng v0.4.0 + WebUI :8097',
      storagePaths: ['/data/krakenmount/config.toml', '/data/krakenmount/kraken.log'],
      configPreview: `# /data/krakenmount/config.toml (Kraken Mount v0.0.1-beta)
[server]
port = 8097
bind_address = "0.0.0.0"

[backend]
emulator = "ampr-emu-ng"
version = "0.4.0"
ampr_dir = "/data/krakenmount/ampr"

[scanner]
scan_internal = ["/data/games", "/data/homebrew"]
scan_m2_ssd = ["/mnt/ext0/games"]
scan_usb = ["/mnt/usb0/pkgs", "/mnt/usb0/games"]
formats = ["pkg", "folder", "lz4", "zstd"]
auto_register_home_tiles = true`,
      logTail: [
        '[kraken-mount v0.0.1-beta] Loaded /data/krakenmount/config.toml',
        '[kraken-mount v0.0.1-beta] Installed ampr-emu-ng v0.4.0 -> /data/krakenmount/ampr/',
        `[kraken-mount v0.0.1-beta] Web Dashboard listening on http://${ps5Ip}:8097/`,
        '[kraken-mount v0.0.1-beta] Kraken Mount tile registered on PS5 Home Screen',
      ],
      games: entries,
    },
  }),
};

const KRAKEN_PATH_BY_FORMAT: Record<MounterContainerFormat, (id: string) => string> = {
  pkg: (id) => `/mnt/usb0/pkgs/${id}-debug.pkg`,
  zstd: (id) => `/data/games/${id}.zst`,
  lz4: (id) => `/mnt/ext0/games/${id}.lz4`,
  folder: (id) => `/data/homebrew/${id}`,
  ffpkg: (id) => `/data/homebrew/${id}.ffpkg`,
  ffpfsc: (id) => `/data/homebrew/${id}.ffpfsc`,
};

export const krakenMountStrategy: MounterStrategy = {
  spec: {
    id: 'kraken-mount-0.0.1-beta',
    name: 'Kraken Mount',
    version: 'v0.0.1-beta (ampr-emu-ng v0.4.0)',
    repository: 'quer3q/kraken-mount',
    releaseUrl: 'https://github.com/quer3q/kraken-mount/releases/tag/v0.0.1-beta',
    defaultPort: 8097,
    baseUrlTemplate: 'http://<ps5-ip>:8097/',
    backendBridge: 'ampr-emu-ng v0.4.0 (/data/krakenmount/ampr/)',
    dataDirectory: '/data/krakenmount/',
    configPath: '/data/krakenmount/config.toml',
    logPath: '/data/krakenmount/kraken.log',
    deployCommand: 'nc -w 3 $PS5_HOST 9021 < kraken-mount.elf',
    supportedFormats: ['pkg', 'folder', 'zstd', 'lz4'],
    formatDescriptions: {
      pkg: 'Прямое монтирование Debug FPKG (.pkg) без полной установки',
      folder: 'Распакованный дамп папки (Plain Folder Dump)',
      zstd: 'Сжатый архив Zstandard (.zst pack) с потоковым чтением через ampr-emu-ng',
      lz4: 'Быстрый сжатый архив LZ4 (.lz4 pack) для M.2 SSD / USB / /data',
    },
    actions: [
      {
        id: 'discover',
        method: 'GET',
        endpoint: ':8097/api/games',
        label: 'GET :8097/api/games',
        description: 'Список игр (.pkg, folder, lz4, zstd) во внутренней памяти, M.2 и USB',
      },
      {
        id: 'mount',
        method: 'POST',
        endpoint: ':8097/api/mount',
        label: 'POST :8097/api/mount',
        description: 'Прямое монтирование через ampr-emu-ng v0.4.0 и создание иконки на Home Screen',
      },
      {
        id: 'rebuild',
        method: 'POST',
        endpoint: ':8097/api/rebuild',
        label: 'POST :8097/api/rebuild',
        description: 'Пересобрать кэш игр и обновить плитки на главном экране PS5',
      },
      {
        id: 'config',
        method: 'GET',
        endpoint: ':8097/api/config',
        label: 'config.toml & kraken.log',
        description: 'Инспекция /data/krakenmount/config.toml и логов демона на порту 8097',
      },
    ],
    initialEntries: INITIAL_KRAKEN_ENTRIES,
  },

  executeAction(actionId, entries, selectedTitleId, ps5Ip) {
    const handler = KRAKEN_ACTION_HANDLERS[actionId];
    return handler(entries, selectedTitleId, ps5Ip);
  },

  createEntry(titleId, titleName, format) {
    const pathBuilder = KRAKEN_PATH_BY_FORMAT[format];
    return {
      titleId,
      titleName,
      contentVersion: '01.00',
      containerType: format,
      path: pathBuilder(titleId),
      mounted: false,
      backendInfo: `ampr-emu-ng v0.4.0 (${format.toUpperCase()} Direct Mount)`,
    };
  },
};
