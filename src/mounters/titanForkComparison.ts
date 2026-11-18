export interface TitanForkComparisonRow {
  readonly id: string;
  readonly featureArea: string;
  readonly grimmtrollTitanFix7: string;
  readonly ourModV22: string;
  readonly ourModV23Merged: string;
  readonly advantageOwner: 'grimmtroll' | 'our-v22' | 'merged-v23';
}

export interface BackportCatalogFileEntry {
  readonly path: string;
  readonly url: string;
  readonly size: number;
  readonly sha256: string;
}

export interface BackportCatalogEntry {
  readonly id: string;
  readonly revision: string;
  readonly title_id: string;
  readonly name: string;
  readonly author: string;
  readonly page: string;
  readonly game_version: string;
  readonly firmware_min: string;
  readonly firmware_max: string;
  readonly model: 'any' | 'base' | 'pro';
  readonly kind: 'native' | 'pkg' | 'folder';
  readonly notes: string;
  readonly files: readonly BackportCatalogFileEntry[];
}

export interface BackportCatalogSchemaV1 {
  readonly schema: 1;
  readonly entries: readonly BackportCatalogEntry[];
}

export interface BackportCompatibilityTarget {
  readonly titleId: string;
  readonly gameVersion: string;
  readonly firmware: string;
  readonly consoleModel: 'base' | 'pro';
  readonly sourceKind: 'pkg' | 'folder';
}

export interface BackportMatchResult {
  readonly matched: boolean;
  readonly reason: string;
  readonly entry?: BackportCatalogEntry;
}

export const PROTECTED_Y2JB_TITLE_IDS: readonly string[] = [
  'PPSA01650', // US YouTube (Y2JB v1.1.0 primary)
  'PPSA01651', // EU YouTube (Y2JB regional host)
  'PPSA01652', // JP/Asia YouTube (Y2JB regional host)
] as const;

export function isProtectedY2jbTitleId(titleId: string): boolean {
  const normalized = titleId.trim().toUpperCase();
  return PROTECTED_Y2JB_TITLE_IDS.includes(normalized);
}

export function parseThreePartVersion(raw: string): [number, number, number] | null {
  const parts = raw.trim().split('.');
  if (parts.length !== 3) return null;
  const nums = parts.map((p) => Number.parseInt(p, 10));
  if (nums.some((n) => Number.isNaN(n) || n < 0)) return null;
  return [nums[0], nums[1], nums[2]];
}

export function compareThreePartVersions(a: string, b: string): number | null {
  const pa = parseThreePartVersion(a);
  const pb = parseThreePartVersion(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

export function parseFirmwareNumber(fw: string): number | null {
  const m = fw.trim().match(/^(\d{1,2})\.(\d{2})$/);
  if (!m) return null;
  return Number.parseInt(m[1], 10) * 100 + Number.parseInt(m[2], 10);
}

const ALLOWED_BACKPORT_PREFIXES = ['fakelib/', 'fakelib2/', 'sce_module/'] as const;
const FORBIDDEN_RUNTIME_MODULES = new Set([
  'libsceampr.sprx',
  'libkernel.sprx',
  'libkernel_sys.sprx',
]);

export function validateBackportFileRelativePath(relPath: string): {
  valid: boolean;
  reason?: string;
} {
  const clean = relPath.trim();
  if (!clean || clean.startsWith('/') || clean.includes('..') || clean.includes('\\')) {
    return { valid: false, reason: 'Path traversal or absolute path is forbidden' };
  }
  if (clean === 'eboot.bin' || clean === 'sce_sys/param.json') {
    return { valid: true };
  }
  const hasAllowedPrefix = ALLOWED_BACKPORT_PREFIXES.some((prefix) =>
    clean.startsWith(prefix)
  );
  if (!hasAllowedPrefix) {
    return {
      valid: false,
      reason: 'Only eboot.bin, sce_sys/param.json, fakelib/, fakelib2/, or sce_module/ are allowed',
    };
  }
  const lowerBase = clean.split('/').pop()?.toLowerCase() ?? '';
  if (!lowerBase.endsWith('.prx') && !lowerBase.endsWith('.sprx')) {
    return { valid: false, reason: 'Module files must end with .prx or .sprx' };
  }
  if (FORBIDDEN_RUNTIME_MODULES.has(lowerBase)) {
    return {
      valid: false,
      reason: `Protected runtime module ${lowerBase} cannot be overwritten by a managed backport`,
    };
  }
  return { valid: true };
}

export function matchBackportCatalogEntry(
  catalog: BackportCatalogSchemaV1,
  target: BackportCompatibilityTarget
): BackportMatchResult {
  if (isProtectedY2jbTitleId(target.titleId)) {
    return {
      matched: false,
      reason: `Title ${target.titleId} is a protected Y2JB host and excluded from overlays`,
    };
  }
  const fwNum = parseFirmwareNumber(target.firmware);
  if (fwNum === null) {
    return { matched: false, reason: `Invalid target firmware format: ${target.firmware}` };
  }

  for (const entry of catalog.entries) {
    if (entry.title_id.toUpperCase() !== target.titleId.trim().toUpperCase()) {
      continue;
    }
    const verCmp = compareThreePartVersions(entry.game_version, target.gameVersion);
    if (verCmp !== 0) {
      continue;
    }
    const minFw = parseFirmwareNumber(entry.firmware_min);
    const maxFw = parseFirmwareNumber(entry.firmware_max);
    if (minFw === null || maxFw === null || fwNum < minFw || fwNum > maxFw) {
      continue;
    }
    if (entry.model !== 'any' && entry.model !== target.consoleModel) {
      continue;
    }
    if (entry.kind !== 'native' && entry.kind !== target.sourceKind) {
      continue;
    }
    for (const file of entry.files) {
      const pathCheck = validateBackportFileRelativePath(file.path);
      if (!pathCheck.valid) {
        return {
          matched: false,
          reason: `Entry ${entry.id} rejected: ${pathCheck.reason}`,
        };
      }
    }
    return {
      matched: true,
      reason: `Exact match: ${entry.id} (rev ${entry.revision}) for ${entry.title_id} v${entry.game_version} on FW ${target.firmware}`,
      entry,
    };
  }

  return {
    matched: false,
    reason: `No compatible backport pack found for ${target.titleId} v${target.gameVersion} on FW ${target.firmware} (${target.consoleModel})`,
  };
}

export const TITAN_FORK_COMPARISON_MATRIX: readonly TitanForkComparisonRow[] = [
  {
    id: 'ampr-pool-cache',
    featureArea: 'AMPR Runtime & Cache Budget',
    grimmtrollTitanFix7: 'ampr-emu-ng v0.4.1 (8b61a06, 732 KB, ~134 MiB cache, баннер PLAY NO LIMIT)',
    ourModV22: 'ampr-emu-ng beta 3ced5c0 (256 MiB PRX pool -> 204–208 MiB cache, 3-hit LRU)',
    ourModV23Merged: 'ampr-emu-ng beta 3ced5c0 (256 MiB PRX pool, 204–208 MiB cache, save-mount guard)',
    advantageOwner: 'our-v22',
  },
  {
    id: 'debug-forensics-drive',
    featureArea: 'Дебаг памяти, ошибок и Google Drive Telemetry',
    grimmtrollTitanFix7: 'Стандартный текстовый лог и Diagnostics UI без KERN_PROC_VMMAP и облачного дампа',
    ourModV22: 'GET /api/debug/memory (KERN_PROC_VMMAP), 256-slot errno ring, last-crash-bundle.json',
    ourModV23Merged: 'Дебаг-бандл Mod v2.2 + Авто-выгрузка репортов на Google Диск (OAuth Drive API + Apps Script Webhook)',
    advantageOwner: 'merged-v23',
  },
  {
    id: 'playgo-stub-per-game',
    featureArea: 'PlayGo Stub 0.6 & Per-Game Selection',
    grimmtrollTitanFix7: 'Встроен drakmor PlayGo Stub 0.6 (libScePlayGo.sprx) + чекбоксы игр (playgo_exclude)',
    ourModV22: 'Отдельный рецепт в Dump Mods (без вшивания в ELF)',
    ourModV23Merged: 'Портировано в Mod v2.3: встроен PlayGo Stub 0.6 + массив playgo_exclude в config.toml и UI',
    advantageOwner: 'merged-v23',
  },
  {
    id: 'smp-isolated4-ownership',
    featureArea: 'Изоляция ShadowMountPlus и защита иконок',
    grimmtrollTitanFix7: '1.7beta12-titan-isolated4 (отключены 2 фоновых AppUnInstall, адресный Title ID API, mount.lnk)',
    ourModV22: 'Ванильный ShadowMountPlus 1.7beta12',
    ourModV23Merged: 'Портировано в Mod v2.3: isolated4-политика (запрет фонового AppUnInstall, per-title claim и mount.lnk guard)',
    advantageOwner: 'merged-v23',
  },
  {
    id: 'y2jb-regional-guard',
    featureArea: 'Защита хоста Y2JB (YouTube)',
    grimmtrollTitanFix7: 'Исключает все 3 региона: PPSA01650 (US), PPSA01651 (EU), PPSA01652 (JP) из регистрации и оверлеев',
    ourModV22: 'Тихий пропуск retail PPSA01650',
    ourModV23Merged: 'Портировано в Mod v2.3: жесткий фильтр всех 3 регионов PPSA01650 / PPSA01651 / PPSA01652 во всех путях',
    advantageOwner: 'merged-v23',
  },
  {
    id: 'soft-unmount-no-force',
    featureArea: 'Размонтирование слоёв при выходе из игры',
    grimmtrollTitanFix7: 'Мягкая очистка без MNT_FORCE по тайм-ауту + фоновый опрос пропущенных NOTE_EXIT',
    ourModV22: 'Тайм-аут с финальным MNT_FORCE при EBUSY в launch.rs',
    ourModV23Merged: 'Портировано в Mod v2.3: отказ от MNT_FORCE на занятых слоях + периодическая сверка исчезнувших PID',
    advantageOwner: 'merged-v23',
  },
  {
    id: 'backports-catalog-schema1',
    featureArea: 'Каталог нативных бэкпортов (Schema v1)',
    grimmtrollTitanFix7: 'Менеджер JSON-каталогов (точное сравнение 01.008.000 == 1.8.0, SHA-256, откат Current/Previous)',
    ourModV22: 'Локальная папка /data/homebrew/backports/<TID>',
    ourModV23Merged: 'Портировано в Mod v2.3: совместимость со Schema v1 каталогами + иммутабельные паки и валидатор путей',
    advantageOwner: 'merged-v23',
  },
  {
    id: 'onionhen-all-7-formats',
    featureArea: 'Защита OnionHEN/etaHEN и 7 форматов дампов',
    grimmtrollTitanFix7: 'Проверяет только kstuff; классифицирует pkg/folder/exfat',
    ourModV22: 'Case-insensitive OnionHEN/etaHEN guard + все 7 форматов (вкл. split *_0.pkg, ffpfsc, zst/lz4) + #62',
    ourModV23Merged: 'Полностью сохранено из Mod v2.2',
    advantageOwner: 'our-v22',
  },
];

export const SAMPLE_BACKPORT_CATALOG_V1: BackportCatalogSchemaV1 = {
  schema: 1,
  entries: [
    {
      id: 'ppsa08560-fw1360-backport-r1',
      revision: '1',
      title_id: 'PPSA08560',
      name: 'Stellar Blade (13.60 Fakelib + PlayGo Pack)',
      author: 'Prospero 13.60 Scene / TITAN Mod v2.3',
      page: 'https://github.com/grimmtroll2285-dot/TITAN',
      game_version: '01.008.000',
      firmware_min: '12.00',
      firmware_max: '13.60',
      model: 'any',
      kind: 'native',
      notes: 'Includes stripped fakelib sprx overlay and PlayGo 0.6 compatibility profile.',
      files: [
        {
          path: 'fakelib/libScePlayGo.sprx',
          url: 'https://raw.githubusercontent.com/grimmtroll2285-dot/TITAN/main/backports/files/f5fdb0ed/libScePlayGo.sprx',
          size: 18150,
          sha256: 'f5fdb0ed6cc7413e6dcac79a62e0efd8cfbae04cca0bf932e7a741aed850d213',
        },
        {
          path: 'sce_sys/param.json',
          url: 'https://raw.githubusercontent.com/grimmtroll2285-dot/TITAN/main/backports/files/91a4bc11/param.json',
          size: 2048,
          sha256: '91a4bc11e02b9911a4f7c22801948812d93e4011b208764391a4bc11e02b9911',
        },
      ],
    },
  ],
};
