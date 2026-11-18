export type TitanCorePatchCategory =
  | 'all'
  | 'debug-memory'
  | 'dump-formats'
  | 'upstream-v1'
  | 'hen-guard'
  | 'containers'
  | 'scanner-config';

export interface TitanCoreModPatch {
  id: string;
  category: Exclude<TitanCorePatchCategory, 'all'>;
  categoryLabel: string;
  targetFile: string;
  title: string;
  sceneBasis: string;
  summary: string;
  snippet: string;
}

export interface TitanCoreModSummary {
  versionLabel: string;
  upstreamBase: string;
  bundledServices: string;
  bundledAmpr: string;
  elfArtifact: string;
  patchArtifact: string;
  legacyPatchArtifact: string;
  elfReportArtifact: string;
  rustTestsPassed: string;
}

export const TITAN_CORE_MOD_SUMMARY: TitanCoreModSummary = {
  versionLabel: 'TITAN-CORE v1.0.2-mod-20261118 (Compiled Mod v2.2 ELF)',
  upstreamBase: 'devchmod/TITAN-CORE v1.0.0 (2e1f186) + Mod v2.2 (Memory/Error Debug Bundle + All 7 Dump Formats)',
  bundledServices: 'ShadowMountPlus 1.7beta12 + kstuff-lite 1.11 (OnionHEN/etaHEN guard)',
  bundledAmpr: 'ampr-emu-ng beta 3ced5c0 (256 MiB PRX, 204-208 MiB cache, save-mount guard)',
  elfArtifact: 'TITAN-CORE-v1.0-mod-20261118-v2.2.elf',
  patchArtifact: 'TITAN-CORE-v1.0-mod-20261118-v2.2.patch',
  legacyPatchArtifact: 'TITAN-CORE-v1.0-mod-20261116.patch',
  elfReportArtifact: 'TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt',
  rustTestsPassed: '21/21 Rust tests + FreeBSD 11 -Dwarnings + 2-Stage LTO ELF64 (17,254,680 B)',
};

export const TITAN_CORE_CATEGORY_TABS: ReadonlyArray<{
  id: TitanCorePatchCategory;
  label: string;
}> = [
  { id: 'all', label: 'Все улучшения (13)' },
  { id: 'debug-memory', label: 'Дебаг, Память и Ошибки' },
  { id: 'dump-formats', label: 'Все форматы дампов' },
  { id: 'upstream-v1', label: 'База v1.0.0 + AMPR 3ced5c0' },
  { id: 'hen-guard', label: 'Ядро и OnionHEN' },
  { id: 'containers', label: 'Контейнеры и Доступ' },
  { id: 'scanner-config', label: 'Сканер и Конфиг' },
];

export const TITAN_CORE_MOD_PATCHES: readonly TitanCoreModPatch[] = [
  {
    id: 'debug-memory-vmmap-collector',
    category: 'debug-memory',
    categoryLabel: 'NEW Mod v2.2 · Память и VM',
    targetFile: 'src/debug_bundle.rs + src/web.rs',
    title: 'NEW (Mod v2.2): Дамп памяти процесса (rusage + KERN_PROC_VMMAP + AMPR 256 MiB map)',
    sceneBasis: 'Аудит памяти PS5 13.60 (Flexible 448 MiB / ShellUI 1.6 GiB) + FreeBSD sysctl ABI',
    summary:
      'Добавляет GET /api/debug/memory и GET /api/debug/mounts: снимает RSS, minor/major page faults, context switches, карту mmap/PRX-регионов (подтверждая загрузку libSceAmpr.sprx), свободный объём /data и проверяет граф монтирований getmntinfo() на двойные коллизии unionfs common/lib.',
    snippet: `// GET /api/debug/memory -> crate::debug_bundle::memory_snapshot_json()
let mut ru: libc::rusage = unsafe { std::mem::zeroed() };
unsafe { libc::getrusage(libc::RUSAGE_SELF, &mut ru) };
let mut mib = [libc::CTL_KERN, libc::KERN_PROC, 32 /* KERN_PROC_VMMAP */, pid];
// Возвращает: rss_mib, page_faults_major, vm_regions_count, ampr_mapped, unionfs_collisions`,
  },
  {
    id: 'debug-error-ring-and-crash-bundle',
    category: 'debug-memory',
    categoryLabel: 'NEW Mod v2.2 · Ошибки и Panic',
    targetFile: 'src/debug_bundle.rs + src/main.rs + src/web.rs',
    title: 'NEW (Mod v2.2): Кольцевой буфер 256 ошибок (errno) + авто-дамп при панике и экспорт бандла',
    sceneBasis: 'Постмортем-форензика сбоев без потери контекста при ротации titan-core.log',
    summary:
      'Регистрирует последние 256 ошибок с монотонным временем, Title ID и errno. При panic! записывает /data/titan-core/debug/last-crash-bundle.json. Эндпоинты GET /api/debug/error-dump и POST /api/debug/dump-bundle формируют единый JSON-бандл (память + монтирования + ошибки + форматы).',
    snippet: `std::panic::set_hook(Box::new(|info| {
    let msg = format!("PANIC: {info}");
    sys::log_line(&msg);
    debug_bundle::record_error("PANIC", 0, msg);
    let _ = debug_bundle::write_bundle("last-crash-bundle.json", serde_json::json!({}));
}));`,
  },
  {
    id: 'all-7-dump-formats-registry',
    category: 'dump-formats',
    categoryLabel: 'NEW Mod v2.2 · Все форматы',
    targetFile: 'src/dump_formats.rs + src/library.rs + src/web.rs',
    title: 'NEW (Mod v2.2): Интеграция всех 7 форматов дампов (folder, lz4, zstd, pkg, ffpkg, ffpfsc, exfat)',
    sceneBasis: 'Единый инвентарь под TITAN-CORE, ShadowMountPlus 1.7b12, Kraken Mount v0.2.1 и ps5upload v12.6.7',
    summary:
      'Заменяет узкий discover_exfat() на универсальный классификатор dump_formats::classify_path(): обнаруживает распакованные папки (Plain/LZ4/Zstd), FPKG (.pkg + split *_0.pkg), образы PFS (.ffpkg/.ffpfsc), сжатые архивы (.zst/.zstd/.lz4) и образы (.exfat/.img). Доступно через GET /api/debug/formats.',
    snippet: `// src/dump_formats.rs + src/library.rs
pub enum DumpFormat {
    FolderPlain, FolderLz4, FolderZstd,
    PkgStandardOrSparse, PkgSplitPart,
    PfsFfpkg, PfsFfpfsc, ArchiveZstd, ArchiveLz4, DiskExfatOrImg,
}`,
  },
  {
    id: 'external-pkg-and-split-detection',
    category: 'dump-formats',
    categoryLabel: 'NEW Mod v2.2 · Внешние PKG',
    targetFile: 'src/scan.rs + src/main.rs',
    title: 'NEW (Mod v2.2): Авто-подхват .pkg на USB/M.2 (/homebrew, /games), детектор split *_0.pkg и fast fix_access',
    sceneBasis: 'Сравнение upstream scan.rs vs ShadowMountPlus / Kraken Mount + фикс ремаунта при реплаге USB',
    summary:
      'Снимает жёсткий пропуск .pkg в /mnt/usb*/homebrew и /mnt/ext*/games (при сохранении изоляции /mnt/downloading), предупреждает о несобранных split-частях (*_0.pkg) и вызывает cache::fix_access(src) также на быстром пути уже зарегистрированного кэша.',
    snippet: `// src/scan.rs: не отбрасываем /homebrew/ и /games/ на внешних носителях
if crate::storage::drive_of(&path) != "/data"
    && !path.to_string_lossy().contains("/homebrew/")
    && !path.to_string_lossy().contains("/games/") ...
// src/main.rs fast-path: cache::fix_access(src); перед register::mount(...)`,
  },
  {
    id: 'fast-path-remount-and-ampr-cleanup',
    category: 'dump-formats',
    categoryLabel: 'NEW Mod v2.2 · Чистка кэша',
    targetFile: 'src/main.rs (prepare_ampr)',
    title: 'NEW (Mod v2.2): Удаление устаревшего /data/ampr_cache при старте и диагностика повреждённого индекса',
    sceneBasis: 'quer3q/ampr-emu-ng 3ced5c0 + ps5-dump-forge #62 реальный фикс в патче',
    summary:
      'В отличие от прежнего черновика, Mod v2.2 реально добавляет очистку старого /data/ampr_cache в prepare_ampr() и функцию validate_existing_index() в src/cache.rs с записью ошибок в кольцевой дебаг-буфер.',
    snippet: `if Path::new("/data/ampr_cache").exists() {
    let _ = std::fs::remove_dir_all("/data/ampr_cache");
}`,
  },
  {
    id: 'ampr-emu-ng-3ced5c0-256mb',
    category: 'upstream-v1',
    categoryLabel: 'Обновлено в v2.2 · AMPR PRX',
    targetFile: 'vendor/ampr-emu-ng/libSceAmpr.sprx + SHA256SUMS + VERSION',
    title: 'ampr-emu-ng beta 3ced5c0 — 256 MiB PRX пул (204–208 MiB кэша) и защита сейвов',
    sceneBasis: 'quer3q/ampr-emu-ng beta 3ced5c0 (17.11.2026 19:02 UTC)',
    summary:
      'PRX-пул увеличен со 184.44 MiB до 256 MiB (кэш стартует со 134.98 MiB и забирает хвост Index ledger -> до 204 MiB на .zst и 208 MiB на .pkg), добавлен 3-hit protected сегмент, защита kept index fd в close() хуках и фильтрация точек монтирования сохранений.',
    snippet: `// vendor/ampr-emu-ng/VERSION: 0.4.1-3ced5c0
// vendor/ampr-emu-ng/SHA256SUMS:
//   3dc644b8b514d348bf90eaa08e7fe534231b4a0b49c3b8be616b4d2760936477  libSceAmpr.sprx`,
  },
  {
    id: 'dump-forge-62-index-diag',
    category: 'scanner-config',
    categoryLabel: 'Реализовано в v2.2 · Диагностика',
    targetFile: 'src/cache.rs (validate_existing_index)',
    title: 'Порт ps5-dump-forge #62: точная причина и размер (bytes) при повреждении ampr_emu.index',
    sceneBasis: 'quer3q/ps5-dump-forge PR #62 (17.11.2026 — 40928bf7)',
    summary:
      'Вместо молчаливого отбрасывания ошибки через .ok() сохраняет точную причину отказа ридера (обрезка < 128 B, неверный magic AMPRIDX/AMPRPAK, ошибка чтения) и размер файла в байтах прямо в debug_bundle::record_error().',
    snippet: `pub fn validate_existing_index(index_path: &Path, title_id: &str) -> Result<u64, String> {
    let bytes = fs::metadata(index_path).map_err(|e| format!("stat: {e}"))?.len();
    if bytes < 128 {
        let msg = format!("ampr_emu.index ({bytes} bytes): truncated header (< 128 B)");
        crate::debug_bundle::record_error(title_id, libc::EINVAL, msg.clone());
        return Err(msg);
    }
    Ok(bytes)
}`,
  },
  {
    id: 'onionhen-etahen-guard',
    category: 'hen-guard',
    categoryLabel: 'Ядро и OnionHEN',
    targetFile: 'src/stack_policy.rs + src/stack.rs',
    title: 'Защита от двойного kstuff для OnionHEN v0.9.0 / etaHEN 13.60 и умный рестарт SMP',
    sceneBasis: 'aydencharles/onionHEN v0.9.0, GronedWaffel/etahen-13.60',
    summary:
      'dependency_presence() распознаёт процессы onionhen/etahen (case-insensitive) и не запускает встроенный kstuff-lite поверх активного HEN. При ObservePrevious безопасно поднимает только ShadowMountPlus 1.7beta12.',
    snippet: `let lower: Vec<u8> = name.iter().map(|b| b.to_ascii_lowercase()).collect();
kstuff |= lower.starts_with(b"kstuff")
    || lower.starts_with(b"ps5-kstuff")
    || lower.starts_with(b"onionhen")
    || lower.starts_with(b"etahen");`,
  },
  {
    id: 'protected-cnt-fallbacks',
    category: 'containers',
    categoryLabel: 'Контейнеры и Доступ',
    targetFile: 'crates/titan-core-pkg/src/lib.rs + protected.rs',
    title: '16 внешних sce_sys контейнеров + расшифровка protected.rs (SHA3-256 / AES-128-CBC)',
    sceneBasis: 'quer3q/kraken-mount v0.2.1 (219d468) + ps5-dump-forge v0.5.6',
    summary:
      'Расширяет CNT_FALLBACKS с 3 до 16 записей (save_data.png, pic0/1/2, snd0.at9, trophy00.ucp, uds00.ucp, nptitle.dat, npbind.dat) и расшифровывает защищённые записи debug-паролем.',
    snippet: `const CNT_FALLBACKS: [(u32, &str); 16] = [
    (0x1200, "sce_sys/icon0.png"), (0x1280, "sce_sys/icon0.dds"),
    (0x2000, "sce_sys/param.json"), (0x1006, "sce_sys/pic1.png"),
    (0x100D, "sce_sys/save_data.png"), (0x1480, "sce_sys/trophy2/trophy00.ucp"),
    (0x0402, "sce_sys/nptitle.dat"), (0x2020, "sce_sys/uds/npbind.dat"), ...
];`,
  },
  {
    id: 'uid-access-and-param-rewrite',
    category: 'containers',
    categoryLabel: 'Контейнеры и Доступ',
    targetFile: 'src/cache.rs + src/register.rs + src/main.rs',
    title: 'umask(0), cache::fix_access (STAMP_V=2) и патч upgradable -> standard',
    sceneBasis: 'quer3q/kraken-mount v0.2.1 + ShadowMountPlus copy_param_json_rewrite',
    summary:
      'Выставляет umask(0) на старте, добавляет права чтения (0777 кэши, +0444 файлы, +0555 каталоги) для системных UID сохранений/трофеев и переписывает applicationDrmType=upgradable в standard.',
    snippet: `unsafe { libc::umask(0) }; // в main()
// fix_access: +0777 кэши, +0444 .pkg/файлы, +0555 родители
// register.rs: "upgradable" -> "standard" + chmod 0o666`,
  },
  {
    id: 'retail-y2jb-and-config-alias',
    category: 'scanner-config',
    categoryLabel: 'Сканер и Конфиг',
    targetFile: 'src/main.rs + src/config.rs',
    title: 'Тихий пропуск retail-приложений (Y2JB PPSA01650) и алиас game_fakelib = "disabled"',
    sceneBasis: 'Реальный лог /tmp/ps5_titan_core.log + Y2JB v1.1.0 (PPSA01650)',
    summary:
      'Исключает спам ошибок от retail-подписанного YouTube (PPSA01650). В config.toml принимает "disabled" и "none" как синонимы "off".',
    snippet: `Err(error) if error.contains("a retail package") => {
    log!("Installed retail app {tid}: skipped (not an FPKG)");
}
"off" | "disabled" | "none" => FakelibMode::Off,`,
  },
  {
    id: 'depth2-scan-and-data-games',
    category: 'scanner-config',
    categoryLabel: 'Сканер и Конфиг',
    targetFile: 'src/storage.rs + src/scan.rs',
    title: 'Корни /data/games (<drive>/games) и безопасное сканирование подпапок глубины 2',
    sceneBasis: 'ps5upload v12.5.1–v12.6.7 / пользовательские каталоги',
    summary:
      'Добавляет /data/games и <drive>/games в default_scan_roots() и обходит 1 уровень подпапок (depth 2) внутри scan_paths (кроме backports, titan-core и dot-каталогов).',
    snippet: `let mut all = vec!["/data/homebrew".into(), "/data/games".into(), "/data/etaHEN/games".into()];`,
  },
  {
    id: 'upstream-v1-refresh-and-bundle',
    category: 'upstream-v1',
    categoryLabel: 'База v1.0.0 + Стек',
    targetFile: 'src/updater.rs + ps5/update_http.c + vendor/*',
    title: 'Ребейз на devchmod/TITAN-CORE v1.0.0 (BearSSL апдейтер) + SMP 1.7beta12',
    sceneBasis: 'devchmod/TITAN-CORE v1.0.0 + drakmor/ShadowMountPlus 1.7beta12',
    summary:
      'Нативный HTTPS self-updater с SHA-256 проверкой через BearSSL и безопасным рестартом через elfldr:9021, встроенный ShadowMountPlus 1.7beta12 (v2 config) и kstuff-lite 1.11.',
    snippet: `// vendor/unified/SHA256SUMS:
//   ab9a6cb4... kstuff-lite-v1.11.elf
//   8755172e... shadowmountplus-1.7beta12.elf`,
  },
];

export function filterTitanCorePatches(
  category: TitanCorePatchCategory
): TitanCoreModPatch[] {
  if (category === 'all') {
    return [...TITAN_CORE_MOD_PATCHES];
  }
  return TITAN_CORE_MOD_PATCHES.filter((patch) => patch.category === category);
}
