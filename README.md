<div align="center">

<a href="https://github.com/hsdsacxa1/ps5all-IN/releases/tag/v1.0.5-mod-20261119">
  <img src="./docs/assets/titan-core-plaque.svg" alt="TITAN-CORE Mod v2.5 — PlayStation 5 FW 7.00–13.60 Compiled ELF64" width="100%" />
</a>

<br />

[![PS5 Firmware](https://img.shields.io/badge/PS5_Firmware-7.00--13.60-006FCD?style=for-the-badge)](https://github.com/hsdsacxa1/ps5all-IN/releases/tag/v1.0.5-mod-20261119)
[![Latest Release](https://img.shields.io/badge/Latest-v1.0.5--mod--20261119-10B981?style=for-the-badge)](https://github.com/hsdsacxa1/ps5all-IN/releases/tag/v1.0.5-mod-20261119)
[![Compiled ELF64](https://img.shields.io/badge/ELF64-19.81_MiB-22C55E?style=for-the-badge)](https://github.com/hsdsacxa1/ps5all-IN/releases/download/v1.0.5-mod-20261119/TITAN-CORE-v1.0-mod-20261119-v2.5.elf)
[![Landing Page](https://img.shields.io/badge/Web_Landing-docs%2Findex.html-0EA5E9?style=for-the-badge)](https://hsdsacxa1.github.io/ps5all-IN/)

<h3>Ready-to-Deploy Compiled PS5 ELF64 Unified Game Mounter, Dual AMPR, 4-Thread PKG &amp; Live Diagnostics</h3>

<p>
  <a href="https://github.com/hsdsacxa1/ps5all-IN/releases/download/v1.0.5-mod-20261119/TITAN-CORE-v1.0-mod-20261119-v2.5.elf"><strong>Download Compiled ELF64 (19.81 MiB)</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/hsdsacxa1/ps5all-IN/releases"><strong>Browse Releases by Version</strong></a>
  &nbsp;·&nbsp;
  <a href="#quick-deploy-to-ps5-fw-7001360"><strong>Quick Deploy</strong></a>
  &nbsp;·&nbsp;
  <a href="./docs/index.html"><strong>Interactive Landing</strong></a>
</p>

<img src="./docs/assets/titan-core-hero.jpg" alt="TITAN-CORE Hardware Architecture Render" width="92%" />

</div>

---

## Releases Separated by Version

Each GitHub Release contains **strictly its own version artifacts and dedicated checksum manifest** — zero mixed piles.

| Version | GitHub Release | Primary Artifact | Package Scope | Key Milestone |
| :--- | :--- | :--- | :---: | :--- |
| **Mod v2.5 (Latest)** | [`v1.0.5-mod-20261119`](https://github.com/hsdsacxa1/ps5all-IN/releases/tag/v1.0.5-mod-20261119) | [`TITAN-CORE-v1.0-mod-20261119-v2.5.elf`](https://github.com/hsdsacxa1/ps5all-IN/releases/download/v1.0.5-mod-20261119/TITAN-CORE-v1.0-mod-20261119-v2.5.elf) (`19.81 MiB`) | 6 isolated files | Скомпилированный PS5 ELF64 (20,777,280 B / 19.81 MiB, Entry 0xA8504, clang-19.1.7 + Rust 1.99.0 + SDK v0.43) |
| Mod v2.4 | [`v1.0.4-mod-20261118`](https://github.com/hsdsacxa1/ps5all-IN/releases/tag/v1.0.4-mod-20261118) | [`TITAN-CORE-v1.0-mod-20261118-v2.4.elf`](https://github.com/hsdsacxa1/ps5all-IN/releases/download/v1.0.4-mod-20261118/TITAN-CORE-v1.0-mod-20261118-v2.4.elf) (`16.66 MiB`) | 6 isolated files | Скомпилированный PS5 ELF64 (17,467,672 B / 16.66 MiB, clang-19.1.7 + Rust 1.99.0 + SDK v0.43) |
| Mod v2.3 | [`v1.0.3-mod-20261118`](https://github.com/hsdsacxa1/ps5all-IN/releases/tag/v1.0.3-mod-20261118) | [`TITAN-CORE-v1.0.3-mod-20261118-src.tar.gz`](https://github.com/hsdsacxa1/ps5all-IN/releases/download/v1.0.3-mod-20261118/TITAN-CORE-v1.0.3-mod-20261118-src.tar.gz) (`1.12 MiB`) | 5 isolated files | Google Drive Crash Telemetry (OAuth 2.0 + автономный Webhook для оффлайн-консолей DNS 127.0.0.2) |
| Mod v2.2 | [`v1.0.2-mod-20261118`](https://github.com/hsdsacxa1/ps5all-IN/releases/tag/v1.0.2-mod-20261118) | [`TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz`](https://github.com/hsdsacxa1/ps5all-IN/releases/download/v1.0.2-mod-20261118/TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz) (`1.12 MiB`) | 5 isolated files | Debug API (:8097): /api/debug/memory (KERN_PROC_VMMAP), /api/debug/mounts, /api/debug/error-dump, /api/debug/bundle |

---

## Quick Deploy to PS5 (FW 7.00–13.60)

1. Start `elfldr` on your PS5 (TCP port `9021`) via Y2JB or WebKit.
2. Send the compiled **Mod v2.5** payload directly to your console:

```bash
nc -w 10 <PS5_IP> 9021 < TITAN-CORE-v1.0-mod-20261119-v2.5.elf
```

3. Open the built-in TITAN-CORE WebUI & Diagnostics panel:

```text
http://<PS5_IP>:8097/
```

---

## Core Capabilities (Mod v2.5)

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>Dual AMPR Profiles &amp; No-Downgrade Guard</h3>
      Embeds <code>ampr-emu-ng beta 5443cb2</code> (release + <code>idx</code> debug trace PRX) and <code>modgames44/ampr-emu-ng-MOD 0.5.5</code> with <code>ampr_profile</code>, per-title <code>debug_ampr_titles</code>, and <code>ampr_no_downgrade = true</code>.
    </td>
    <td width="50%" valign="top">
      <h3>4-Thread PKG Extraction &amp; Pre-Flight Guard</h3>
      Parallel PKG extraction (<code>cache_workers = 1..=4</code>, <code>STAMP_V = 4</code>) via <code>std::thread::scope</code> with deterministic <code>BTreeMap</code> indexing and a <code>/data</code> pre-flight free-space check (<code>+64 MiB</code> headroom).
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>Smart PlayGo 0.6 Auto-Detect &amp; SaveData Protection</h3>
      Scans <code>eboot.bin</code> for <code>libScePlayGo</code> imports, upgrades older stubs to bundled <code>drakmor/pgo_stub 0.6</code> without overwriting native PlayGo, and keeps <code>libSceSaveData.native.sprx</code> blocked in <code>keep_fakelib()</code> (<code>#68</code>) alongside <code>dlc_emu 0.3</code>.
    </td>
    <td width="50%" valign="top">
      <h3>Metadata Snapshots, USB Unmount &amp; Live Diagnostics</h3>
      Auto-snapshots <code>/user/app</code> &amp; <code>/user/appmeta</code> with automatic rollback on failed installs, keeps safe <code>POST /api/usb/unmount</code> &amp; 3-region Y2JB guard (<code>PPSA01650/1/2</code>), and adds live <code>/api/debug/system</code>, <code>/api/debug/klog</code>, and <code>/api/debug/dump-forge</code>.
    </td>
  </tr>
</table>

---

## All 7 Supported PS5 Dump Formats

| Format | Extensions / Markers | Backend |
| :--- | :--- | :--- |
| **Plain Folder** | `<TITLE_ID>/eboot.bin` | Native / ShadowMountPlus `1.7beta12` |
| **LZ4 Folder** | `ampr_assets.index` | `ampr-emu-ng beta 5443cb2` / `MOD 0.5.5` (8-byte index `#64`) |
| **Zstandard Folder** | `ampr_zstd.index` | `ampr-emu-ng beta 5443cb2` / `MOD 0.5.5` (8-byte index `#64`) |
| **Debug / Sparse PKG** | `*.pkg` (+ 16 Protected CNT fallbacks) | `titan-core-pkg` 4-thread + mandatory AMPR |
| **PFS Images** | `*.ffpkg`, `*.ffpfsc` | ShadowMountPlus bridge |
| **Compressed Archives** | `*.zst`, `*.lz4` | Direct AMPR mount + magic probe |
| **Disk Images** | `*.exfat`, `*.img` | Read-only VBR probe / external mount |

---

<details>
<summary><strong>Mod v2.5 SHA-256 Checksums &amp; Verification</strong></summary>

| Artifact | Size | SHA-256 |
| :--- | ---: | :--- |
| `TITAN-CORE-v1.0-mod-20261119-v2.5.elf` | `19.81 MiB` | `7457835db11439993f073217939572e5182c07cdf34d8c4dd12c3e3a29a51700` |
| `TITAN-CORE-v1.0.5-mod-20261119-src.tar.gz` | `2.23 MiB` | `7adfb6439ed11cf6b8a6e8bd41d356ab653a0ea15f9698f49ba21ce37acb625b` |
| `TITAN-CORE-v1.0-mod-20261119-v2.5.patch` | `173.3 KiB` | `c2bce4092c7b42e355151a03d52c0d4a7e7a7aa828b784877c571391821e338e` |
| `TITAN-CORE-v1.0-mod-20261119-v2.5.elf.txt` | `2.5 KiB` | `00fac6790e39b2350e9c4423a752673c9531a231677e8719bfb1a07175846368` |

Verify locally:
```bash
sha256sum -c SHA256SUMS-v2.5.txt
```

</details>

<details>
<summary><strong>Built-in HTTP Diagnostics &amp; Crash Telemetry API (:8097)</strong></summary>

- `GET /api/debug/system` — Live CPU load, RAM/RSS, `/data` free space, and process uptime.
- `GET /api/debug/klog` — Safe operational tail capture from `/dev/klog` (or recent TITAN runtime log fallback).
- `GET /api/debug/dump-forge` — Non-blocking TCP health check for local `ps5-dump-forge` on `127.0.0.1:8095`.
- `GET /api/debug/snapshots` &amp; `POST /api/snapshot/restore/<TID>` — Inspect and restore `/user/app` &amp; `/user/appmeta` snapshots.
- `GET /api/debug/memory` &amp; `GET /api/debug/mounts` — `getrusage`, FreeBSD `KERN_PROC_VMMAP`, `libSceAmpr.sprx` check, `unionfs` collision detector.
- `GET /api/debug/error-dump` &amp; `POST /api/debug/dump-bundle` — 256-slot `errno` ring buffer + panic hook dumping `/data/titan-core/debug/last-crash-bundle.json`.
- `GET /api/images/mounts` &amp; `POST /api/images/probe` — Read-only magic detection for `exFAT`, `Zstd`, and `LZ4` containers.
- `POST /api/usb/unmount` — Safe USB drive eject preserving game caches.

</details>

<details>
<summary><strong>Building from Source (clang-19 + Rust 1.99 + ps5-payload-dev/sdk v0.43)</strong></summary>

```bash
tar -xzf TITAN-CORE-v1.0.5-mod-20261119-src.tar.gz
cd TITAN-CORE-v1.0.5-mod-20261119
TITAN_UNIFIED_STACK=1 bash ps5/build.sh
```

Verified: `RUSTFLAGS=-Dwarnings` 0 warnings, `14/14` Rust unit tests passing, 2-stage LTO self-copy ELF64 (Entry `0xA8504`).

</details>

---

## Credits & Upstream Projects

- [`devchmod/TITAN-CORE`](https://github.com/devchmod/TITAN-CORE) — Upstream base (`v1.0.0`)
- [`quer3q/kraken-mount`](https://github.com/quer3q/kraken-mount), [`quer3q/ampr-emu-ng`](https://github.com/quer3q/ampr-emu-ng), [`quer3q/ps5-dump-forge`](https://github.com/quer3q/ps5-dump-forge) — AMPR `5443cb2`, SaveData fix, 8-byte index validation
- [`modgames44/ampr-emu-ng-MOD`](https://github.com/modgames44/ampr-emu-ng-MOD) — Optional AMPR profile `0.5.5`
- [`drakmor/ShadowMountPlus`](https://github.com/drakmor/ShadowMountPlus), [`drakmor/pgo_stub`](https://github.com/drakmor/pgo_stub), `dlc_emu 0.3` — ShadowMountPlus `1.7beta12`, PlayGo Stub `0.6`, DLC emulator PRX
- [`EchoStretch/kstuff-lite`](https://github.com/EchoStretch/kstuff-lite) — `kstuff-lite v1.11`
- [`grimmtroll2285-dot/TITAN`](https://github.com/grimmtroll2285-dot/TITAN) — 3-region Y2JB protection, Schema v1 backports
