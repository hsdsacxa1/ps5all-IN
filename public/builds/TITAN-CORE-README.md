# TITAN-CORE Mod v2.2 (`v1.0.2-mod-20261118`) — PS5 7.00–13.60 Unified Game Mounter & Debug Fork

[![PS5 Firmware](https://img.shields.io/badge/PS5_FW-7.00_--_13.60-006FCD?style=flat-square)](https://github.com/devchmod/TITAN-CORE)
[![Rust](https://img.shields.io/badge/Rust-1.99.0_x86__64--ps5--freebsd-DEA584?style=flat-square&logo=rust)](ps5/x86_64-ps5-freebsd.json)
[![AMPR](https://img.shields.io/badge/ampr--emu--ng-0.4.1--3ced5c0_(256MiB)-10B981?style=flat-square)](https://github.com/quer3q/ampr-emu-ng)
[![SMP](https://img.shields.io/badge/ShadowMountPlus-1.7beta12-6366F1?style=flat-square)](https://github.com/drakmor/ShadowMountPlus)
[![License: GPL v3](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg?style=flat-square)](LICENSE)

Upgraded fork of **[devchmod/TITAN-CORE](https://github.com/devchmod/TITAN-CORE)** (`v1.0.0`, commit `2e1f186`) delivering the complete **Mod v2.2 (2026-11-18)** stack:
- Built-in **memory, crash, and unionfs collision debug bundle collector** (`/api/debug/*` + automatic `panic!` crash dump);
- Full classification and inventory across **all 7 PS5 dump formats** (`folder`, `lz4`, `zstd`, `pkg` / split `*_0.pkg`, `ffpkg` / `ffpfsc`, `.zst`/`.lz4` archives, `.exfat`/`.img`);
- **OnionHEN v0.9.0 / etaHEN 13.60 Guard** preventing duplicate `kstuff` launches;
- Decryption for **16 protected `sce_sys` containers** (`protected.rs`, SHA3-256 + AES-128-CBC);
- Updated embedded runtimes: **`ampr-emu-ng 0.4.1-3ced5c0`** (`256 MiB` PRX pool) and **`ShadowMountPlus 1.7beta12`**.

---

## Release Assets (`v1.0.2-mod-20261118`)

| File | Size | SHA-256 | Purpose |
| :--- | ---: | :--- | :--- |
| `TITAN-CORE-v1.0-mod-20261118-v2.2.elf` | 17,254,680 B (16.46 MiB) | `ffb3f6f60a03a40cd24745e47fd240222241fa48b191f1aeda77d9be423f9333` | Compiled 2-stage LTO `self-copy` ELF64 (`TITAN_UNIFIED_STACK=1`) |
| `TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz` | Complete Fork Archive | See `SHA256SUMS` | Full patched fork source tree + English `README.md` + verified vendor binaries |
| `TITAN-CORE-v1.0-mod-20261118-v2.2.patch` | 74,725 B | `b6f157ffebc7379fe53f91b2ef8808500c1761371e3ac1904346776699ac6b5d` | Clean `git diff` against upstream `2e1f186` (`git apply --check` OK) |
| `TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt` | 2,584 B | `261e1df67ef466a6877dc1b9c08b987fd087a6b8e34c05b7c6a9f5537fdb4a5f` | `llvm-readelf -h -d` dynamic imports & ELF64 headers report |
| `SHA256SUMS` | — | — | Verification manifest for all release artifacts |

---

## What's New in Mod v2.2 vs Upstream TITAN-CORE v1.0.0

1. **Memory, Error & Mount Debug Bundle Collector (`src/debug_bundle.rs`, `src/web.rs`)**:
   - **`GET /api/debug/memory`** — Captures `libc::getrusage(RUSAGE_SELF)` (RSS KiB/MiB, minor/major page faults, context switches), walks FreeBSD `sysctl([CTL_KERN, KERN_PROC, KERN_PROC_VMMAP, pid])` to count VM regions and verify `libSceAmpr.sprx` memory mapping, and reports `/data` free capacity.
   - **`GET /api/debug/mounts`** — Queries kernel mount entries via `libc::getmntinfo(MNT_NOWAIT)` and flags duplicate `unionfs` `common/lib` mount collisions.
   - **`GET /api/debug/error-dump`** — Bounded **256-slot error ring buffer** (`ts_ms`, `title_id`, `errno`, `message`) plus `/data/titan-core/debug/last-crash-bundle.json`, written automatically by a custom `panic_hook` before aborting.
   - **`GET /api/debug/formats`** — Full inventory of discovered dump formats across all scanned storage roots with recommended mount engines.
   - **`POST /api/debug/dump-bundle`** (plus `GET /api/debug/bundle` alias) — Atomically persists `/data/titan-core/debug/titan-debug-latest.json`.
2. **All 7 PS5 Dump Formats (`src/dump_formats.rs`, `src/library.rs`, `src/scan.rs`)**:
   - Unpacked folder (`eboot.bin + sce_sys/param.json`) -> `folder-plain` (`titan-native`)
   - LZ4-packed folder (`ampr_assets.index`) -> `folder-lz4` (`titan-native`)
   - Zstd-packed folder (`ampr_zstd.index` / `apr.zstd.chunks`) -> `folder-zstd` (`titan-native`)
   - Debug / Sparse / 16-Protected-CNT FPKG (`.pkg`) with USB/M.2 `/homebrew/` & `/games/` auto-discovery -> `pkg-debug-sparse` (`titan-native`)
   - Split FPKG parts (`*_0.pkg`, `*_1.pkg`) -> `pkg-split-part` (emits a diagnostic warning without crashing the scanner)
   - UFS2 / compressed PFS images (`.ffpkg`, `.ffpfsc`) -> `pfs-ffpkg` / `pfs-ffpfsc` (`shadowmountplus-1.7b12`)
   - Compressed archives & disk images (`.zst`, `.zstd`, `.lz4`, `.exfat`, `.img`) -> `archive-zstd` / `archive-lz4` / `image-exfat-img`
3. **Ports from `ps5-dump-forge` and `kraken-mount v0.2.1`**:
   - **16 `CNT_FALLBACKS` + `protected.rs`**: Decrypts protected `flags1` bit-31 containers (`nptitle.dat`, `uds/npbind.dat`, `trophy2/npbind.dat`, `save_data.png`, `trophy00.ucp`, `uds00.ucp`, `pic0/1/2`, `snd0.at9`) via `SHA3-256 + AES-128-CBC`.
   - **`ps5-dump-forge #62` Port**: `validate_existing_index()` in `src/cache.rs` logs exact byte size and failure reason for corrupt `ampr_emu.index` files instead of silently ignoring `.ok()`, marking broken caches for rebuild.
   - **`ampr-emu-ng 0.4.1-3ced5c0`**: `256 MiB` PRX pool (204–208 MiB effective cache budget), `kept index fd` close guard, and stale `/data/ampr_cache` cleanup in `prepare_ampr()`.
   - **Permissions & Metadata**: `umask(0)`, `cache::fix_access` on both rebuild and fast-path remount (`STAMP_V = 2`), and automatic `applicationDrmType: "upgradable" -> "standard"` patching in `param.json`.
4. **Safe Unified Stack for PS5 13.60**:
   - Embedded **`ShadowMountPlus 1.7beta12`** (`SHA-256: 8755172e...9b1bd`) + **`kstuff-lite v1.11`**.
   - **OnionHEN / etaHEN Guard**: Case-insensitive `dependency_presence()` recognizes `kstuff`, `ps5-kstuff`, `onionhen`, and `etahen` processes and **never launches a duplicate `kstuff-lite`** over an active HEN.
   - Quiet skip for retail-signed apps (including `Y2JB PPSA01650` YouTube) with zero log spam.
   - Depth-2 directory scan across `/data/games`, `/mnt/usb*/games`, and `/mnt/ext*/games` plus `game_fakelib = "disabled" | "none"` config aliases.

---

## Compatibility & Important Warning

> **WARNING:** `TITAN-CORE Mod v2.2` is compiled with `TITAN_UNIFIED_STACK=1` and **already bundles** `kstuff-lite v1.11` and `ShadowMountPlus 1.7beta12`.
> - **Do NOT manually run** a standalone `shadowmountplus.elf` before or after `TITAN-CORE`.
> - If you run **OnionHEN v0.9.0** or **etaHEN 13.60**, keep them active before sending `TITAN-CORE` — the built-in `OnionHEN/etaHEN Guard` will skip `kstuff-lite` and start only `ShadowMountPlus 1.7beta12`.
> - Always close any running game before pushing an updated `.elf` over `elfldr` (port `9021`).

---

## Quick Start (PS5 7.00–13.60)

1. Verify the downloaded release checksums:
   ```sh
   sha256sum -c SHA256SUMS --ignore-missing
   ```
2. Send `TITAN-CORE-v1.0-mod-20261118-v2.2.elf` to the console via `elfldr` (port `9021`):
   ```sh
   nc -w 10 <PS5_IP> 9021 < TITAN-CORE-v1.0-mod-20261118-v2.2.elf
   ```
3. Open the WebUI in a browser: `http://<PS5_IP>:8097/`.
4. Capture a full memory, mount, and error debug bundle (up to 256 error entries):
   ```sh
   curl -s http://<PS5_IP>:8097/api/debug/bundle | jq .
   ```
   Bundles are also saved locally on the console at `/data/titan-core/debug/titan-debug-latest.json` (and `/data/titan-core/debug/last-crash-bundle.json` on panic).

---

## Building from Source (Rust 1.99.0 + `ps5-payload-sdk v0.43`)

Prerequisites: `clang-19`, `lld-19`, `llvm-19`, `rustup` (`1.99.0` + `rust-src`), `ps5-payload-sdk v0.43` at `/opt/ps5-payload-sdk`.

```sh
git clone https://github.com/devchmod/TITAN-CORE.git
cd TITAN-CORE
git apply TITAN-CORE-v1.0-mod-20261118-v2.2.patch

# Update vendor binaries to verified releases:
curl -fsSL https://github.com/quer3q/ampr-emu-ng/releases/download/beta/libSceAmpr.sprx -o vendor/ampr-emu-ng/libSceAmpr.sprx
curl -fsSL https://github.com/drakmor/ShadowMountPlus/releases/download/1.7beta12/shadowmountplus.elf -o vendor/unified/shadowmountplus-1.7beta12.elf
rm -f vendor/unified/shadowmountplus-1.7beta10.elf

# Run unit tests & FreeBSD target verification:
RUSTFLAGS="-Dwarnings" cargo test -p titan-core-pkg --locked
RUSTFLAGS="-Dwarnings" cargo check --workspace --features unified-stack --locked --target x86_64-unknown-freebsd

# 2-stage LTO cross-compile (TITAN_UNIFIED_STACK=1):
RUSTUP_TOOLCHAIN=1.99.0 TITAN_UNIFIED_STACK=1 CARGO_BUILD_JOBS=2 bash ps5/build.sh --inside
```

---

## License & Credits

Distributed under **GPL-3.0-or-later** (`LICENSE`, `CREDITS.md`, `THIRD_PARTY_NOTICES`).
- **Upstream Base**: `devchmod/TITAN-CORE`
- **Unified Services**: `EchoStretch/kstuff-lite v1.11`, `drakmor/ShadowMountPlus 1.7beta12`
- **Runtime & Protected CNT / Sparse Diagnostics**: `quer3q/ampr-emu-ng (0.4.1-3ced5c0)`, `quer3q/kraken-mount`, `quer3q/ps5-dump-forge`
- **Mod v2 / v2.2 Integration & Debug Forensics**: `Prospero 13.60 Studio`
