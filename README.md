# TITAN-CORE Mod v2.4 (`v1.0.4-mod-20261118`)

[![PS5 Firmware](https://img.shields.io/badge/PS5_Firmware-7.00--13.60-006FCD?style=flat-square)](https://github.com/hsdsacxa1/ps5all-IN/releases/tag/v1.0.4-mod-20261118)
[![Release](https://img.shields.io/badge/Release-v1.0.4--mod--20261118-10B981?style=flat-square)](https://github.com/hsdsacxa1/ps5all-IN/releases/tag/v1.0.4-mod-20261118)
[![Compiled ELF64](https://img.shields.io/badge/Binary-PS5_ELF64_(16.66_MiB)-22C55E?style=flat-square)](https://github.com/hsdsacxa1/ps5all-IN/releases/download/v1.0.4-mod-20261118/TITAN-CORE-v1.0-mod-20261118-v2.4.elf)
[![License](https://img.shields.io/badge/Base-devchmod%2FTITAN--CORE-6366F1?style=flat-square)](https://github.com/devchmod/TITAN-CORE)

**TITAN-CORE Mod v2.4** is a ready-to-deploy **compiled PS5 ELF64** unified game mounter, emulator bundle, and diagnostics daemon for PlayStation 5 (**FW 7.00–13.60**), forked from [`devchmod/TITAN-CORE`](https://github.com/devchmod/TITAN-CORE) (`v1.0.0`, commit `2e1f186`).

---

## Direct Download (Compiled PS5 ELF64)

| Artifact | Purpose | Size | SHA-256 |
| :--- | :--- | ---: | :--- |
| **[`TITAN-CORE-v1.0-mod-20261118-v2.4.elf`](https://github.com/hsdsacxa1/ps5all-IN/releases/download/v1.0.4-mod-20261118/TITAN-CORE-v1.0-mod-20261118-v2.4.elf)** | **Compiled 2-Stage LTO PS5 ELF64 (send to `elfldr:9021`)** | `16.66 MiB` | `f7270b26ebfa10c36e37c2aa7910e549bb19d981c34d219ba00621a181c45db2` |
| [`TITAN-CORE-v1.0.4-mod-20261118-src.tar.gz`](https://github.com/hsdsacxa1/ps5all-IN/releases/download/v1.0.4-mod-20261118/TITAN-CORE-v1.0.4-mod-20261118-src.tar.gz) | Complete Mod v2.4 source archive + verified vendor SPRX | `1.49 MiB` | `01943a0f06eedd2726bd5556c41afccea2eebcd77fb2cb27299b2cc0661326ba` |
| [`TITAN-CORE-v1.0-mod-20261118-v2.4.patch`](https://github.com/hsdsacxa1/ps5all-IN/releases/download/v1.0.4-mod-20261118/TITAN-CORE-v1.0-mod-20261118-v2.4.patch) | Cumulative unified diff vs upstream `2e1f186` | `109.8 KiB` | `7874564cb8af54065600c67929412ab69023add05996c7c7f9b8c306c4823275` |
| [`TITAN-CORE-v1.0-mod-20261118-v2.4.elf.txt`](https://github.com/hsdsacxa1/ps5all-IN/releases/download/v1.0.4-mod-20261118/TITAN-CORE-v1.0-mod-20261118-v2.4.elf.txt) | Verified `llvm-readelf -h -d` header & imports report | `2.8 KiB` | `8f82587758107f12103c1d95b08883b07d295887ea48b301e91e21f014a55f7e` |
| [`SHA256SUMS`](https://github.com/hsdsacxa1/ps5all-IN/releases/download/v1.0.4-mod-20261118/SHA256SUMS) | Checksum manifest for all release assets | `1.9 KiB` | Verify via `sha256sum -c SHA256SUMS` |

> All files (including preserved `Mod v2.3` [`v1.0.3-mod-20261118`] and `Mod v2.2` [`v1.0.2-mod-20261118`] archives) are hosted on the [Releases page](https://github.com/hsdsacxa1/ps5all-IN/releases/tag/v1.0.4-mod-20261118).

---

## Quick Deploy to PS5 (FW 7.00–13.60)

1. Start `elfldr` on your PS5 (TCP port `9021`) via Y2JB or WebKit.
2. Send the compiled payload from Linux / macOS / WSL2 / Windows:

```bash
nc -w 10 <PS5_IP> 9021 < TITAN-CORE-v1.0-mod-20261118-v2.4.elf
```

3. Open the TITAN-CORE WebUI in your browser:

```text
http://<PS5_IP>:8097/
```

---

## What's Inside TITAN-CORE Mod v2.4

### 1. SaveData Protection & Emulator Stack (18.11.2026 Evening)
- **Critical SaveData Fix (`#68` / `#64` / `#76`)**: `keep_fakelib()` blocks `libSceSaveData.native.sprx` alongside `libkernel.sprx` so game dump `fakelib/` folders never shadow the console save module or corrupt saves. Bumps `STAMP_V = 3` to auto-refresh existing caches.
- **Bundled `ampr-emu-ng beta 238a72b`**: Verified `libSceAmpr.sprx` (`713,360 B`, SHA-256 `232e57e8228b659a...`) with `ScratchBuffer::reset` `Drop` recursion fix and `256 MiB` PRX pool, plus **mandatory AMPR injection for `.pkg` titles (`#73`)**.
- **Bundled `drakmor dlc_emu 0.3` (`#71`)**: Embeds `libSceAppContent.sprx`, `libSceGameUpdate.sprx`, and `libSceNpEntitlementAccess.sprx`, auto-injected when `dlc_emu.ini` is present (`add_emulators` + `dlc_emu_exclude`).
- **Bundled `PlayGo Stub 0.6`**: Per-title `libScePlayGo.sprx` injection toggle for dumps stalled on chunk checks.
- **8-Byte Aligned `ampr_emu.index` Validation (`ps5-dump-forge #64`)**: Accepts 8-byte aligned hash-slot tables while rejecting 4-byte misaligned offsets.

### 2. Safety, USB Eject & Runtime Isolation
- **Safe USB Unmount (`POST /api/usb/unmount`)**: Cleanly unmounts `/mnt/usb0..7` without wiping `/data/titan-core/caches/<TID>`.
- **`auto_remove_missing = true`**: Hides disconnected USB titles after 5 minutes while preserving caches and protecting all 3 Y2JB regions (`PPSA01650`, `PPSA01651`, `PPSA01652`).
- **`stability_wait_seconds = 10`**: Skips games actively being copied over FTP or `ps5upload`.
- **OnionHEN / etaHEN Guard**: Detects active `OnionHEN` / `etaHEN` / `kstuff` before launching embedded `kstuff-lite v1.11` to avoid kernel panics.
- **Isolated ShadowMountPlus `1.7beta12`**: Soft unmount without `MNT_FORCE` and console-locale title names from `param.json` (`snd0.at9` staged).

### 3. All 7 Supported PS5 Dump Formats
| Format | Extensions / Markers | Backend |
| :--- | :--- | :--- |
| **Plain Folder** | `<TITLE_ID>/eboot.bin` | Native / ShadowMountPlus |
| **LZ4 Folder** | `ampr_assets.index` | `ampr-emu-ng beta 238a72b` |
| **Zstandard Folder** | `ampr_zstd.index` | `ampr-emu-ng beta 238a72b` |
| **Debug / Sparse PKG** | `*.pkg` (+ 16 Protected CNT fallbacks) | `titan-core-pkg` + mandatory AMPR |
| **PFS Images** | `*.ffpkg`, `*.ffpfsc` | ShadowMountPlus bridge |
| **Compressed Archives** | `*.zst`, `*.lz4` | Direct AMPR mount |
| **Disk Images** | `*.exfat`, `*.img` | Loopback / external mount |

### 4. Built-in Diagnostics & Crash Telemetry (`:8097`)
- `GET /api/debug/memory` — `getrusage`, FreeBSD `KERN_PROC_VMMAP` (`sysctl`), `libSceAmpr.sprx` map check, `/data` free space.
- `GET /api/debug/mounts` — `getmntinfo` + `unionfs` `common/lib` collision detector.
- `GET /api/debug/error-dump` — 256-slot `errno` ring buffer + panic hook dumping `/data/titan-core/debug/last-crash-bundle.json`.
- `POST /api/debug/dump-bundle` — Atomic JSON forensics snapshot to `/data/titan-core/debug/titan-debug-latest.json`.
- `POST /api/usb/unmount` — Safe USB drive eject preserving game caches.

---

## Building from Source

```bash
tar -xzf TITAN-CORE-v1.0.4-mod-20261118-src.tar.gz
cd TITAN-CORE-v1.0.4-mod-20261118
TITAN_UNIFIED_STACK=1 bash ps5/build.sh
```

Toolchain verified for this release: `clang-19.1.7`, `lld-19.1.7`, `Rust 1.99.0`, `ps5-payload-dev/sdk v0.43` (`RUSTFLAGS=-Dwarnings` 0 warnings, `cargo test -p titan-core-pkg` 8/8 passing).

---

## Credits & Upstream Projects

- [`devchmod/TITAN-CORE`](https://github.com/devchmod/TITAN-CORE) — Upstream base (`v1.0.0`)
- [`quer3q/kraken-mount`](https://github.com/quer3q/kraken-mount), [`quer3q/ampr-emu-ng`](https://github.com/quer3q/ampr-emu-ng), [`quer3q/ps5-dump-forge`](https://github.com/quer3q/ps5-dump-forge) — SaveData fix, AMPR `238a72b`, 8-byte index validation
- [`drakmor/ShadowMountPlus`](https://github.com/drakmor/ShadowMountPlus) & `dlc_emu 0.3` — ShadowMountPlus `1.7beta12` & DLC emulator PRX
- [`EchoStretch/kstuff-lite`](https://github.com/EchoStretch/kstuff-lite) — `kstuff-lite v1.11`
- [`grimmtroll2285-dot/TITAN`](https://github.com/grimmtroll2285-dot/TITAN) — PlayGo Stub `0.6`, 3-region Y2JB protection, Schema v1 backport ideas
