export type BuiltElfArtifactId =
  | 'TITAN-CORE-v1.0-mod-20261118-v2.2.elf'
  | 'TITAN-CORE-v1.0-mod-20261116.elf'
  | 'kraken-shadow-mix.elf'
  | 'byepv-pxl-v0.1.0.elf';

export interface BuiltElfSpec {
  id: BuiltElfArtifactId;
  label: string;
  shortTag: string;
  defaultPort: number;
  recommended?: boolean;
  summary: string;
  patchFile?: string;
  elfReportFile?: string;
}

export interface BuiltElfDiskInfo extends BuiltElfSpec {
  exists: boolean;
  sizeBytes: number;
  sha256: string | null;
}

export const BUILT_ELF_ARTIFACTS: readonly BuiltElfSpec[] = [
  {
    id: 'TITAN-CORE-v1.0-mod-20261118-v2.2.elf',
    label: 'TITAN-CORE v1.0.2 Mod v2.2 (Compiled 18.11.2026 Unified PS5 13.60)',
    shortTag: 'TITAN-CORE Mod v2.2',
    defaultPort: 9021,
    recommended: true,
    summary:
      'Свежесобранный 2-stage LTO ELF64 (Rust 1.99.0 + PS5 SDK v0.43, 17.25 MB): дебаг-бандл памяти/ошибок (/api/debug/* + last-crash-bundle.json), все 7 форматов дампов, AMPR beta 3ced5c0 (256 MiB PRX), SMP 1.7beta12, kstuff-lite 1.11 с защитой OnionHEN/etaHEN, 16 CNT_FALLBACKS + protected.rs и ps5-dump-forge #62.',
    patchFile: 'TITAN-CORE-v1.0-mod-20261118-v2.2.patch',
    elfReportFile: 'TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt',
  },
  {
    id: 'TITAN-CORE-v1.0-mod-20261116.elf',
    label: 'TITAN-CORE v1.0-refresh + Mod v2 Baseline (16.11.2026)',
    shortTag: 'TITAN-CORE Mod v2',
    defaultPort: 9021,
    summary:
      'Предыдущая сборка Mod v2 ELF (защита OnionHEN/etaHEN, 16 CNT_FALLBACKS, SMP 1.7beta12, AMPR 0.4.1-675b0c6, depth-2).',
    patchFile: 'TITAN-CORE-v1.0-mod-20261116.patch',
    elfReportFile: 'TITAN-CORE-v1.0-mod-20261116.elf.txt',
  },
  {
    id: 'kraken-shadow-mix.elf',
    label: 'KrakenShadow-Mix (801b98e + Stacked UnionFS)',
    shortTag: 'KrakenShadow-Mix',
    defaultPort: 9021,
    summary:
      'Микс kraken-mount (801b98e) со снятой блокировкой shadowmountplus.elf, двухуровневым сканером .pkg и мостом 127.0.0.1:10101.',
    patchFile: 'kraken-shadow-mix.patch',
    elfReportFile: 'kraken-shadow-mix.elf.txt',
  },
  {
    id: 'byepv-pxl-v0.1.0.elf',
    label: 'Byepervisor PXL Helper v0.1.0',
    shortTag: 'byepv-pxl',
    defaultPort: 9021,
    summary:
      'Вспомогательный payload для R&D гипервизора Byepervisor (FW 13.00–13.60, S3 Resume / XOM bypass).',
  },
] as const;

export const BUILT_ELF_ARTIFACT_MAP: Record<BuiltElfArtifactId, BuiltElfSpec> =
  Object.fromEntries(BUILT_ELF_ARTIFACTS.map((spec) => [spec.id, spec])) as Record<
    BuiltElfArtifactId,
    BuiltElfSpec
  >;

export const DEFAULT_BUILT_ELF_ID: BuiltElfArtifactId =
  'TITAN-CORE-v1.0-mod-20261118-v2.2.elf';

export function resolveBuiltElfArtifact(rawId: unknown): BuiltElfSpec {
  if (
    typeof rawId === 'string' &&
    Object.prototype.hasOwnProperty.call(BUILT_ELF_ARTIFACT_MAP, rawId)
  ) {
    return BUILT_ELF_ARTIFACT_MAP[rawId as BuiltElfArtifactId];
  }
  return BUILT_ELF_ARTIFACT_MAP[DEFAULT_BUILT_ELF_ID];
}

export const DOWNLOADABLE_BUILD_FILES: readonly string[] = [
  'TITAN-CORE-v1.0-mod-20261118-v2.2.elf',
  'TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz',
  'TITAN-CORE-v1.0-mod-20261118-v2.2.patch',
  'TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt',
  'TITAN-CORE-README.md',
  'RELEASE-v1.0.2-mod-v2.2.md',
  'SHA256SUMS',
  'TITAN-CORE-v1.0-mod-20261116.elf',
  'TITAN-CORE-v1.0-mod-20261116.patch',
  'TITAN-CORE-v1.0-mod-20261116.elf.txt',
  'kraken-shadow-mix.elf',
  'kraken-shadow-mix.patch',
  'kraken-shadow-mix.elf.txt',
  'byepv-pxl-v0.1.0.elf',
] as const;

export function resolveDownloadableBuildFile(rawName: unknown): string | null {
  if (typeof rawName !== 'string') return null;
  const clean = rawName.trim();
  return DOWNLOADABLE_BUILD_FILES.includes(clean) ? clean : null;
}

export function getBuildDownloadUrl(filename: string): string {
  return `/api/bridge/download-build/${encodeURIComponent(filename)}`;
}
