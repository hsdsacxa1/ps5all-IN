# TITAN-CORE Mod v2.3 (`v1.0.3-mod-20261118`) + Preserved Mod v2.2 — PS5 7.00–13.60 Unified Mounter & Cloud Telemetry Fork

[![PS5 Firmware](https://img.shields.io/badge/PS5_FW-7.00_--_13.60-006FCD?style=flat-square)](https://github.com/devchmod/TITAN-CORE)
[![Rust](https://img.shields.io/badge/Rust-1.99.0_x86__64--ps5--freebsd-DEA584?style=flat-square&logo=rust)](ps5/x86_64-ps5-freebsd.json)
[![AMPR](https://img.shields.io/badge/ampr--emu--ng-0.4.1--3ced5c0_(256MiB)-10B981?style=flat-square)](https://github.com/quer3q/ampr-emu-ng)
[![SMP](https://img.shields.io/badge/ShadowMountPlus-1.7beta12--isolated4-6366F1?style=flat-square)](https://github.com/drakmor/ShadowMountPlus)
[![PlayGo](https://img.shields.io/badge/PlayGo_Stub-0.6_Embedded-F59E0B?style=flat-square)](https://github.com/drakmor/playgo-stub)
[![License: GPL v3](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg?style=flat-square)](LICENSE)

Upgraded fork of **[devchmod/TITAN-CORE](https://github.com/devchmod/TITAN-CORE)** (`v1.0.0`, commit `2e1f186`) combining our **Mod v2.2** forensics & **`ampr-emu-ng 0.4.1-3ced5c0` (`256 MiB` PRX)** engine with **automatic Google Drive crash/error telemetry** and the top stability & UX improvements ported from **[grimmtroll2285-dot/TITAN (FIX7 v1.0.5)](https://github.com/grimmtroll2285-dot/TITAN)**.

All previous **Mod v2.2 (`v1.0.2-mod-20261118`)** release artifacts are preserved alongside `Mod v2.3`.

---

## What's New in Mod v2.3 (`v1.0.3-mod-20261118`)

1. **Google Drive Crash & Error Report Telemetry (`src/debug_bundle.rs`, `POST /api/debug/report-gdrive`)**:
   - Captures `libc::getrusage(RUSAGE_SELF)`, FreeBSD `KERN_PROC_VMMAP`, `getmntinfo()` `unionfs` collision checks, and the 256-slot `errno` ring buffer (`last-crash-bundle.json` on `panic!`).
   - Redacts local IPv4 addresses before uploading via **Google Drive OAuth 2.0 (`drive.file`)** in the Workbench or autonomously from the console via a zero-secret **Google Apps Script Web App Webhook** (`/data/titancore/gdrive_webhook.toml`).
2. **Embedded `drakmor PlayGo Stub 0.6` (`libScePlayGo.sprx`) + Per-Title `playgo_exclude`**:
   - Ported from `grimmtroll2285-dot/TITAN (FIX6/FIX7)`: injects `sce_module/libScePlayGo.sprx` automatically for titles crashing on PlayGo initialization after the title screen, with per-title exclusion checkboxes (`playgo_exclude`).
3. **3-Region Y2JB YouTube Host Protection (`PPSA01650`, `PPSA01651`, `PPSA01652`)**:
   - Protects US, EU, and JP/Asia YouTube containers from accidental `unionfs`/`nullfs` overlays, unmounts, or updater mutations.
4. **`ShadowMountPlus 1.7beta12-titan-isolated4` Ownership & Auto-Uninstall Guard**:
   - Disables the two background `AppUnInstall` call sites in resident `ShadowMountPlus` so game icons are not wiped from `SceShellCore` after Rest Mode.
5. **Soft Sandbox Layer Cleanup without `MNT_FORCE` (`src/launch.rs`)**:
   - Removes timeout `MNT_FORCE` unmounting on `EBUSY` sandbox layers to prevent FreeBSD 11 VFS kernel panics on FW 13.60.
6. **Managed Backports Catalog Schema v1 (`src/backports.rs`)**:
   - Exact 3-part numeric version matching (`01.008.000 == 1.8.0`), firmware range & console model filtering (`any`/`base`/`pro`), path traversal blocking, and protected runtime module guard (`libSceAmpr.sprx`, `libkernel.sprx`, `libc.prx`).

---

## Inherited from Mod v2.2 (`v1.0.2-mod-20261118` — Preserved)

- **All 7 PS5 Dump Formats** (`src/dump_formats.rs`): `folder-plain`, `folder-lz4`, `folder-zstd`, `pkg-debug-sparse` (plus split `*_0.pkg` diagnostics), `pfs-ffpkg` / `pfs-ffpfsc`, `.zst`/`.lz4` archives, and `.exfat`/`.img` images.
- **16 `CNT_FALLBACKS` + `protected.rs`**: SHA3-256 + AES-128-CBC decryption for protected `sce_sys` containers.
- **`ampr-emu-ng 0.4.1-3ced5c0`**: `256 MiB` PRX pool (204–208 MiB cache budget) + `ps5-dump-forge #62` strict index validation.
- **OnionHEN v0.9.0 / etaHEN 13.60 Guard**: Never launches a duplicate `kstuff-lite` over an active HEN.

---

## Automatic PS5 ELF64 Build & GitHub Release Pipeline

Pushing tag `v1.0.3-mod-20261118` runs `.github/workflows/build.yml`:
1. **`check` job**: Runs `cargo check --workspace --features unified-stack --locked --target x86_64-unknown-freebsd` and `node --check` on `src/ui.html`.
2. **`payload` job**: Builds `TITAN-CORE-v1.0-mod-20261118-v2.3.elf` via `TITAN_UNIFIED_STACK=1 bash ps5/build.sh` inside Docker (`Rust 1.99.0` + `ps5-payload-sdk`).
3. **`release` job**: Verifies `sha256sum -c SHA256SUMS` and attaches the compiled ELF64 binary, `SHA256SUMS`, and `RELEASE-v1.0.3-mod-v2.3.md` to the GitHub Release.

---

## Quick Start (PS5 7.00–13.60)

```sh
# 1. Verify checksums
sha256sum -c SHA256SUMS --ignore-missing

# 2. Push ELF payload via elfldr (TCP 9021)
nc -w 10 <PS5_IP> 9021 < TITAN-CORE-v1.0-mod-20261118-v2.3.elf

# 3. Open WebUI and capture diagnostics
open http://<PS5_IP>:8097/
curl -s http://<PS5_IP>:8097/api/debug/bundle | jq .
```

> **WARNING:** `TITAN-CORE` (`TITAN_UNIFIED_STACK=1`) already embeds `kstuff-lite v1.11` and `ShadowMountPlus 1.7beta12-titan-isolated4`. Do **not** run a standalone `shadowmountplus.elf` alongside it. Close any running game before sending a new `.elf`.

---

## License & Credits

Distributed under **GPL-3.0-or-later** (`LICENSE`, `CREDITS.md`, `THIRD_PARTY_NOTICES`).
- **Upstream Base**: `devchmod/TITAN-CORE`
- **FIX7 Features Ported**: `grimmtroll2285-dot/TITAN` (`SirenaGoloviy`), `drakmor/playgo-stub`, `drakmor/ShadowMountPlus`
- **AMPR & Dump Forensics**: `quer3q/ampr-emu-ng`, `quer3q/kraken-mount`, `quer3q/ps5-dump-forge`, `EchoStretch/kstuff-lite`
