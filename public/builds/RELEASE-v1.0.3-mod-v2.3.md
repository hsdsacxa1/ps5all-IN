# Release `v1.0.3-mod-20261118` — TITAN-CORE Mod v2.3 (Google Drive Telemetry + `grimmtroll/TITAN FIX7` Port)

Merged PS5 13.60 release of **TITAN-CORE Mod v2.3** combining our **Mod v2.2** forensics & **`ampr-emu-ng 0.4.1-3ced5c0` (`256 MiB` PRX)** engine with **automatic Google Drive crash/error report uploads** and the top stability & UX improvements from **`grimmtroll2285-dot/TITAN (FIX7 v1.0.5)`**.

All previous **Mod v2.2 (`v1.0.2-mod-20261118`)** and **Mod v2 (`20261116`)** files remain preserved in `public/builds/` and in the release selector.

## New in Mod v2.3

1. **Google Drive Crash & Error Telemetry (`src/debug_bundle.rs` + Google Drive API / Apps Script Webhook)**:
   - Sanitizes IPv4 literals and local paths before serializing `last-crash-bundle.json`, the 256-slot `errno` ring buffer, `KERN_PROC_VMMAP` memory regions, and `getmntinfo()` `unionfs` collision checks into a structured `titan-report-<timestamp>-<titleId>-errno<N>.json` bundle.
   - Supports one-click & automatic upload to **Google Drive** via OAuth 2.0 (`drive.file` scope) in the Workbench as well as a zero-secret **Google Apps Script Web App Webhook** for direct console or browser-relay reporting.
2. **Embedded `drakmor PlayGo Stub 0.6` (`libScePlayGo.sprx`) + Per-Game Checkboxes (`playgo_exclude`)**:
   - Ported from `grimmtroll2285-dot/TITAN (FIX6/FIX7)`: embeds `libScePlayGo.sprx` (`18,150 B`, SHA-256 `f5fdb0ed6cc7413e6dcac79a62e0efd8cfbae04cca0bf932e7a741aed850d213`) with per-title exclusion checkboxes so titles crashing on PlayGo initialization after the main menu work without manual `fakelib` copying.
3. **3-Region Y2JB YouTube Host Protection (`PPSA01650`, `PPSA01651`, `PPSA01652`)**:
   - Ported from `grimmtroll2285-dot/TITAN (FIX3/FIX7)`: excludes US (`PPSA01650`), EU (`PPSA01651`), and JP/Asia (`PPSA01652`) YouTube Title IDs from package preparation, registration, `fakelib` overlays, and updater locks.
4. **`ShadowMountPlus 1.7beta12-titan-isolated4` Ownership & Auto-Uninstall Guard**:
   - Disables the two background `AppUnInstall` call sites in resident ShadowMountPlus, replaces mass fallback registration with targeted per-title registration, and honors per-boot `mount.lnk` ownership.
5. **Soft Sandbox Layer Cleanup without `MNT_FORCE` (`src/launch.rs`)**:
   - Removes timeout `MNT_FORCE` unmounting on `EBUSY` sandbox layers and polls for missed process exits when `NOTE_EXIT` is dropped.
6. **Managed Backports Catalog Schema v1 (`src/backports.rs`)**:
   - Exact 3-part numeric version matching (`01.008.000 == 1.8.0`), firmware range verification, console model filter (`any`/`base`/`pro`), path traversal & protected runtime module guard (`libSceAmpr.sprx`, `libkernel.sprx`), and reboot-deferred rollback (`Current` / `Previous`).

## Release Assets (Mod v2.3 + Preserved Mod v2.2)

- **`TITAN-CORE-v1.0.3-mod-20261118-src.tar.gz`** — `1,174,548` bytes (`1.12 MiB`), SHA-256: `189183ee84d2d12f73c7c3d7e3999291eed7c7460a90389b8e67292dcc68f1de` *(includes `.github/workflows/build.yml` for automated Docker PS5 ELF64 compilation on tag push)*
- **`TITAN-CORE-v1.0-mod-20261118-v2.3.patch`** — `78,992` bytes, SHA-256: `119f42896fb676980e641e06e00117c9f61b05ce78aade03f831c71235e646fb`
- **`TITAN-CORE-v1.0-mod-20261118-v2.3.elf.txt`** — `2,896` bytes, SHA-256: `9aaf09aeba55ab87139ff60ac4c3ab59a4f1bcb0c1b8786bf5c710c1897073bd`
- **`publish-github-release.sh`** — `3,039` bytes, SHA-256: `f9734e088047c2118de6ece4b91e9eeec2e3c619c115a6473859d0958411dc11` *(one-shot `git push --tags` + `gh release create` publisher)*
- **`TITAN-CORE-v1.0-mod-20261118-v2.3.elf`** — Built automatically by `.github/workflows/build.yml` (`TITAN_UNIFIED_STACK=1 bash ps5/build.sh`) when tag `v1.0.3-mod-20261118` is pushed
- **`TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz`** *(Preserved)* — `1,173,429` bytes, SHA-256: `c2f19184bbadd54e5d1e9be0bcf32728ca8ae7ce61126a6438f8481a58469655`
- **`TITAN-CORE-v1.0-mod-20261118-v2.2.patch`** *(Preserved)* — `74,725` bytes, SHA-256: `b6f157ffebc7379fe53f91b2ef8808500c1761371e3ac1904346776699ac6b5d`
- **`TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt`** *(Preserved)* — `2,838` bytes, SHA-256: `c54a6b30d6cbba5bfebe809c22b3994751b5c3b60eb25fff59f1acdf6d885c6c`
