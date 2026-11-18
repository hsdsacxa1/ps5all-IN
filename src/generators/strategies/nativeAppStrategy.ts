import { GeneratedFileArtifact, ProjectScaffoldConfig } from '../../types/ps5';
import { ArchitectureStrategy } from './types';

export function buildParamJson(config: ProjectScaffoldConfig): string {
  const flexibleBytes = config.flexibleMemoryMiB * 1024 * 1024;
  return JSON.stringify(
    {
      titleId: config.titleId,
      contentId: `IV0000-${config.titleId}_00-HOMEBREW00000001`,
      contentVersion: config.contentVersion,
      masterVersion: '01.00',
      applicationCategoryType: 0,
      attribute: 0,
      flexibleMemorySize: flexibleBytes,
      localizedParameters: {
        defaultLanguage: 'en-US',
        'en-US': {
          titleName: config.projectName,
        },
        'ru-RU': {
          titleName: config.projectName,
        },
      },
    },
    null,
    2
  );
}

export function buildCheckTitleImportsPy(): string {
  return `#!/usr/bin/env python3
"""
check-title-imports.py — Pre-deploy ELF/FSELF import table verifier for PS5 13.60.
Blocks build if forbidden syscalls/symbols (statvfs, statfs) are imported in Title eboot.bin.
"""
import sys
from elftools.elf.elffile import ELFFile

FORBIDDEN_TITLE_SYMBOLS = {"statvfs", "statfs", "fstatvfs", "fstatfs"}

def verify_elf_imports(filepath: str) -> int:
    with open(filepath, "rb") as f:
        elf = ELFFile(f)
        for section in elf.iter_sections():
            if not hasattr(section, "iter_symbols"):
                continue
            for sym in section.iter_symbols():
                if sym.name in FORBIDDEN_TITLE_SYMBOLS:
                    print(f"[FATAL] Forbidden Title import detected: {sym.name} in {filepath}")
                    print("Remediation: Handle ENOSPC on write() or delegate to helper.elf on port 9021.")
                    return 1
    print(f"[OK] {filepath} passed PS5 13.60 Title import audit.")
    return 0

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/check-title-imports.py <unsigned_eboot.elf>")
        sys.exit(2)
    sys.exit(verify_elf_imports(sys.argv[1]))
`;
}

export const nativeAppStrategy: ArchitectureStrategy = {
  id: 'native-app',
  label: 'Native PS5 App (<TITLE_ID>/eboot.bin for ShadowMountPlus v1.7)',
  generateFiles(config: ProjectScaffoldConfig): GeneratedFileArtifact[] {
    const safeName = config.projectName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'ps5_native_app';
    const paramJson = buildParamJson(config);

    const makefileContent = `# Target: PS5 13.60 Native Application (/data/homebrew/${config.titleId}/)
# Base: drakmor/ps5-native-app-boilerplate (GPL-3.0-or-later)
TITLE_ID := ${config.titleId}
CONTENT_VER := ${config.contentVersion}
PS5_HOST ?= ${config.ps5Ip}
FTP_PORT ?= ${config.ftpPort}
GRAPHICS_BACKEND := ${config.graphicsBackend}

CXX := clang++-18
LD := ld.lld-18
CXXFLAGS := -std=c++20 -O2 -Wall -Wextra -fPIC

DIST_DIR := dist/$(TITLE_ID)

.PHONY: all verify-imports package deploy-ftp clean

all: $(DIST_DIR)/eboot.bin $(DIST_DIR)/sce_sys/param.json $(DIST_DIR)/sce_sys/icon0.png

$(DIST_DIR)/eboot.bin: src/main.cpp
\t@mkdir -p build $(DIST_DIR)/sce_module $(DIST_DIR)/sce_sys $(DIST_DIR)/assets
\t$(CXX) $(CXXFLAGS) src/main.cpp -o build/eboot.unsigned.elf
\tpython3 scripts/check-title-imports.py build/eboot.unsigned.elf
\tpython3 scripts/make_fself.py build/eboot.unsigned.elf $(DIST_DIR)/eboot.bin
\tcp toolchain/sce_module/libc.prx $(DIST_DIR)/sce_module/libc.prx

$(DIST_DIR)/sce_sys/param.json: sce_sys/param.json
\tcp sce_sys/param.json $(DIST_DIR)/sce_sys/param.json

$(DIST_DIR)/sce_sys/icon0.png:
\tpython3 scripts/verify_icon0_rgb.py sce_sys/icon0.png $(DIST_DIR)/sce_sys/icon0.png

# IMPORTANT: Close ${config.titleId} on PS5 before running deploy-ftp!
deploy-ftp: all
\tcurl -T $(DIST_DIR)/eboot.bin ftp://$(PS5_HOST):$(FTP_PORT)/data/homebrew/$(TITLE_ID)/eboot.bin --ftp-create-dirs
\tcurl -T $(DIST_DIR)/sce_sys/param.json ftp://$(PS5_HOST):$(FTP_PORT)/data/homebrew/$(TITLE_ID)/sce_sys/param.json
\tcurl -T $(DIST_DIR)/sce_sys/icon0.png ftp://$(PS5_HOST):$(FTP_PORT)/data/homebrew/$(TITLE_ID)/sce_sys/icon0.png
\tcurl -X POST http://$(PS5_HOST):10101/api/v1/scan -H "Content-Type: application/json" -d '{}' || true

clean:
\trm -rf build dist
`;

    const mainCppContent = `/**
 * Project: ${config.projectName} (${config.titleId})
 * Target: PS5 Firmware 13.60 | Native Application (eboot.bin)
 * Graphics Backend: ${config.graphicsBackend}
 *
 * CRITICAL 13.60 RULES ENFORCED:
 * 1. NO statvfs() / statfs() calls (missing in userland libkernel -> null import crash).
 * 2. Read-only assets in /app0/assets/, writable config in /data/${safeName} with /download0 fallback.
 * 3. Unimplemented system dialogs explicitly return false to prevent SceShellCore hang.
 */
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cerrno>
#include <string>
#include <unistd.h>
#include <fcntl.h>
#include <sys/stat.h>

namespace prospero {

std::string resolve_writable_storage(const char* appFolder) {
    char primaryPath[256];
    std::snprintf(primaryPath, sizeof(primaryPath), "/data/%s", appFolder);
    if (::mkdir(primaryPath, 0777) == 0 || errno == EEXIST) {
        if (::access(primaryPath, W_OK) == 0) {
            return std::string(primaryPath);
        }
    }
    // Fallback for OnionHEN / strict sandbox when Title ID is not whitelisted
    return "/download0";
}

bool safe_write_config(const std::string& path, const char* data, size_t len) {
    int fd = ::open(path.c_str(), O_WRONLY | O_CREAT | O_TRUNC, 0666);
    if (fd < 0) return false;

    ssize_t written = ::write(fd, data, len);
    if (written < 0 && errno == ENOSPC) {
        // Disk space check via ENOSPC instead of forbidden statvfs()
        std::fprintf(stderr, "[${config.titleId}] Storage full (ENOSPC)\\n");
        ::close(fd);
        return false;
    }
    ::close(fd);
    return written == static_cast<ssize_t>(len);
}

bool on_unhandled_system_dialog(int dialogType) {
    (void)dialogType;
    // Must explicitly return false so SceShellCore callbacks never hang
    return false;
}

} // namespace prospero

int main() {
    std::string storageDir = prospero::resolve_writable_storage("${safeName}");
    std::printf("[${config.titleId}] v${config.contentVersion} initialized. Storage: %s\\n", storageDir.c_str());

    std::string stateFile = storageDir + "/settings.json";
    const char* defaultJson = "{\\"version\\":\\"${config.contentVersion}\\",\\"backend\\":\\"${config.graphicsBackend}\\"}";
    prospero::safe_write_config(stateFile, defaultJson, std::strlen(defaultJson));

    return 0;
}
`;

    return [
      {
        path: `sce_sys/param.json`,
        language: 'json',
        description: `Манифест приложения (${config.titleId}, v${config.contentVersion}, Flexible Memory: ${config.flexibleMemoryMiB} MiB)`,
        content: paramJson,
      },
      {
        path: 'Makefile',
        language: 'makefile',
        description: 'Сборка FSELF eboot.bin, аудит импортов, FTP-деплой и триггер ShadowMountPlus API',
        content: makefileContent,
      },
      {
        path: 'src/main.cpp',
        language: 'cpp',
        description: 'C++20 скелет нативного приложения с /download0 fallback и защитой от ENOSPC',
        content: mainCppContent,
      },
      {
        path: 'scripts/check-title-imports.py',
        language: 'python',
        description: 'CI-скрипт блокировки запрещённых символов statvfs/statfs в таблице импортов eboot.bin',
        content: buildCheckTitleImportsPy(),
      },
    ];
  },

  generateDeployCommands(config: ProjectScaffoldConfig): string {
    return `# 1. Убедитесь, что на PS5 запущены kstuff-lite v1.11+ и ShadowMountPlus v1.7+
# 2. ВАЖНО: Закройте приложение ${config.titleId} на PS5 перед FTP-загрузкой!
export PS5_HOST=${config.ps5Ip}

# 3. Сборка, проверка таблицы импортов и выгрузка в /data/homebrew/${config.titleId}/
make clean && make deploy-ftp

# 4. Принудительное обновление списка на главном экране через ShadowMountPlus API
curl -X POST http://${config.ps5Ip}:10101/api/v1/scan -H "Content-Type: application/json" -d '{}'`;
  },
};
