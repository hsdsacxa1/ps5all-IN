export interface TitanCoreReleaseFile {
  filename: string;
  role: string;
  sizeLabel: string;
  sha256: string;
  primary?: boolean;
}

export const TITAN_CORE_RELEASE_TAG = 'v1.0.2-mod-20261118';

export const TITAN_CORE_RELEASE_FILES: readonly TitanCoreReleaseFile[] = [
  {
    filename: 'TITAN-CORE-v1.0-mod-20261118-v2.2.elf',
    role: 'Compiled PS5 ELF64 (2-stage LTO, Unified Stack)',
    sizeLabel: '17,254,680 B (16.46 MiB)',
    sha256: 'ffb3f6f60a03a40cd24745e47fd240222241fa48b191f1aeda77d9be423f9333',
    primary: true,
  },
  {
    filename: 'TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz',
    role: 'Patched Fork Source + English README + Build Scripts (source-only)',
    sizeLabel: '1,173,429 B (1.12 MiB)',
    sha256: 'c2f19184bbadd54e5d1e9be0bcf32728ca8ae7ce61126a6438f8481a58469655',
  },
  {
    filename: 'TITAN-CORE-v1.0-mod-20261118-v2.2.patch',
    role: 'Clean git diff vs devchmod/TITAN-CORE (2e1f186)',
    sizeLabel: '74,725 B',
    sha256: 'b6f157ffebc7379fe53f91b2ef8808500c1761371e3ac1904346776699ac6b5d',
  },
  {
    filename: 'TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt',
    role: 'llvm-readelf -h -d dynamic library report',
    sizeLabel: '2,584 B',
    sha256: '261e1df67ef466a6877dc1b9c08b987fd087a6b8e34c05b7c6a9f5537fdb4a5f',
  },
  {
    filename: 'TITAN-CORE-README.md',
    role: 'GitHub Repository README.md (English)',
    sizeLabel: '8,898 B',
    sha256: '2951da258899abf9e1a6467e2e5abdfd1427ab6b227be7f9e6bc13074ef51e82',
  },
  {
    filename: 'RELEASE-v1.0.2-mod-v2.2.md',
    role: 'GitHub Release Notes & Tag Manifest (English)',
    sizeLabel: '3,022 B',
    sha256: '287bbadcd0b36d1696dcef891779974236f5e562a0a930e60fb8ca1e44fcf7da',
  },
  {
    filename: 'SHA256SUMS',
    role: 'Release Integrity Checksums',
    sizeLabel: '992 B',
    sha256: 'Verify via sha256sum -c SHA256SUMS',
  },
] as const;

export const TITAN_CORE_GH_RELEASE_CMD = `gh release create ${TITAN_CORE_RELEASE_TAG} \\
  public/builds/TITAN-CORE-v1.0-mod-20261118-v2.2.elf \\
  public/builds/TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz \\
  public/builds/TITAN-CORE-v1.0-mod-20261118-v2.2.patch \\
  public/builds/TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt \\
  public/builds/TITAN-CORE-README.md \\
  public/builds/SHA256SUMS \\
  --title "TITAN-CORE v1.0.2 Mod v2.2 (PS5 13.60 Unified + Debug Bundle)" \\
  --notes-file public/builds/RELEASE-v1.0.2-mod-v2.2.md`;

export const TITAN_CORE_GITHUB_README_PREVIEW = `# TITAN-CORE Mod v2.2 (v1.0.2-mod-20261118) — PS5 7.00–13.60 Unified Mounter & Debug Fork

Upgraded fork of devchmod/TITAN-CORE (v1.0.0, commit 2e1f186) compiled as 2-stage LTO ELF64:
- Built ELF SHA-256: ffb3f6f60a03a40cd24745e47fd240222241fa48b191f1aeda77d9be423f9333 (17,254,680 bytes)
- Source Archive SHA-256: c2f19184bbadd54e5d1e9be0bcf32728ca8ae7ce61126a6438f8481a58469655 (1,173,429 bytes)
- Unified Services: ShadowMountPlus 1.7beta12 + kstuff-lite v1.11 (with OnionHEN/etaHEN guard)
- AMPR Runtime: ampr-emu-ng 0.4.1-3ced5c0 (256 MiB PRX pool, up to 204-208 MiB cache budget)
- Debug Collector: GET /api/debug/memory | /api/debug/mounts | /api/debug/error-dump | /api/debug/formats | POST /api/debug/dump-bundle
- All 7 Dump Formats: folder-plain, folder-lz4, folder-zstd, pkg-debug-sparse (+ split *_0.pkg), pfs-ffpkg/ffpfsc, archive-zst/lz4, image-exfat/img
- Crypto & Fixes: 16 CNT_FALLBACKS + protected.rs (SHA3-256/AES-128-CBC), ps5-dump-forge #62, umask(0), cache::fix_access, param.json standard patch`;
