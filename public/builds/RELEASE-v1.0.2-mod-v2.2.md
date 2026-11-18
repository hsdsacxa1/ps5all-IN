# Release `v1.0.2-mod-20261118` — TITAN-CORE Mod v2.2 (Unified PS5 13.60)

Cross-compiled 2-stage LTO build (`TITAN_UNIFIED_STACK=1`) of the **TITAN-CORE Mod v2.2** fork featuring all 7 PS5 dump format classifiers, embedded memory/error/mount debug collectors, and updated **`ampr-emu-ng 0.4.1-3ced5c0`** (`256 MiB` PRX) + **`ShadowMountPlus 1.7beta12`** + **`kstuff-lite v1.11`**.

## Highlights

- **Debug Bundle Collector (`/api/debug/*`)**: `GET /api/debug/memory` (`getrusage` + FreeBSD `KERN_PROC_VMMAP` + `libSceAmpr.sprx`), `GET /api/debug/mounts` (`getmntinfo` `unionfs` collision check), `GET /api/debug/error-dump` (256-slot error ring + panic `last-crash-bundle.json`), `GET /api/debug/formats`, `POST /api/debug/dump-bundle`.
- **All 7 Dump Formats (`src/dump_formats.rs`)**: `folder-plain`, `folder-lz4`, `folder-zstd`, `pkg-debug-sparse` (+ split `*_0.pkg` diagnostic), `pfs-ffpkg` / `pfs-ffpfsc`, `archive-zstd` / `archive-lz4`, `image-exfat-img`.
- **Runtime & Crypto Upgrades**: `ampr-emu-ng 0.4.1-3ced5c0`, `ShadowMountPlus 1.7beta12`, case-insensitive OnionHEN/etaHEN guard, 16 `CNT_FALLBACKS` + `protected.rs` (SHA3-256 / AES-128-CBC), `ps5-dump-forge #62` index validation, `umask(0)`, `cache::fix_access` on fast-path, and `param.json` `upgradable -> standard` patch.

## Release Assets

- **`TITAN-CORE-v1.0-mod-20261118-v2.2.elf`** — `17,254,680` bytes (`16.46 MiB`)
  - SHA-256: `ffb3f6f60a03a40cd24745e47fd240222241fa48b191f1aeda77d9be423f9333`
- **`TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz`** — Complete patched fork source archive + English `README.md` + verified vendor binaries (SHA-256 in `SHA256SUMS`)
- **`TITAN-CORE-v1.0-mod-20261118-v2.2.patch`** — `74,725` bytes (`git apply --check` clean against `2e1f186`)
  - SHA-256: `b6f157ffebc7379fe53f91b2ef8808500c1761371e3ac1904346776699ac6b5d`
- **`TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt`** — `2,584` bytes (`llvm-readelf -h -d`)
  - SHA-256: `261e1df67ef466a6877dc1b9c08b987fd087a6b8e34c05b7c6a9f5537fdb4a5f`
- **`TITAN-CORE-README.md`** — Full GitHub repository `README.md` for the fork
- **`SHA256SUMS`** — Integrity checksums for all release assets

## Build Verification

- `RUSTFLAGS="-Dwarnings" cargo check --workspace --features unified-stack --locked --target x86_64-unknown-freebsd` -> **0 warnings, 0 errors**
- `cargo test` (`titan-core-pkg`, `stack_policy`, `dump_formats`, `debug_bundle`) -> **21/21 passed**
- `llvm-readelf --dyn-syms` -> **0 forbidden `statvfs`/`statfs` dynamic imports**

## Publish to GitHub Releases

```sh
gh release create v1.0.2-mod-20261118 \
  public/builds/TITAN-CORE-v1.0-mod-20261118-v2.2.elf \
  public/builds/TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz \
  public/builds/TITAN-CORE-v1.0-mod-20261118-v2.2.patch \
  public/builds/TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt \
  public/builds/TITAN-CORE-README.md \
  public/builds/SHA256SUMS \
  --title "TITAN-CORE v1.0.2 Mod v2.2 (PS5 13.60 Unified + Debug Bundle)" \
  --notes-file public/builds/RELEASE-v1.0.2-mod-v2.2.md
```
