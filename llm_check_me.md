# Project Architecture, Structure & Synchronization Specification (`llm_check_me.md`)

## 1. Project Overview
**Prospero 13.60 SDK Studio & Agent Handoff** is a full-stack Express + Vite + React developer workbench and binary research platform for PlayStation 5 (Firmware 13.60, baseline 16.11.2026) application engineering.

It organizes PS5 13.60 development and live console operations into eight decoupled, polymorphic functional modules:
1. **Architecture Scaffolder & Payload Generator (`scaffolder`)**: Generates production-ready MVP skeletons, `Makefile` / `CMakeLists.txt`, `sce_sys/param.json`, C/C++ entrypoints (`eboot.bin` / `*.elf` / `helper.elf`), `check-title-imports.py`, FTP / `elfldr:9021` deployment pipelines for all 4 PS5 13.60 architectures, and an integrated **Payload Generator** (`PayloadGeneratorPanel`) that targets PS5 firmware offsets (`4.51–13.60`) to output C-header templates (`ps5_payload_offsets.h`) for standard ELF loader payloads.
2. **ELF64 / FSELF Binary Research Lab (`elf-research`)**: Byte-level `Uint8Array` / `DataView` binary inspector for uploaded `.elf`, `eboot.bin`, `.prx`, and `.sprx` files (plus synthetic 13.60 binary samples) with automated 13.60 binary compatibility audits.
3. **13.60 Pitfall & Stack Auditor (`auditor`)**: Static analyzer for C/C++ sources, `param.json` memory budgets (`Direct` vs `Flexible` memory), `icon0.png` 512x512 RGB non-alpha rules, and HEN / Mounter runtime conflict matrices.
4. **Knowledge Base, Live Scene Radar & Unified Mounters Workbench (`knowledge`)**: Interactive explorer for the **18.11.2026 PS5 Scene News, 109-Repository Audit & New Discoveries Radar (`SceneRadarPanel` + `LiveRadarSyncBar`)**, 13.60 exploit chain, runtime stack, **TITAN-CORE v1.0-refresh + Mod v2 Fork Workbench (`TitanCoreModPanel`)**, **KrakenShadow-Mix Unified Patch & Build Studio**, code-level diagnostics, 3-engine Mounter Sandbox (`KrakenShadow-Mix`, `Kraken Mount v0.2.1 / v0.0.1-beta`, `ShadowMountPlus v1.7beta12`), and reference repositories (`AnyPS5`, `AnyDevKit`, `KytyPS5`, `sharpemu`, `prosper`).
5. **AI Agent Handoff Builder (`handoff`)**: Generates tailored `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/ps5-1360.mdc`, and task-specific kickoff prompts.
6. **PS5 Bridge Connector (`bridge`)**: Full-stack CORS-free proxy (`server.ts` -> `/api/bridge/*`) and interactive dashboard connecting to the user's PS5 via a `ps5upload` HTTP/MCP bridge (`http://127.0.0.1:19113` or Cloudflare `*.trycloudflare.com` quick tunnel). Supports auto-extracting tunnel URLs from raw `cloudflared` logs, live hardware/thermal/storage/ShadowMountPlus telemetry, PS5 directory & log reading, PS4 (`CUSA`) vs PS5 (`PPSA`) title inspection, shared Agent Bus v2 coordination (`/data/agent_bus/`), and confirmation-gated multi-ELF deployment (`TITAN-CORE-v1.0-mod-20261118-v2.2.elf`, `TITAN-CORE-v1.0-mod-20261116.elf`, `kraken-shadow-mix.elf`, `byepv-pxl-v0.1.0.elf`) to `elfldr:9021`.
7. **Native Ports Studio (`ports`)**: Up-to-date (16.11.2026) PS5 13.60 porting workbench covering `PS5_Vulkan` (Mesa RADV 1.4+ / `gfx1013`), `ps5-opengl` (Mesa GL 4.6 / `SDL 2.30.12`), `RecompStore`, `MihawkOS` / `ps5proton`, and real 2026 ports (`Liberty Recompiled`, `PS5_Ghostship`, `PS5_vkQuake`, `DevilutionX-PS5`, `PS5_RetroArch`, `Mupen64Plus-PS5`, `ProsperoSunshine`). Generates `CMakeLists.txt`, `src/ps5_port_bridge.cpp`, `sce_sys/param.json`, `build_and_deploy.sh`, and AI porting prompts.
8. **Unofficial Dump Patches & Content Mods Studio (`dump-mods`)**: Deep research catalog and polymorphic recipe generator for PS5 13.60 dump boot fixes (`ampr-emu-ng v0.4.1`, `libSceNp` offline stubs, `Protected CNT 16-Fallback Extractor` fixing `CE-107112-2`), firmware backports (`BestPig/BackPork` + `fakelib/` UnionFS, `CyB1K selfutil-patched` SDK downgrader), DLC & save unlockers (`ps5-dlc-toolchain`, `kite-pack v0.1.3`, `MacheteSVG v1.3.17`), 60/120 FPS & debug menu XML/SHN hooks (`illusion0001/console-game-patches`, `NeoEnabler`, `TeeKay87/HEN-Cheats-Collection`), and non-destructive Stacked UnionFS asset/localization overlays (`~mods` UE4/UE5 IoStore `.sig` bypass).
9. **Console Hack & Custom Firmware (CFW) Reverse-Engineering Research (`cfw-research`)**: End-to-end 8-stage exploit development and hardware reverse-engineering breakdown (`Ring 3 Userland RCE` -> `Ring 0 Kernel Data R/W` -> `Ring 0+ kCFI & kstuff` -> `Ring -1 AMD SVM Hypervisor NPT` -> `Co-Proc EL3 A53 MP4 & Syshub TLB` -> `AMD-SP / PSP Crypto Keyring` -> `Titania EMC / SPI NOR Coldboot` -> `Endgame Prospero-CFW 13.60`), complete with 3 interactive analytical charts (Stage Readiness vs Complexity, Firmware Evolution FW 1.00–14.22 SVG Line Chart, and Cross-Gen PS3/PS4/PS5 Security Barrier Matrix), an interactive R&D Breakthrough Simulator, and a `CoreOS` / `SPI NOR` partition patch blueprint (`manifest.cfw.toml`).

---

## 2. Directory & File Structure (`STRUCTR`)

Every domain concept, data store, validation rule, binary parser, mounter strategy, bridge adapter, and UI view is isolated in its own single-responsibility module:

```text
/
├── AGENTS.md                                      # Canonical PS5 13.60 Handoff Specification (15.11.2026)
├── README.md                                      # GitHub Repository README for Studio & TITAN-CORE Mod v2.2 Release
├── llm_check_me.md                                # Architectural & Synchronization Pipeline Guide
├── server.ts                                      # Express + Vite middleware server & /api/bridge/* proxy
├── public/
│   └── builds/
│       ├── TITAN-CORE-v1.0-mod-20261118-v2.2.elf  # Compiled 2-stage LTO Mod v2.2 ELF64 (17.25 MB, SHA-256 ffb3f6f6..., gitignored for GitHub)
│       ├── TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz # Lightweight patched fork source + English README (1.12 MiB)
│       ├── TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt # llvm-readelf -h -d dynamic imports & ELF64 report
│       ├── TITAN-CORE-v1.0-mod-20261118-v2.2.patch # Clean git diff vs devchmod/TITAN-CORE 2e1f186 (git apply --check OK)
│       ├── TITAN-CORE-README.md                   # Complete English GitHub README.md for TITAN-CORE Mod v2.2 Fork
│       ├── RELEASE-v1.0.2-mod-v2.2.md             # English GitHub Release notes & gh release create manifest
│       ├── SHA256SUMS                             # Verified SHA-256 manifest for all release assets
│       ├── kraken-shadow-mix.elf                  # Cross-compiled PS5 ELF64 payload (gitignored for GitHub)
│       ├── kraken-shadow-mix.patch                # Exact git diff applied during compilation
│       └── kraken-shadow-mix.elf.txt              # llvm-readelf -h -d header & dynamic library report
├── src/
│   ├── types/
│   │   ├── ps5.ts                                 # Strict TypeScript interfaces & domain contracts
│   │   ├── elf.ts                                 # Binary ELF64 / FSELF inspection contracts
│   │   ├── mounter.ts                             # Polymorphic PS5 Game Mounter & Patch contracts
│   │   ├── bridge.ts                              # PS5Upload Bridge telemetry, FS, game & action contracts
│   │   ├── agentBus.ts                            # Shared Agent Bus lock & message feed contracts
│   │   ├── nativePorts.ts                         # Native porting strategies, GPU stacks & catalog contracts
│   │   ├── sceneRadar.ts                          # PS5 13.60 Scene News & 91-Repo Audit contracts
│   │   ├── dumpMods.ts                            # Dump boot patches, fakelib backports, DLC unlockers & mod contracts
│   │   ├── cfwResearch.ts                         # 8-Stage Console Hack & Custom Firmware (CFW) research contracts
│   │   └── payloadHeader.ts                       # Payload Generator firmware offset & C-header template contracts
│   ├── research/
│   │   ├── cfwResearchEngine.ts                   # Pure CFW readiness calculator, R&D breakthrough simulator & TOML generator
│   │   └── cfwResearch.test.ts                    # Unit tests (node:test) for 8 stages, charts & CFW breakthrough simulator
│   ├── bridge/
│   │   ├── bridgeUrlValidator.ts                  # Pure URL normalizer & cloudflared terminal log URL extractor
│   │   ├── bridgeCatalog.ts                       # Declarative ps5upload REST endpoint catalog & safety classification
│   │   ├── bridgeRegistry.ts                      # Polymorphic title classifier, base64 preview decoder & normalizers
│   │   ├── bridgeClient.ts                        # Typed frontend API client for /api/bridge/*
│   │   ├── agentBusCodec.ts                       # Pure AgentBus v2 UTF-8/Base64 codec, stat parser, epoch & 256KiB guard
│   │   ├── agentBusProtocol.ts                    # AgentBus v2 constants (lock.d, epoch, .clock, feed/, inbox/) & prompt
│   │   ├── agentBusClient.ts                      # AgentBus v2 client (mkdir lock.d, beat touch, rm -rf, mv stale, segmented feed)
│   │   ├── bridge.test.ts                         # Unit tests (node:test) for URL parsing, catalog & normalizers
│   │   └── agentBus.test.ts                       # Unit tests (node:test) for AgentBus v2 codec, dual-schema & 256KiB guard
│   ├── ports/
│   │   ├── strategies/                            # Polymorphic porting strategies (source, static-recomp, dynarec, proton, media)
│   │   ├── portStrategyRegistry.ts                # Dictionary dispatch registry, memory evaluator & artifact generator
│   │   └── nativePorts.test.ts                    # Unit tests (node:test) for porting strategies, catalog & artifacts
│   ├── mods/
│   │   ├── strategies/                            # 5 Polymorphic dump patch & content mod strategies
│   │   │   ├── types.ts                           # DumpModStrategyHandler interface
│   │   │   ├── bootAmprNpFixStrategy.ts           # Strategy 1: ampr-emu-ng v0.4.1 + NP-Fix + 16 CNT Fallbacks
│   │   │   ├── fakelibBackportStrategy.ts         # Strategy 2: BackPork + fakelib UnionFS + selfutil-patched SDK downgrade
│   │   │   ├── dlcEntitlementUnlockStrategy.ts    # Strategy 3: ps5-dlc-toolchain + libSceAppContent addcont redirector
│   │   │   ├── xmlPerformancePatchStrategy.ts     # Strategy 4: illusion0001 / NeoEnabler 60/120 FPS & Debug XML hooks
│   │   │   └── unionFsContentOverlayStrategy.ts   # Strategy 5: Stacked UnionFS asset/localization overlay & UE5 ~mods
│   │   ├── dumpModRegistry.ts                     # Polymorphic dictionary dispatch, catalog filter & recipe auditor
│   │   └── dumpMods.test.ts                       # Unit tests (node:test) for all 5 dump mod strategies & symptom diagnosis
│   ├── server/
│   │   └── sceneRadarSync.ts                      # Isolated GitHub Atom & Search live discovery sync module
│   ├── config/
│   │   └── workspaceSections.ts                   # Single source of truth for workspace section IDs & labels
│   ├── data/
│   │   ├── canonicalAgentsMd.ts                   # Isolated canonical PS5 13.60 AGENTS.md specification
│   │   ├── sceneNewsData.ts                       # Core 15.11.2026 audit + unified SCENE_NEWS_LATEST / FULL_REPO_AUDIT_LATEST
│   │   ├── sceneNews16112026.ts                   # Isolated 16.11.2026 news & 30 newly discovered PS5 repositories
│   │   ├── sceneNews17112026.ts                   # Isolated 17.11.2026 news (ps5upload v12.6.4, ampr-emu-ng 256MiB, Playden v0.12.0-beta.1 + Kit 0.29, Crux2 v1.0.22) & 18 new repos
│   │   ├── sceneNews18112026.ts                   # Isolated 18.11.2026 news (AnyPS5 + AnyDevKit v0.1.7, HW/OS RE, ps5upload v12.6.5-12.6.7, GarlicTransfer v0.3.1, WH Widgets 26.11.17beta, PS5SD 1.3.1, Linux 7.3.3-c8fe83a) & 18 new repos
│   │   ├── cfwStagesData.ts                       # 8 Reverse-Engineering & Exploit Stages + CoreOS CFW partition map
│   │   ├── cfwChartsData.ts                       # Quantitative datasets for Firmware Evolution (1.00-14.22) & PS3/PS4/PS5 matrix
│   │   ├── exploitStackData.ts                    # Exploit chain & Runtime Stack data
│   │   ├── pitfallsData.ts                        # 6 Critical 13.60 constraints & remediation patterns
│   │   ├── repositoriesData.ts                    # Verified 13.60 open-source reference repositories
│   │   ├── nativePortsCatalog.ts                  # Verified 2026 PS5 native ports, GPU stacks & API mapping table
│   │   ├── dumpModsCatalogData.ts                 # 12 Unofficial PS5 dump boot fixes, backports, DLC unlockers & mod tools
│   │   ├── dumpSymptomsData.ts                    # 7 Common PS5 dump crash symptoms (CE-108255-1, CE-107112-2, CE-100008-9)
│   │   └── firmwareOffsetsData.ts                 # PS5 4.51-13.60 kernel/elfldr offset profiles & dictionary map
│   ├── mounters/
│   │   ├── titanCoreModSpec.ts                    # TITAN-CORE v1.0.2 + Mod v2.2 structured 13-patch catalog
│   │   ├── titanCoreReleaseData.ts                # Release artifact table, gh CLI command & GitHub README preview data
│   │   ├── titanCoreDumpFormats.ts                # Isolated 7 PS5 dump formats registry & polymorphic path classifier
│   │   ├── titanCoreDebugCollector.ts             # Isolated memory/error/unionfs debug bundle analyzer & TITAN-CORE debug API catalog
│   │   ├── krakenShadowMixStrategy.ts             # Strategy 1: Unified KrakenShadow-Mix
│   │   ├── krakenShadowMixPatches.ts              # Ready-to-compile Rust patches
│   │   ├── krakenDiagnostics.ts                   # Declarative root-cause analyzer for Kraken Mount
│   │   ├── krakenMountStrategy.ts                 # Strategy 2: Stock quer3q/kraken-mount
│   │   ├── shadowMountStrategy.ts                 # Strategy 3: Stock drakmor/ShadowMountPlus v1.7
│   │   ├── mounterRegistry.ts                     # Dictionary dispatch registry & comparison matrix
│   │   └── mounterRegistry.test.ts                # Unit tests (node:test)
│   ├── elf/
│   │   ├── magicMatchers.ts                       # Polymorphic binary format matchers (ELF64 vs FSELF)
│   │   ├── elf64Parser.ts                         # Pure modular DataView/Uint8Array ELF64 parser
│   │   ├── elfFilters.ts                          # Polymorphic dictionary-dispatched filters for symbols & .rodata strings
│   │   ├── elfCompatibilityAuditor.ts             # Declarative rule engine for ELF64 13.60 compatibility
│   │   ├── sampleElfGenerator.ts                  # Synthetic ELF64 generator
│   │   └── elfParser.test.ts                      # Unit tests (node:test)
│   ├── generators/
│   │   ├── strategies/
│   │   │   ├── types.ts                           # Polymorphic ArchitectureStrategy interface
│   │   │   ├── payloadStrategy.ts                 # Strategy 1: Headless ELF Payload
│   │   │   ├── webUiPayloadStrategy.ts            # Strategy 2: ELF Payload + HTTP WebUI
│   │   │   ├── nativeAppStrategy.ts               # Strategy 3: Native PS5 App
│   │   │   └── hybridAppStrategy.ts               # Strategy 4: Hybrid Native App + Helper ELF
│   │   ├── strategyRegistry.ts                    # Polymorphic dictionary dispatch
│   │   └── payloadHeader/
│   │       ├── types.ts                           # ElfLoaderVariantStrategy interface
│   │       ├── strategies/                        # 4 Polymorphic ELF loader ABI strategies (elfldr, Y2JB, Byepervisor, libkernel)
│   │       ├── payloadHeaderRegistry.ts           # Dictionary dispatch registry & C-header generator
│   │       └── payloadHeader.test.ts              # Unit tests (node:test) for firmware offsets & C-header templates
│   ├── validators/
│   │   ├── memoryBudgetCalculator.ts              # Pure math for Direct vs Flexible memory
│   │   ├── henConflictValidator.ts                # Declarative rule engine for HEN / Mounter stack
│   │   ├── sourceCodeAuditor.ts                   # Polymorphic rule-based C/C++ & manifest analyzer
│   │   ├── sceneRadarFilter.ts                    # Pure polymorphic filter, Atom XML parser & stats calculator
│   │   ├── validators.test.ts                     # Unit tests (node:test)
│   │   └── sceneRadar.test.ts                     # Unit tests (node:test) for Scene News & 91-Repo Audit
│   └── components/
│       ├── layout/
│       │   └── TopNavBar.tsx                      # 3-Zone Top Bar Contract navigation
│       ├── research/
│       │   ├── CfwResearchView.tsx                # Master coordinator for Section 9 (Console Hack & CFW Research)
│       │   ├── CfwChartsPanel.tsx                 # 3 Interactive SVG & bar charts (Readiness, FW 1.00-14.22, PS3/PS4/PS5)
│       │   ├── CfwStageInspectorPanel.tsx         # 8-Stage reverse-engineering pipeline & deep-dive technical inspector
│       │   └── CfwArchitectureBlueprintPanel.tsx  # Interactive R&D breakthrough simulator, CoreOS table & TOML manifest
│       ├── bridge/
│       │   ├── Ps5BridgeView.tsx                  # Master coordinator for PS5Upload Bridge & Agent Bus
│       │   ├── BridgeConnectionPanel.tsx          # URL / cloudflared log parser & console selector
│       │   ├── ConsoleTelemetryGrid.tsx           # Hardware, thermal, storage & ShadowMountPlus telemetry
│       │   ├── AgentBusInboxCard.tsx              # Isolated /data/agent_bus/inbox/*.md handoff document reader
│       │   ├── AgentBusPanel.tsx                  # Multi-agent v2 lock.d, epoch, segmented feed & protocol prompt UI
│       │   ├── BridgeFileExplorerPanel.tsx        # Live /data FS browser, file preview & PPSA/CUSA game list
│       │   ├── BridgeActionPanel.tsx              # Built ELF deployment, SMP rescan, process list & API explorer
│       │   └── BridgeConfirmModal.tsx             # Inline confirmation modal for mutating/destructive actions
│       ├── ports/
│       │   ├── NativePortsView.tsx                # Master coordinator for Native Ports Studio
│       │   ├── PortCatalogPanel.tsx               # Searchable/filterable 2026 PS5 ports & GPU stack catalog
│       │   ├── PortConfiguratorPanel.tsx          # Strategy, GPU backend, memory & PC->PS5 API mapping panel
│       │   └── PortArtifactsPanel.tsx             # Tabbed code & prompt generator for PS5 native ports
│       ├── mods/
│       │   ├── DumpModsView.tsx                   # Master coordinator for Section 8 (Dump Patches & Content Mods)
│       │   ├── DumpModCatalogPanel.tsx            # Searchable/filterable catalog of 12 unofficial dump patches & mods
│       │   ├── DumpModDiagnosticPanel.tsx         # Interactive Symptom-to-Fix crash & DLC troubleshooter
│       │   ├── DumpModConfiguratorPanel.tsx       # 5-Strategy recipe builder & live 13.60 compatibility auditor
│       │   └── DumpModArtifactsPanel.tsx          # Tabbed script, param.json, XML/TOML & AI prompt generator
│       ├── scaffolder/
│       │   ├── ProjectScaffolderView.tsx          # Coordinator with utility mode switcher (MVP + Payload Generator)
│       │   ├── ConfigFormPanel.tsx
│       │   ├── CodeArtifactViewer.tsx
│       │   ├── PayloadGeneratorPanel.tsx          # Payload Generator coordinator for firmware offset C-headers
│       │   ├── PayloadOffsetSelector.tsx          # Firmware offset profile & ELF loader ABI selector
│       │   └── PayloadHeaderPreview.tsx           # C-header preview, copy, download & #include snippet
│       ├── elf/
│       │   └── ElfResearchView.tsx
│       ├── auditor/
│       │   └── PitfallAuditorView.tsx
│       ├── knowledge/
│       │   ├── KnowledgeBaseView.tsx
│       │   ├── SceneRadarPanel.tsx                # Live 18.11.2026 Scene News & 109-Repo Audit Radar coordinator (NEWS_SCOPE_MAP)
│       │   ├── A53MmuResearchPanel.tsx            # Isolated A53/MP4 MMU (a53_mmu0.elf) & G0-G4 kernel telemetry inspector
│       │   ├── LiveRadarSyncBar.tsx               # Isolated live GitHub sync trigger & summary bar
│       │   ├── SceneNewsCard.tsx                  # Isolated scene news card component
│       │   ├── RepoAuditCard.tsx                  # Isolated audited/newly-discovered repository card with Atom check
│       │   ├── TitanCoreModPanel.tsx              # Upgraded TITAN-CORE v1.0.2 + Mod v2.2 Fork Workbench
│       │   ├── TitanCoreReleaseCard.tsx           # Isolated GitHub Release v1.0.2-mod-20261118 & README preview card
│       │   ├── TitanCoreDebugMatrixCard.tsx       # Isolated 7-format dump compatibility matrix & interactive debug bundle analyzer
│       │   ├── KrakenShadowMixBuilder.tsx
│       │   ├── KrakenTroubleshooter.tsx
│       │   ├── KrakenMountPanel.tsx
│       │   └── ShadowMountSimulator.tsx
│       └── handoff/
│           └── AgentHandoffView.tsx
```

---

## 3. Core Functions, Logic & Polymorphism (SOLID / DRY)

- **No Switch / Giant If-Else Chains**:
  - Architecture code generation uses `ARCHITECTURE_STRATEGY_REGISTRY` (`Record<ArchitecturePatternId, ArchitectureStrategy>`).
  - Payload C-Header generation uses `ELF_LOADER_VARIANT_REGISTRY` (`Record<ElfLoaderEntryVariant, ElfLoaderVariantStrategy>`) and `FIRMWARE_OFFSET_MAP` (`Record<FirmwareOffsetProfileId, FirmwareOffsetRecord>`).
  - Native Port generation uses `PORT_STRATEGY_REGISTRY` (`Record<PortStrategyId, PortStrategyHandler>`) and `PORT_GPU_BACKEND_META` (`Record<PortGpuBackendId, PortGpuBackendMeta>`).
  - Dump Patch & Mod Recipe generation uses `DUMP_MOD_STRATEGY_REGISTRY` (`Record<DumpModStrategyId, DumpModStrategyHandler>`) and declarative `DUMP_RECIPE_AUDIT_RULES`.
  - Console Hack & CFW Research uses declarative `CFW_RESEARCH_STAGES_1360`, `RND_BREAKTHROUGH_TOGGLES`, and `PERSISTENCE_RANK` (`Record<PersistenceTier, number>`) for zero-branching simulation math.
  - Game Mounter simulation uses `MOUNTER_STRATEGY_REGISTRY` (`Record<MounterEngineId, MounterStrategy>`).
  - Scene News & 109-Repository Audit uses declarative `SCENE_SEVERITY_META`, `REPO_STATUS_META`, `REPO_CATEGORY_TABS`, and `NEWS_SCOPE_MAP` with pure functional filtering (`filterRepoAuditCatalog`) and Atom XML parsing (`parseGithubAtomEntries`).
  - PS5 Bridge endpoints use declarative `BRIDGE_ENDPOINT_CATALOG` + `BRIDGE_ENDPOINT_MAP` + `ACTION_CATEGORY_META` (`Record<BridgeActionCategory, ...>`), Agent Bus message statuses use `AGENT_MESSAGE_STATUS_META`, and title classification uses `TITLE_PREFIX_RULES` array matching.
  - Binary format detection uses `BINARY_MAGIC_MATCHERS`, and ELF symbol/.rodata string filtering uses `SYMBOL_FILTER_PREDICATES` & `STRING_CATEGORY_PREDICATES`.
  - Workspace navigation & tab switching share the single `WORKSPACE_SECTIONS` registry (`src/config/workspaceSections.ts`).

---

## 4. Synchronization Rules & API Registry

When adding a new sector, block, architecture pattern, mounter engine, or API endpoint:
1. **Register Types**: Add the domain contract in `src/types/ps5.ts`, `src/types/elf.ts`, `src/types/mounter.ts`, `src/types/bridge.ts`, `src/types/agentBus.ts`, `src/types/nativePorts.ts`, `src/types/sceneRadar.ts`, `src/types/dumpMods.ts`, or `src/types/cfwResearch.ts`.
2. **Isolate Strategy / Rule**: Create a dedicated file in `src/bridge/`, `src/mounters/`, `src/elf/`, `src/generators/strategies/`, `src/ports/`, `src/mods/`, `src/research/`, or `src/validators/` without modifying unrelated modules (Open-Closed Principle).
3. **Express Bridge Proxy APIs (`server.ts`)**:
   - `GET /api/bridge/health` — proxy healthcheck
   - `GET /api/bridge/dump-mods-catalog` — returns researched 13.60 dump boot patches, `fakelib` backports, DLC unlockers, crash symptom diagnostics, and 5 polymorphic mod strategies
   - `POST /api/bridge/repo-feed` — live GitHub Atom release & commit feed inspector (`releases.atom` & `commits.atom`) bypassing unauthenticated REST API rate limits
   - `POST /api/bridge/scene-radar-sync` — live multi-repo Atom refresh + GitHub Search discovery scanner (`src/server/sceneRadarSync.ts`) returning newly discovered PS5 repositories and latest release tags
   - `POST /api/bridge/probe` — probes `/api/version` and `/api/consoles` on target `ps5upload` bridge
   - `POST /api/bridge/overview` — aggregates `/api/ps5/status`, `/api/ps5/hw/info`, `/api/ps5/hw/temps`, `/api/ps5/hw/storage`, `/api/ps5/smp/status`, `/api/games/installed`, `/api/ps5/process/list`
   - `POST /api/bridge/proxy` — generic JSON REST forwarder (`GET`/`POST`/`PUT`/`PATCH`/`DELETE`)
   - `POST /api/bridge/mcp` — Streamable HTTP JSON-RPC forwarder preserving `mcp-session-id`
   - `POST /api/bridge/agent-bus/snapshot` — server-side recursive reader for AgentBus v2 (`epoch`, `.clock` via `/api/ps5/fs/stat`, `lock.d` + `beat`, `lock.stale.*`, `feed/<agent>/*.json`, `inbox/*`) with legacy `lock.json`/`feed.json` fallback
   - `POST /api/bridge/agent-bus/ensure-dir` — idempotent creation of `/data/agent_bus`, `/data/agent_bus/feed`, `/data/agent_bus/inbox`, and optional per-agent feed subdirs on PS5
   - `GET /api/bridge/built-elfs` — inspects `public/builds/` for allow-listed PS5 ELF64 payloads (`BUILT_ELF_ARTIFACTS`), returning disk existence, byte size, and SHA-256
   - `GET /api/bridge/download-build/:filename` — streams allow-listed build artifacts (`TITAN-CORE-v1.0-mod-20261118-v2.2.elf`, `TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz`, `TITAN-CORE-v1.0-mod-20261118-v2.2.patch`, `TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt`, `TITAN-CORE-README.md`, `RELEASE-v1.0.2-mod-v2.2.md`, `SHA256SUMS`, legacy `TITAN-CORE-v1.0-mod-20261116.*`, `kraken-shadow-mix.elf`, `byepv-pxl-v0.1.0.elf`) directly from disk with `Content-Disposition: attachment` and `Content-Length` for zero-delay browser downloads
   - `POST /api/bridge/push-built-elf` — streams allow-listed `public/builds/<artifact>` (`TITAN-CORE-v1.0-mod-20261118-v2.2.elf`, `TITAN-CORE-v1.0-mod-20261116.elf`, `kraken-shadow-mix.elf`, `byepv-pxl-v0.1.0.elf`) as `application/octet-stream` to `/api/payload/send?host=...&port=9021`
   - **TITAN-CORE Mod v2.2 Embedded PS5 Debug API (`:8097` inside `src/web.rs`)**: `GET /api/debug/memory`, `GET /api/debug/mounts`, `GET /api/debug/error-dump`, `GET /api/debug/formats`, `GET /api/debug/bundle` / `POST /api/debug/dump-bundle` (persisting `/data/titan-core/debug/titan-debug-latest.json` and `last-crash-bundle.json`)
4. **Unit Test Gate**: Verify all 10 test suites via:
   `npx --yes tsx --test src/bridge/bridge.test.ts src/bridge/agentBus.test.ts src/ports/nativePorts.test.ts src/mods/dumpMods.test.ts src/research/cfwResearch.test.ts src/validators/validators.test.ts src/validators/sceneRadar.test.ts src/elf/elfParser.test.ts src/mounters/mounterRegistry.test.ts src/generators/payloadHeader/payloadHeader.test.ts`

