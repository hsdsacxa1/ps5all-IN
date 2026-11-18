export type Ps5DumpFormatId =
  | 'folder-plain'
  | 'folder-lz4'
  | 'folder-zstd'
  | 'pkg-debug-sparse'
  | 'pfs-ffpkg-ffpfsc'
  | 'archive-zst-lz4'
  | 'image-exfat-img';

export type DumpFormatHandler =
  | 'TITAN-CORE Native (nullfs + fakelib)'
  | 'TITAN-CORE + AMPR 256 MiB PRX'
  | 'TITAN-CORE PKG + protected.rs + AMPR'
  | 'ShadowMountPlus 1.7beta12 Bridge'
  | 'Kraken Mount / Unpack-on-Host';

export interface Ps5DumpFormatSpec {
  readonly id: Ps5DumpFormatId;
  readonly name: string;
  readonly extensionsOrMarker: string;
  readonly handler: DumpFormatHandler;
  readonly amprIndexRule: string;
  readonly notes: string;
}

export const PS5_DUMP_FORMATS: readonly Ps5DumpFormatSpec[] = [
  {
    id: 'folder-plain',
    name: 'Распакованная папка (Plain Folder)',
    extensionsOrMarker: '<DIR>/eboot.bin + sce_sys/param.json',
    handler: 'TITAN-CORE Native (nullfs + fakelib)',
    amprIndexRule: 'Индекс не требуется; опционально fakelib/fakelib2 + backport overlay',
    notes: 'Базовый формат. Mod v2.2 фиксит fast-path права (fix_access + umask 0) даже при повторном монтировании кэша.',
  },
  {
    id: 'folder-lz4',
    name: 'Сжатая папка LZ4 (AMPR Assets)',
    extensionsOrMarker: 'ampr_assets.index + ampr_packs/*',
    handler: 'TITAN-CORE + AMPR 256 MiB PRX',
    amprIndexRule: 'Проверка заголовка ampr_assets.index + детальный лог ошибок (#62)',
    notes: 'Мощнее с ampr-emu-ng 3ced5c0: пул 256 MiB и снятый лимит 48 MiB на индекс файлов.',
  },
  {
    id: 'folder-zstd',
    name: 'Сжатая папка Zstd (APR / AMPR)',
    extensionsOrMarker: 'ampr_zstd.index / apr.zstd.chunks',
    handler: 'TITAN-CORE + AMPR 256 MiB PRX',
    amprIndexRule: 'Динамический кэш до 204 MiB в 256 MiB PRX (3-hit protected segment)',
    notes: 'Поддержка apr_reactor + partial-chunk кэш с первого касания в beta 3ced5c0.',
  },
  {
    id: 'pkg-debug-sparse',
    name: 'Debug FPKG (.pkg, Sparse & Split *_0.pkg)',
    extensionsOrMarker: '*.pkg (CNTM / protected flags1 / sparse extents)',
    handler: 'TITAN-CORE PKG + protected.rs + AMPR',
    amprIndexRule: 'Генерация AMPRPAK4 + 16 CNT_FALLBACKS + SHA3/AES расшифровка nptitle/npbind',
    notes: 'Mod v2.2 диагностирует sparse-блоки, определяет split-части (*_0.pkg) и разрешает внешние /homebrew|/games .pkg.',
  },
  {
    id: 'pfs-ffpkg-ffpfsc',
    name: 'UFS2 / Сжатый PFS (.ffpkg / .ffpfsc)',
    extensionsOrMarker: '*.ffpkg, *.ffpfsc (mkpfs)',
    handler: 'ShadowMountPlus 1.7beta12 Bridge',
    amprIndexRule: 'Индексируется локально (discover_images) и делегируется в SMP :10101',
    notes: 'Исключает «слепые зоны» до завершения скана ShadowMountPlus и отображает тип образа в UI/дебаг-бандле.',
  },
  {
    id: 'archive-zst-lz4',
    name: 'Монолитный архив (.zst / .zstd / .lz4)',
    extensionsOrMarker: '*.zst, *.zstd, *.lz4',
    handler: 'Kraken Mount / Unpack-on-Host',
    amprIndexRule: 'Детектируется инвентарём TITAN-CORE с подсказкой монтирования или авто-распаковки',
    notes: 'Не теряется при скане /data/games и USB; помечается точным форматом archive-zst / archive-lz4.',
  },
  {
    id: 'image-exfat-img',
    name: 'Дисковый образ (.exfat / .img)',
    extensionsOrMarker: '*.exfat, *.img',
    handler: 'ShadowMountPlus 1.7beta12 Bridge',
    amprIndexRule: 'Обнаружение exFAT/RAW-образов (case-insensitive) с привязкой к dev/mount',
    notes: 'Сохраняет единый формат source_id без монтирования и перезаписи в /mnt/.',
  },
];

const EXTENSION_FORMAT_MAP: Record<string, Ps5DumpFormatId> = {
  pkg: 'pkg-debug-sparse',
  ffpkg: 'pfs-ffpkg-ffpfsc',
  ffpfsc: 'pfs-ffpkg-ffpfsc',
  zst: 'archive-zst-lz4',
  zstd: 'archive-zst-lz4',
  lz4: 'archive-zst-lz4',
  exfat: 'image-exfat-img',
  img: 'image-exfat-img',
};

const FOLDER_MARKER_MAP: Record<string, Ps5DumpFormatId> = {
  'ampr_zstd.index': 'folder-zstd',
  'apr.zstd.chunks': 'folder-zstd',
  'ampr_assets.index': 'folder-lz4',
};

export function classifyDumpFormatByPath(
  path: string,
  folderMarkers: readonly string[] = []
): Ps5DumpFormatSpec {
  const normalized = path.trim().toLowerCase();
  const ext = normalized.split('.').pop() ?? '';
  const extMatch = EXTENSION_FORMAT_MAP[ext];
  if (extMatch) {
    return PS5_DUMP_FORMATS.find((f) => f.id === extMatch) ?? PS5_DUMP_FORMATS[0];
  }
  for (const marker of folderMarkers) {
    const markerId = FOLDER_MARKER_MAP[marker.trim().toLowerCase()];
    if (markerId) {
      return PS5_DUMP_FORMATS.find((f) => f.id === markerId) ?? PS5_DUMP_FORMATS[0];
    }
  }
  return PS5_DUMP_FORMATS[0];
}
