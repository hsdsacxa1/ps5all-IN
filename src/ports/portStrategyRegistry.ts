import { PORT_GPU_BACKEND_META } from '../data/nativePortsCatalog';
import {
  NativePortCatalogEntry,
  NativePortConfig,
  PortCatalogCategory,
  PortGeneratedArtifact,
  PortStrategyId,
} from '../types/nativePorts';
import { emulatorDynarecStrategy } from './strategies/emulatorDynarecStrategy';
import { nativeAppPortStrategy } from './strategies/nativeAppPortStrategy';
import { protonWrapperStrategy } from './strategies/protonWrapperStrategy';
import { sourcePortStrategy } from './strategies/sourcePortStrategy';
import { staticRecompStrategy } from './strategies/staticRecompStrategy';
import { PortStrategyHandler } from './strategies/types';

export const PORT_STRATEGY_REGISTRY: Record<PortStrategyId, PortStrategyHandler> = {
  'source-port': sourcePortStrategy,
  'static-recomp': staticRecompStrategy,
  'emulator-dynarec': emulatorDynarecStrategy,
  'proton-wrapper': protonWrapperStrategy,
  'media-native': nativeAppPortStrategy,
};

export const PORT_STRATEGY_LIST: PortStrategyHandler[] = [
  sourcePortStrategy,
  staticRecompStrategy,
  emulatorDynarecStrategy,
  protonWrapperStrategy,
  nativeAppPortStrategy,
];

export function filterNativePortsCatalog(
  entries: NativePortCatalogEntry[],
  category: PortCatalogCategory,
  searchQuery: string
): NativePortCatalogEntry[] {
  const q = searchQuery.trim().toLowerCase();
  return entries.filter((entry) => {
    const matchesCategory = category === 'all' || entry.category === category;
    if (!matchesCategory) return false;
    if (!q) return true;
    const haystack = [
      entry.name,
      entry.repo,
      entry.stackLabel,
      entry.summary,
      ...entry.keyTech,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function evaluatePortMemoryImpact(flexibleMemoryMiB: number): {
  flexibleMiB: number;
  directPenaltyMiB: number;
  severity: 'nominal' | 'caution';
  summary: string;
} {
  const clamped = Math.max(448, Math.min(1024, Math.round(flexibleMemoryMiB)));
  const penalty = Math.max(0, clamped - 448);
  return {
    flexibleMiB: clamped,
    directPenaltyMiB: penalty,
    severity: penalty > 256 ? 'caution' : 'nominal',
    summary:
      penalty === 0
        ? 'Базовый профиль 448 MiB: Direct Memory (GPU/VRAM) не урезается.'
        : `Flexible ${clamped} MiB отнимает ${penalty} MiB у Direct Memory (GPU/текстуры).`,
  };
}

function buildCMakeLists(
  config: NativePortConfig,
  strategy: PortStrategyHandler
): string {
  const gpu = PORT_GPU_BACKEND_META[config.gpuBackend];
  const flags = strategy.getStrategyCmakeFlags(config);
  const optionalLibs = [
    config.enableDualSensePad ? 'ScePad' : '',
    config.enableAudioOut ? 'SceAudioOut' : '',
    config.enableMbedTls ? 'curl mbedtls mbedx509 mbedcrypto' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `# Auto-generated PS5 13.60 Native Port CMakeLists.txt
# Strategy: ${strategy.meta.title}
# Graphics Stack: ${gpu.label} (${gpu.repo})
cmake_minimum_required(VERSION 3.22)
project(${config.portName} LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Toolchain: ps5-payload-dev/sdk v0.45 + pacbrew-repo sysroot
# cmake -DCMAKE_TOOLCHAIN_FILE=$PS5_PAYLOAD_SDK/toolchain/prospero.cmake ${flags.join(' ')} -B build

add_executable(eboot.elf
  src/ps5_port_bridge.cpp
  # Подключите исходники порта ${config.sourceProject}
)

target_compile_options(eboot.elf PRIVATE
  -Wall
  -Wextra
  -O2
  -D__PS5__
  -DPS5_FW_TARGET=1360
)

target_link_libraries(eboot.elf PRIVATE
  ${gpu.cmakeLinkLibs}
  ${optionalLibs}
  SceUserService
  SceSystemService
  c
)

# Проверка запрещённых импортов в Title-процессе (statvfs / statfs)
add_custom_command(TARGET eboot.elf POST_BUILD
  COMMAND python3 \${CMAKE_SOURCE_DIR}/scripts/check-title-imports.py $<TARGET_FILE:eboot.elf>
  COMMENT "Verifying PS5 Title ELF imports (blocking statvfs/statfs null-import crash)"
)
`;
}

function buildBridgeCpp(
  config: NativePortConfig,
  strategy: PortStrategyHandler
): string {
  const gpu = PORT_GPU_BACKEND_META[config.gpuBackend];
  const defines = strategy.getStrategyCppDefines(config);

  const storageSnippet = config.enableDownload0Fallback
    ? `static std::string resolve_writable_root() {
  const char* primary = "/data/${config.portName}";
  if (mkdir(primary, 0777) == 0 || errno == EEXIST) {
    if (access(primary, W_OK) == 0) return primary;
  }
  const char* fallback = "/download0/${config.portName}";
  mkdir(fallback, 0777);
  return fallback;
}`
    : `static std::string resolve_writable_root() {
  const char* primary = "/data/${config.portName}";
  mkdir(primary, 0777);
  return primary;
}`;

  const tlsSnippet = config.enableMbedTls
    ? `// Статический mbedTLS 3.6.7 + libcurl (системный TLS недоступен при elevated ucred)
static void configure_ps5_curl_tls(CURL* curl) {
  curl_easy_setopt(curl, CURLOPT_CAINFO, "/system/common/cert/CA_LIST");
  curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);
}`
    : '// HTTPS TLS отключён в конфигурации порта';

  const padSnippet = config.enableDualSensePad
    ? `// Инициализация DualSense через libScePad
static int init_dualsense_pad(int userId) {
  scePadInit();
  return scePadOpen(userId, 0, 0, nullptr);
}`
    : '// libScePad отключён (используется ввод выбранного SDL/движка)';

  const s3Snippet = config.enableS3ResumeHook
    ? `// Rest Mode (S3 Resume) lifecycle hook — переинициализация сокетов и отказ от системных диалогов
static bool handle_ps5_system_event(bool resumedFromRestMode) {
  if (resumedFromRestMode) {
    printf("[PS5Port] S3 Resume detected: rebinding sockets and audio handles...\\n");
    return true;
  }
  return false; // Явный возврат false для нереализованных системных диалогов
}`
    : '';

  const jitSnippet = config.enableJitDynarec
    ? `static bool probe_jit_executable_pages() {
  void* mem = mmap(nullptr, 4096, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
  if (mem == MAP_FAILED) return false;
  bool ok = (mprotect(mem, 4096, PROT_READ | PROT_EXEC) == 0);
  munmap(mem, 4096);
  return ok;
}`
    : '';

  return `// Auto-generated PS5 13.60 Port Platform Bridge
// Title ID: ${config.titleId} | Upstream: ${config.sourceProject}
#include <cstdio>
#include <cerrno>
#include <cstdlib>
#include <string>
#include <sys/stat.h>
#include <sys/mman.h>
#include <unistd.h>

${defines.join('\n')}
#define PS5_PORT_TITLE_ID "${config.titleId}"

// КРИТИЧНО: НЕ вызывать statvfs() / statfs() в eboot.bin (вызывает null import crash на PS5)
// Контроль свободного места выполнять строго через проверку errno == ENOSPC при write().

${storageSnippet}

${tlsSnippet}

${padSnippet}

${jitSnippet}

${s3Snippet}

extern "C" int ps5_port_platform_bootstrap() {
${strategy.getStrategyInitBlock(config)}

${gpu.initSnippet}

  const std::string dataDir = resolve_writable_root();
  printf("[PS5Port] %s (%s) writable dir: %s\\n", PS5_PORT_TITLE_ID, PS5_PORT_STRATEGY, dataDir.c_str());
  return 0;
}
`;
}

function buildParamJson(config: NativePortConfig): string {
  const bytes = Math.max(448, Math.min(1024, Math.round(config.flexibleMemoryMiB))) * 1024 * 1024;
  return JSON.stringify(
    {
      applicationCategoryType: 0,
      attribute: 0,
      contentId: `IV0000-${config.titleId}_00-${config.portName.toUpperCase().slice(0, 16)}`,
      contentVersion: config.contentVersion,
      localizedParameters: {
        defaultLanguage: 'en-US',
        'en-US': {
          titleName: `${config.portName} (PS5 Port)`,
        },
      },
      titleId: config.titleId,
      requiredSystemSoftwareVersion: '0x1360000000000000',
      applicationDrmType: 'free',
      kernel: {
        flexibleMemorySize: bytes,
      },
    },
    null,
    2
  );
}

function buildDeployScript(config: NativePortConfig): string {
  const pkgStepMap: Record<NativePortConfig['packageFormat'], string> = {
    folder: `# Деплой распакованной папки для ShadowMountPlus v1.7 (/data/homebrew/${config.titleId})
lftp -e "mirror -R dist/${config.titleId} /data/homebrew/${config.titleId}; bye" -p 2121 $PS5_HOST`,
    ffpkg: `# Упаковка в UFS2 .ffpkg через mkpfs (pip install mkpfs)
mkpfs dist/${config.titleId} dist/${config.titleId}.ffpkg
lftp -e "put dist/${config.titleId}.ffpkg -o /data/homebrew/${config.titleId}.ffpkg; bye" -p 2121 $PS5_HOST`,
    ffpfsc: `# Упаковка в сжатый .ffpfsc через mkpfs (pip install mkpfs)
mkpfs --compress dist/${config.titleId} dist/${config.titleId}.ffpfsc
lftp -e "put dist/${config.titleId}.ffpfsc -o /data/homebrew/${config.titleId}.ffpfsc; bye" -p 2121 $PS5_HOST`,
  };

  return `#!/usr/bin/env bash
set -euo pipefail

export PS5_HOST="\${PS5_HOST:-192.168.50.14}"
export PS5_PAYLOAD_SDK="\${PS5_PAYLOAD_SDK:-/opt/ps5-payload-sdk}"

# 1. Проверка иконки: sce_sys/icon0.png ОБЯЗАН быть 512x512 RGB БЕЗ альфа-канала!
python3 - <<'PY'
from PIL import Image
im = Image.open("sce_sys/icon0.png")
assert im.size == (512, 512) and im.mode == "RGB", f"Invalid icon0.png: {im.size} {im.mode}"
PY

# 2. Сборка eboot.elf -> подпись FSELF -> eboot.bin + sce_module/libc.prx
cmake -DCMAKE_TOOLCHAIN_FILE="$PS5_PAYLOAD_SDK/toolchain/prospero.cmake" -B build
cmake --build build -j"$(nproc)"
mkdir -p dist/${config.titleId}/sce_sys dist/${config.titleId}/sce_module dist/${config.titleId}/assets
make-fself build/eboot.elf dist/${config.titleId}/eboot.bin
cp "$PS5_PAYLOAD_SDK/lib/libc.prx" dist/${config.titleId}/sce_module/libc.prx
cp sce_sys/param.json sce_sys/icon0.png dist/${config.titleId}/sce_sys/

${pkgStepMap[config.packageFormat]}

# 3. Запуск пересканирования ShadowMountPlus (HTTP API 10101)
curl -sf -X POST "http://$PS5_HOST:10101/api/v1/scan" -H "Content-Type: application/json" -d '{}'
`;
}

export function buildNativePortAgentPrompt(config: NativePortConfig): string {
  const strategy = PORT_STRATEGY_REGISTRY[config.strategy];
  const gpu = PORT_GPU_BACKEND_META[config.gpuBackend];
  const mem = evaluatePortMemoryImpact(config.flexibleMemoryMiB);

  return `Задача для ИИ-агента: портировать "${config.sourceProject}" в нативное приложение PS5 FW 13.60 (${config.titleId}).

Архитектурный профиль:
- Стратегия: ${strategy.meta.title}
- Графический стек: ${gpu.label} (${gpu.repo}, ${gpu.apiLevel})
- Формат пакета: ${config.packageFormat} (деплой в /data/homebrew/${config.titleId} для ShadowMountPlus v1.7+)
- Память: ${mem.flexibleMiB} MiB Flexible Memory (${mem.summary})

Жёсткие инварианты PS5 13.60:
1. Никаких statvfs() / statfs() в eboot.bin — проверять переполнение диска через ENOSPC; перед упаковкой запускать check-title-imports.py.
2. Ассеты игры монтировать из read-only /app0/assets/; сохранения и кэш писать в /data/${config.portName}/ с fallback в /download0/${config.portName}/.
3. ${config.enableMbedTls ? 'TLS строго через статически слинкованный mbedTLS 3.6.7 + libcurl и /system/common/cert/CA_LIST.' : 'Не использовать системный OpenSSL/TLS при elevated ucred.'}
4. sce_sys/icon0.png — строго 512x512 RGB без альфа-канала; в sce_module/ должен лежать clean-room libc.prx.
5. Обрабатывать Rest Mode (S3 Resume) и явно возвращать false из нереализованных системных диалогов.

План шагов:
${strategy.getStrategyWorkflowSteps(config).map((s, idx) => `${idx + 1}. ${s}`).join('\n')}`;
}

export function generateNativePortArtifacts(config: NativePortConfig): PortGeneratedArtifact[] {
  const strategy = PORT_STRATEGY_REGISTRY[config.strategy];
  return [
    {
      id: 'cmake',
      filename: 'CMakeLists.txt',
      language: 'cmake',
      description: 'Сборка CMake под ps5-payload-dev/sdk v0.45 + pacbrew-repo и проверка импортов.',
      content: buildCMakeLists(config, strategy),
    },
    {
      id: 'bridge',
      filename: 'src/ps5_port_bridge.cpp',
      language: 'cpp',
      description: 'Адаптер песочницы (/app0, /data, /download0), DualSense, mbedTLS, JIT и S3 Resume.',
      content: buildBridgeCpp(config, strategy),
    },
    {
      id: 'param',
      filename: 'sce_sys/param.json',
      language: 'json',
      description: 'Манифест Title ID, contentVersion и Flexible Memory под PS5 13.60.',
      content: buildParamJson(config),
    },
    {
      id: 'deploy',
      filename: 'build_and_deploy.sh',
      language: 'bash',
      description: 'Проверка icon0.png 512x512 RGB, подпись FSELF, упаковка и FTP/ShadowMountPlus scan.',
      content: buildDeployScript(config),
    },
    {
      id: 'prompt',
      filename: 'PORTING_PROMPT.md',
      language: 'markdown',
      description: 'Готовое ТЗ и ограничения 13.60 для запуска портирования через ИИ-агента.',
      content: buildNativePortAgentPrompt(config),
    },
  ];
}
