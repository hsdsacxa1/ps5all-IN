import {
  MountableTitleEntry,
  MounterActionId,
  MounterContainerFormat,
  MounterSimulationPayload,
  MounterStrategy,
} from '../types/mounter';

const INITIAL_MIX_ENTRIES: MountableTitleEntry[] = [
  {
    titleId: 'PPSA08560',
    titleName: 'Split Fiction (Sparse Extent Debug FPKG — Fixed!)',
    contentVersion: '01.50',
    containerType: 'pkg',
    path: '/mnt/ext0/homebrew/PPSA08560-SplitFiction.pkg',
    mounted: true,
    backendInfo: 'KrakenShadow-Mix: Sparse Zero-Fill + ampr-emu-ng v0.4.0-fix62',
  },
  {
    titleId: 'PPSA01341',
    titleName: "Demon's Souls (Nested USB Subfolder PKG — Fixed!)",
    contentVersion: '01.00',
    containerType: 'pkg',
    path: '/mnt/usb0/homebrew/DemonsSouls/PPSA01341.pkg',
    mounted: true,
    backendInfo: 'KrakenShadow-Mix: 2-Level Scan + Stacked UnionFS (/app0/kraken)',
  },
  {
    titleId: 'PPSA10407',
    titleName: 'Astro Bot (Folder + ampr_zstd.index)',
    contentVersion: '01.02',
    containerType: 'zstd',
    path: '/data/homebrew/PPSA10407',
    mounted: true,
    backendInfo: 'KrakenShadow-Mix: ampr-emu-ng ZSTD + Stacked fakelib overlay',
  },
  {
    titleId: 'FAKE00001',
    titleName: 'PSP5 Vulkan Emulator (ShadowMountPlus .ffpfsc)',
    contentVersion: '01.02',
    containerType: 'ffpfsc',
    path: '/data/homebrew/FAKE00001.ffpfsc',
    mounted: true,
    backendInfo: 'ShadowMountPlus Bridge (127.0.0.1:10101 -> TitleDir)',
  },
  {
    titleId: 'PPSA99210',
    titleName: 'ProsperoTV Media Player (ShadowMountPlus UFS2 .ffpkg)',
    contentVersion: '01.01',
    containerType: 'ffpkg',
    path: '/data/homebrew/PPSA99210.ffpkg',
    mounted: true,
    backendInfo: 'ShadowMountPlus Bridge (127.0.0.1:10101 -> UFS2 Mount)',
  },
];

type MixActionHandler = (
  entries: MountableTitleEntry[],
  selectedTitleId: string,
  ps5Ip: string
) => {
  updatedEntries: MountableTitleEntry[];
  payload: MounterSimulationPayload;
};

const MIX_ACTION_HANDLERS: Record<MounterActionId, MixActionHandler> = {
  discover: (entries, _selectedTitleId, ps5Ip) => ({
    updatedEntries: entries,
    payload: {
      status: 'ok_unified',
      daemon: 'KrakenShadow-Mix v1.0 (Patched kraken-mount + ShadowMountPlus v1.7 Bridge)',
      endpoint: `GET http://${ps5Ip}:8097/api/unified/games`,
      bridge:
        'Unified Router: (.pkg/zstd/lz4 -> ampr-emu-ng v0.4.0-fix62 Stacked UnionFS) + (.ffpkg/.ffpfsc -> ShadowMountPlus :10101)',
      storagePaths: [
        '/data/homebrew (2-level recursive)',
        '/data/etaHEN/games (2-level recursive)',
        '/data/games (2-level recursive)',
        '/mnt/ext0/homebrew',
        '/mnt/usb0..7 (root + homebrew + pkgs)',
      ],
      games: entries,
    },
  }),
  mount: (entries, selectedTitleId, ps5Ip) => {
    const updatedEntries = entries.map((item) =>
      item.titleId === selectedTitleId ? { ...item, mounted: true } : item
    );
    const target = updatedEntries.find((i) => i.titleId === selectedTitleId);
    const isShadowContainer =
      target?.containerType === 'ffpkg' || target?.containerType === 'ffpfsc';
    return {
      updatedEntries,
      payload: {
        status: 'mounted_unified',
        daemon: 'KrakenShadow-Mix v1.0',
        endpoint: isShadowContainer
          ? `POST http://${ps5Ip}:8097/api/mount -> delegated to http://127.0.0.1:10101/api/v1/games/mount`
          : `POST http://${ps5Ip}:8097/api/mount (Stacked UnionFS + /app0/kraken)`,
        bridge: isShadowContainer
          ? 'ShadowMountPlus v1.7 TitleDir Bridge (No fakelib collision)'
          : 'Kraken Stacked UnionFS over common/lib + ampr-emu-ng v0.4.0-fix62',
        storagePaths: ['/data/krakenmount/caches/', '/data/homebrew/'],
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
        status: 'unified_cache_rebuilt',
        daemon: 'KrakenShadow-Mix v1.0',
        endpoint: `POST http://${ps5Ip}:8097/api/rebuild + POST http://127.0.0.1:10101/api/v1/scan`,
        bridge: 'Sparse Extent Zero-Fill Cache + ShadowMountPlus Rescan',
        storagePaths: ['/data/krakenmount/caches/', '/data/homebrew/'],
        logTail: [
          '[kraken-shadow-mix] Sparse extent fix active: kind-0x40 holes zero-filled & extracted to cache',
          '[kraken-shadow-mix] 2-level directory scanner discovered nested .pkg and ampr folders',
          '[kraken-shadow-mix] Stacked unionfs enabled: coexists with ShadowMountPlus on common/lib',
          '[kraken-shadow-mix] Delegated .ffpkg / .ffpfsc containers to ShadowMountPlus (127.0.0.1:10101)',
        ],
        games: remounted,
      },
    };
  },
  config: (entries, _selectedTitleId, ps5Ip) => ({
    updatedEntries: entries,
    payload: {
      status: 'ok',
      daemon: 'KrakenShadow-Mix v1.0 (Unified)',
      endpoint: `GET http://${ps5Ip}:8097/api/config`,
      bridge: 'ampr-emu-ng v0.4.0-fix62 + ShadowMountPlus 127.0.0.1:10101',
      storagePaths: ['/data/krakenmount/config.toml', '/data/krakenmount/kraken.log'],
      configPreview: `# /data/krakenmount/config.toml (KrakenShadow-Mix Unified Config)
port = 8097
notify = 1
backports = 1
inject_ampr = 1
game_fakelib = "auto"

# New Unified Mix Options:
recursive_depth = 2
allow_sparse_pkg = 1
stack_unionfs_over_smp = 1
shadowmount_bridge_url = "http://127.0.0.1:10101/api/v1"`,
      logTail: [
        '[kraken-shadow-mix] Bundled ampr-emu-ng v0.4.0-fix62 (2s BUSY save wait)',
        '[kraken-shadow-mix] Sparse PKG extents (0x40) enabled (Ghost of Yotei, Split Fiction, Demon Souls)',
        '[kraken-shadow-mix] ShadowMountPlus bridge connected on http://127.0.0.1:10101/api/v1',
        '[kraken-shadow-mix] Stacked unionfs mode: no need to disable ShadowMountPlus!',
      ],
      games: entries,
    },
  }),
};

const MIX_PATH_BY_FORMAT: Record<MounterContainerFormat, (id: string) => string> = {
  pkg: (id) => `/data/homebrew/${id}-debug.pkg`,
  zstd: (id) => `/data/homebrew/${id} (ampr_zstd.index)`,
  lz4: (id) => `/mnt/ext0/homebrew/${id} (ampr_assets.index)`,
  folder: (id) => `/data/homebrew/${id}`,
  ffpkg: (id) => `/data/homebrew/${id}.ffpkg`,
  ffpfsc: (id) => `/data/homebrew/${id}.ffpfsc`,
};

export const krakenShadowMixStrategy: MounterStrategy = {
  spec: {
    id: 'kraken-shadow-mix',
    name: 'KrakenShadow-Mix (Unified)',
    version: 'v1.0-mix (Kraken + SMP 1.7 Bridge)',
    repository: 'quer3q/kraken-mount + drakmor/ShadowMountPlus',
    releaseUrl: 'https://github.com/quer3q/kraken-mount/releases/tag/v0.0.1-beta',
    defaultPort: 8097,
    baseUrlTemplate: 'http://<ps5-ip>:8097/ (+ bridge -> 127.0.0.1:10101)',
    backendBridge:
      'Unified: ampr-emu-ng v0.4.0-fix62 (Stacked UnionFS) + ShadowMountPlus (10101)',
    dataDirectory: '/data/krakenmount/ + /data/homebrew/',
    configPath: '/data/krakenmount/config.toml',
    logPath: '/data/krakenmount/kraken.log',
    deployCommand: 'nc -w 3 $PS5_HOST 9021 < kraken-shadow-mix.elf',
    supportedFormats: ['pkg', 'zstd', 'lz4', 'folder', 'ffpkg', 'ffpfsc'],
    formatDescriptions: {
      pkg: 'Debug FPKG (.pkg) с поддержкой Sparse Extents (0x40) и вложенных подпапок (до 2 уровней)',
      zstd: 'Папка игры с ampr_zstd.index (потоковая декомпрессия через ampr-emu-ng)',
      lz4: 'Папка игры с ampr_assets.index (быстрые LZ4-паки через ampr-emu-ng)',
      folder: 'Распакованная папка игры (eboot.bin + sce_sys/param.json)',
      ffpkg: 'Образ UFS2 (.ffpkg) — прозрачно делегируется в ShadowMountPlus (10101)',
      ffpfsc: 'Сжатый образ mkpfs (.ffpfsc) — прозрачно делегируется в ShadowMountPlus (10101)',
    },
    actions: [
      {
        id: 'discover',
        method: 'GET',
        endpoint: ':8097/api/unified/games',
        label: 'GET :8097 Unified Games',
        description:
          'Единый список игр (.pkg, zstd, lz4, folder + .ffpkg/.ffpfsc из ShadowMountPlus)',
      },
      {
        id: 'mount',
        method: 'POST',
        endpoint: ':8097/api/mount',
        label: 'POST :8097 Unified Mount',
        description:
          'Бесконфликтное монтирование (Stacked UnionFS поверх SMP или мост на 10101)',
      },
      {
        id: 'rebuild',
        method: 'POST',
        endpoint: ':8097/api/rebuild',
        label: 'Rebuild + SMP Scan',
        description:
          'Пересборка кэша (с распаковкой sparse-файлов) + синхронный POST /api/v1/scan на 10101',
      },
      {
        id: 'config',
        method: 'GET',
        endpoint: ':8097/api/config',
        label: 'Unified config.toml',
        description: 'Настройки объединённого микса Kraken + ShadowMountPlus',
      },
    ],
    initialEntries: INITIAL_MIX_ENTRIES,
  },

  executeAction(actionId, entries, selectedTitleId, ps5Ip) {
    const handler = MIX_ACTION_HANDLERS[actionId];
    return handler(entries, selectedTitleId, ps5Ip);
  },

  createEntry(titleId, titleName, format) {
    const pathBuilder = MIX_PATH_BY_FORMAT[format];
    const isShadow = format === 'ffpkg' || format === 'ffpfsc';
    return {
      titleId,
      titleName,
      contentVersion: '01.00',
      containerType: format,
      path: pathBuilder(titleId),
      mounted: true,
      backendInfo: isShadow
        ? `ShadowMountPlus Bridge (10101 -> ${format.toUpperCase()})`
        : `KrakenShadow-Mix ampr-emu-ng (${format.toUpperCase()} Stacked UnionFS)`,
    };
  },
};
