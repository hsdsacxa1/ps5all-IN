# Prospero 13.60 SDK Studio & TITAN-CORE Mod v2.2 Release

[![PS5 Target](https://img.shields.io/badge/PS5_Target-FW_13.60-006FCD?style=flat-square)](AGENTS.md)
[![TITAN-CORE Fork](https://img.shields.io/badge/TITAN--CORE_Release-v1.0.2--mod--v2.2-10B981?style=flat-square)](public/builds/TITAN-CORE-README.md)
[![Tests](https://img.shields.io/badge/Rust_%2B_TS_Tests-21_%2B_58_Passing-22C55E?style=flat-square)](public/builds/SHA256SUMS)

Full-stack PlayStation 5 (FW 7.00–13.60) development, auditing, reverse-engineering, and live console orchestration workbench, bundling the compiled **TITAN-CORE Mod v2.2 (`TITAN-CORE-v1.0-mod-20261118-v2.2.elf`)** fork release.

---

## `TITAN-CORE Mod v2.2` Fork Release (`public/builds/`)

Pre-built 2-stage LTO ELF64 payload (`TITAN_UNIFIED_STACK=1`, Rust 1.99.0 + `ps5-payload-sdk v0.43`):

- **Compiled ELF64**: [`public/builds/TITAN-CORE-v1.0-mod-20261118-v2.2.elf`](public/builds/TITAN-CORE-v1.0-mod-20261118-v2.2.elf) (`17,254,680` bytes / `16.46 MiB`, SHA-256: `ffb3f6f60a03a40cd24745e47fd240222241fa48b191f1aeda77d9be423f9333`)
- **Fork Source Archive**: [`public/builds/TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz`](public/builds/TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz) (complete patched fork source tree + English `README.md` + verified vendor binaries)
- **Clean Source Patch**: [`public/builds/TITAN-CORE-v1.0-mod-20261118-v2.2.patch`](public/builds/TITAN-CORE-v1.0-mod-20261118-v2.2.patch) (`74,725` bytes, `git apply --check` clean against upstream `devchmod/TITAN-CORE` `2e1f186`)
- **ELF Headers & Dynamic Imports**: [`public/builds/TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt`](public/builds/TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt) (`llvm-readelf -h -d`, 0 forbidden `statvfs`/`statfs` imports)
- **Fork GitHub README**: [`public/builds/TITAN-CORE-README.md`](public/builds/TITAN-CORE-README.md)
- **Release Notes & Tag Manifest**: [`public/builds/RELEASE-v1.0.2-mod-v2.2.md`](public/builds/RELEASE-v1.0.2-mod-v2.2.md)
- **Integrity Manifest**: [`public/builds/SHA256SUMS`](public/builds/SHA256SUMS)
- **Publishing to GitHub Releases**: Run `gh release create` (see [`public/builds/RELEASE-v1.0.2-mod-v2.2.md`](public/builds/RELEASE-v1.0.2-mod-v2.2.md)) or attach the compiled `public/builds/TITAN-CORE-v1.0-mod-20261118-v2.2.elf` in the repository's **Releases -> Create a new release** UI.

### Key Highlights of TITAN-CORE Mod v2.2
- **Memory, Error & Mount Debug Bundle Collectors (`src/debug_bundle.rs`, `src/web.rs`)**:
  - `GET /api/debug/memory` (`libc::getrusage`, FreeBSD `KERN_PROC_VMMAP` via `sysctl`, `libSceAmpr.sprx` mapping verification, `/data` free space)
  - `GET /api/debug/mounts` (`libc::getmntinfo` + `unionfs` `common/lib` double-mount collision detector)
  - `GET /api/debug/error-dump` (256-slot error ring buffer + automatic panic dump to `/data/titan-core/debug/last-crash-bundle.json`)
  - `GET /api/debug/formats` & `POST /api/debug/dump-bundle` (atomic JSON bundle export to `/data/titan-core/debug/titan-debug-latest.json`)
- **All 7 PS5 Dump Formats (`src/dump_formats.rs`)**: `folder-plain`, `folder-lz4`, `folder-zstd`, `pkg-debug-sparse` (plus split `*_0.pkg` warning), `pfs-ffpkg` / `pfs-ffpfsc`, `archive-zstd` / `archive-lz4`, and `image-exfat-img`.
- **Updated Runtimes**: `ampr-emu-ng 0.4.1-3ced5c0` (`256 MiB` PRX pool), `ShadowMountPlus 1.7beta12`, `kstuff-lite v1.11` with an **OnionHEN v0.9.0 / etaHEN 13.60 Guard** preventing duplicate `kstuff` launches.
- **Cryptography & Stability Ports**: 16 `CNT_FALLBACKS` + `protected.rs` (SHA3-256 / AES-128-CBC), `ps5-dump-forge #62` port (`validate_existing_index`), `umask(0)`, `cache::fix_access` (rebuild & fast-path remount), and `applicationDrmType: "upgradable" -> "standard"` auto-patch.

---

## Prospero 13.60 SDK Studio Modules

1. **Architecture Scaffolder & Payload Generator (`scaffolder`)** — Generates `Payload`, `WebUI`, `Native App`, and `Hybrid` project skeletons plus firmware-offset C headers (`4.51–13.60`).
2. **ELF64 / FSELF Research Lab (`elf-research`)** — Byte-level browser parser for ELF64/FSELF headers, dynamic symbols, and 13.60 compatibility audits.
3. **13.60 Pitfall & Stack Auditor (`auditor`)** — Static checks for `statvfs`, TLS constraints, Direct/Flexible memory budgets, and HEN/mounter conflicts.
4. **Knowledge Base, Scene Radar & TITAN-CORE Workbench (`knowledge`)** — Live 109-repo PS5 Scene Radar (18.11.2026), A53/MP4 MMU research (`a53_mmu0.elf`), 3-engine mounter sandbox, and TITAN-CORE Mod v2.2 Release Workbench.
5. **AI Agent Handoff Builder (`handoff`)** — Exports tailored `AGENTS.md`, `CLAUDE.md`, and `.cursor/rules/`.
6. **PS5 Bridge & Agent Bus (`bridge`)** — CORS-free Express proxy for `ps5upload` / `cloudflared`, one-click ELF push to `elfldr:9021`, and AgentBus v2 lock/feed coordination.
7. **Native Ports Studio (`ports`)** — Porting workbench for `PS5_Vulkan` (RADV `gfx1013`), `ps5-opengl`, `RecompStore`, and `ps5proton`.
8. **Dump Patches & Content Mods (`dump-mods`)** — Crash symptom diagnosis, `BackPork`/`fakelib`, DLC unlockers, and XML/SHN patch generators.
9. **Console Hack & CFW Research (`cfw-research`)** — 8-stage reverse-engineering roadmap and `CoreOS` / `SPI NOR` partition blueprint.

---

## Running Locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

Verify build and type-checking:
```bash
npm run build
npm run lint
```
