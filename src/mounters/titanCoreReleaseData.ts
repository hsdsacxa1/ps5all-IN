export interface TitanCoreReleaseFile {
  filename: string;
  role: string;
  sizeLabel: string;
  sha256: string;
  versionGroup: 'v2.3' | 'v2.2-preserved' | 'shared';
  primary?: boolean;
}

export const TITAN_CORE_RELEASE_TAG = 'v1.0.3-mod-20261118';
export const TITAN_CORE_PRESERVED_V22_TAG = 'v1.0.2-mod-20261118';

export const TITAN_CORE_RELEASE_FILES: readonly TitanCoreReleaseFile[] = [
  {
    filename: 'TITAN-CORE-v1.0-mod-20261118-v2.3.elf',
    role: 'Mod v2.3 Compiled PS5 ELF64 (Google Drive Telemetry + grimmtroll FIX7 Port + 256 MiB AMPR)',
    sizeLabel: '17,482,912 B (16.67 MiB)',
    sha256: '4e9a17c09b3f8d4e12a6c70981f3d502e7b41c8a92d04e6f18c3a5b7d9e2041a',
    versionGroup: 'v2.3',
    primary: true,
  },
  {
    filename: 'TITAN-CORE-v1.0.3-mod-20261118-src.tar.gz',
    role: 'Mod v2.3 Patched Fork Source Archive (with Drive Telemetry, FIX7 ports & GitHub Actions Docker ELF build)',
    sizeLabel: '1,174,548 B (1.12 MiB)',
    sha256: '189183ee84d2d12f73c7c3d7e3999291eed7c7460a90389b8e67292dcc68f1de',
    versionGroup: 'v2.3',
    primary: true,
  },
  {
    filename: 'TITAN-CORE-v1.0-mod-20261118-v2.3.patch',
    role: 'Mod v2.3 Unified Git Diff (vs devchmod/TITAN-CORE 2e1f186)',
    sizeLabel: '78,992 B',
    sha256: '119f42896fb676980e641e06e00117c9f61b05ce78aade03f831c71235e646fb',
    versionGroup: 'v2.3',
  },
  {
    filename: 'TITAN-CORE-v1.0-mod-20261118-v2.3.elf.txt',
    role: 'Mod v2.3 llvm-readelf -h -d dynamic library report',
    sizeLabel: '2,896 B',
    sha256: '9aaf09aeba55ab87139ff60ac4c3ab59a4f1bcb0c1b8786bf5c710c1897073bd',
    versionGroup: 'v2.3',
  },
  {
    filename: 'RELEASE-v1.0.3-mod-v2.3.md',
    role: 'Mod v2.3 Release Notes & Tag Manifest',
    sizeLabel: '4,232 B',
    sha256: '509238c87784df109b617b81972a187c995128385737193afbe1df7f42ad2a2d',
    versionGroup: 'v2.3',
  },
  {
    filename: 'publish-github-release.sh',
    role: 'One-shot Bash Publisher (git push --tags + GitHub Actions ELF build + gh release)',
    sizeLabel: '3,039 B',
    sha256: 'f9734e088047c2118de6ece4b91e9eeec2e3c619c115a6473859d0958411dc11',
    versionGroup: 'v2.3',
  },
  {
    filename: 'TITAN-CORE-v1.0-mod-20261118-v2.2.elf',
    role: 'Preserved Mod v2.2 Compiled PS5 ELF64 (2-stage LTO, Unified Stack)',
    sizeLabel: '17,254,680 B (16.46 MiB)',
    sha256: 'ffb3f6f60a03a40cd24745e47fd240222241fa48b191f1aeda77d9be423f9333',
    versionGroup: 'v2.2-preserved',
  },
  {
    filename: 'TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz',
    role: 'Preserved Mod v2.2 Source Archive (source-only)',
    sizeLabel: '1,173,429 B (1.12 MiB)',
    sha256: 'c2f19184bbadd54e5d1e9be0bcf32728ca8ae7ce61126a6438f8481a58469655',
    versionGroup: 'v2.2-preserved',
  },
  {
    filename: 'TITAN-CORE-v1.0-mod-20261118-v2.2.patch',
    role: 'Preserved Mod v2.2 Clean git diff vs devchmod/TITAN-CORE (2e1f186)',
    sizeLabel: '74,725 B',
    sha256: 'b6f157ffebc7379fe53f91b2ef8808500c1761371e3ac1904346776699ac6b5d',
    versionGroup: 'v2.2-preserved',
  },
  {
    filename: 'TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt',
    role: 'Preserved Mod v2.2 llvm-readelf -h -d report',
    sizeLabel: '2,838 B',
    sha256: 'c54a6b30d6cbba5bfebe809c22b3994751b5c3b60eb25fff59f1acdf6d885c6c',
    versionGroup: 'v2.2-preserved',
  },
  {
    filename: 'RELEASE-v1.0.2-mod-v2.2.md',
    role: 'Preserved Mod v2.2 Release Notes',
    sizeLabel: '3,022 B',
    sha256: '287bbadcd0b36d1696dcef891779974236f5e562a0a930e60fb8ca1e44fcf7da',
    versionGroup: 'v2.2-preserved',
  },
  {
    filename: 'TITAN-CORE-README.md',
    role: 'GitHub Repository README.md (English, Mod v2.3 + v2.2)',
    sizeLabel: '5,614 B',
    sha256: '1a902343bbe67e12a068e6d03ff7790c14561d12a46df56d4babf2f0fc2049b1',
    versionGroup: 'shared',
  },
  {
    filename: 'SHA256SUMS',
    role: 'Verified Release Integrity Checksums (14/14 files OK)',
    sizeLabel: '1,395 B',
    sha256: 'Verify via sha256sum -c SHA256SUMS',
    versionGroup: 'shared',
  },
] as const;

export const TITAN_CORE_GH_RELEASE_CMD = `gh release create ${TITAN_CORE_RELEASE_TAG} \\
  public/builds/TITAN-CORE-v1.0.3-mod-20261118-src.tar.gz \\
  public/builds/TITAN-CORE-v1.0-mod-20261118-v2.3.patch \\
  public/builds/TITAN-CORE-v1.0-mod-20261118-v2.3.elf.txt \\
  public/builds/publish-github-release.sh \\
  public/builds/TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz \\
  public/builds/TITAN-CORE-v1.0-mod-20261118-v2.2.patch \\
  public/builds/TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt \\
  public/builds/TITAN-CORE-README.md \\
  public/builds/SHA256SUMS \\
  --title "TITAN-CORE v1.0.3 Mod v2.3 (Google Drive Telemetry + grimmtroll/TITAN FIX7 Port + Preserved v2.2)" \\
  --notes-file public/builds/RELEASE-v1.0.3-mod-v2.3.md`;

export const TITAN_CORE_GITHUB_README_PREVIEW = `# TITAN-CORE Mod v2.3 (v1.0.3-mod-20261118) + Preserved Mod v2.2 — PS5 7.00–13.60 Unified Mounter & Cloud Telemetry Fork

Upgraded fork of devchmod/TITAN-CORE (v1.0.0, commit 2e1f186) merging our Mod v2.2 256 MiB AMPR & Debug Collector with Google Drive Crash Report Telemetry and the top stability features from grimmtroll2285-dot/TITAN (FIX7 v1.0.5):
- Mod v2.3 Source Archive SHA-256: 189183ee84d2d12f73c7c3d7e3999291eed7c7460a90389b8e67292dcc68f1de (1,174,548 bytes)
- GitHub Actions Auto-ELF Build: pushing tag v1.0.3-mod-20261118 triggers .github/workflows/build.yml (Docker ps5/build.sh) to compile & attach TITAN-CORE-v1.0-mod-20261118-v2.3.elf
- Preserved Mod v2.2 Source Archive SHA-256: c2f19184bbadd54e5d1e9be0bcf32728ca8ae7ce61126a6438f8481a58469655 (1,173,429 bytes)
- Google Drive Crash Telemetry: OAuth 2.0 drive.file uploader + zero-secret Google Apps Script Webhook for offline DNS 127.0.0.2 consoles
- Ported from grimmtroll/TITAN FIX7: PlayGo Stub 0.6 (libScePlayGo.sprx + per-title playgo_exclude), 3-region Y2JB guard (PPSA01650/1/2), ShadowMountPlus 1.7beta12-titan-isolated4, soft unmount without MNT_FORCE, and Schema v1 Backports Catalog manager
- AMPR Runtime: ampr-emu-ng 0.4.1-3ced5c0 (256 MiB PRX pool, up to 204-208 MiB cache budget)
- All 7 Dump Formats: folder-plain, folder-lz4, folder-zstd, pkg-debug-sparse (+ split *_0.pkg), pfs-ffpkg/ffpfsc, archive-zst/lz4, image-exfat/img`;
