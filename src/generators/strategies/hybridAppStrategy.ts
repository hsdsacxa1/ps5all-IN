import { GeneratedFileArtifact, ProjectScaffoldConfig } from '../../types/ps5';
import { buildCheckTitleImportsPy, buildParamJson } from './nativeAppStrategy';
import { ArchitectureStrategy } from './types';

export const hybridAppStrategy: ArchitectureStrategy = {
  id: 'hybrid-app',
  label: 'Hybrid (Native GUI App + Helper ELF via 127.0.0.1:9021)',
  generateFiles(config: ProjectScaffoldConfig): GeneratedFileArtifact[] {
    const safeName = config.projectName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'ps5_hybrid';
    const paramJson = buildParamJson(config);

    const guiMainCpp = `/**
 * Project: ${config.projectName} (${config.titleId}) — Hybrid Native GUI Client
 * Target: PS5 Firmware 13.60
 * Pattern: GUI sends /app0/assets/helper.elf to local elfldr (127.0.0.1:9021)
 *          and communicates with helper daemon on 127.0.0.1:${config.webuiPort}.
 */
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>
#include <unistd.h>
#include <fcntl.h>
#include <arpa/inet.h>
#include <sys/socket.h>

namespace hybrid_bridge {

bool push_helper_elf_to_local_elfldr(const char* elfPath, uint16_t elfldrPort = 9021) {
    int fd = ::open(elfPath, O_RDONLY);
    if (fd < 0) return false;

    int sock = ::socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        ::close(fd);
        return false;
    }

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(elfldrPort);
    ::inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);

    if (::connect(sock, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) < 0) {
        ::close(sock);
        ::close(fd);
        return false;
    }

    char buf[8192];
    ssize_t n = 0;
    while ((n = ::read(fd, buf, sizeof(buf))) > 0) {
        if (::send(sock, buf, static_cast<size_t>(n), 0) < 0) break;
    }

    ::close(sock);
    ::close(fd);
    return true;
}

} // namespace hybrid_bridge

int main() {
    std::printf("[${config.titleId}] Launching hybrid helper payload via 127.0.0.1:9021...\\n");
    bool ok = hybrid_bridge::push_helper_elf_to_local_elfldr("/app0/assets/helper.elf", 9021);
    std::printf("[${config.titleId}] Helper injection status: %s\\n", ok ? "SUCCESS" : "FAILED");
    return 0;
}
`;

    const helperC = `/**
 * Project: ${config.projectName} — Unsandboxed Kernel/FS Helper Payload (helper.elf)
 * Runs outside Title sandbox via elfldr (9021). Can call statfs() in libkernel_sys.so
 * and talk to ShadowMountPlus HTTP API on 127.0.0.1:10101/api/v1.
 */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/param.h>
#include <sys/mount.h>
#include <netinet/in.h>
#include <sys/socket.h>

int main(void) {
    struct statfs sfs;
    if (statfs("/data", &sfs) == 0) {
        unsigned long long free_mb = (unsigned long long)(sfs.f_bavail * sfs.f_bsize) / (1024ULL * 1024ULL);
        printf("[${safeName}-helper] /data free space: %llu MiB\\n", free_mb);
    }
    return 0;
}
`;

    const makefileContent = `# Hybrid Build: Native GUI (${config.titleId}/eboot.bin) + Unsandboxed Helper (assets/helper.elf)
TITLE_ID := ${config.titleId}
PS5_PAYLOAD_SDK ?= /opt/ps5-payload-sdk
PS5_HOST ?= ${config.ps5Ip}
FTP_PORT ?= ${config.ftpPort}

DIST_DIR := dist/$(TITLE_ID)

.PHONY: all helper app deploy-ftp clean

all: helper app

helper:
\t@mkdir -p $(DIST_DIR)/assets
\t$(PS5_PAYLOAD_SDK)/bin/prospero-clang -O2 src/helper.c -o $(DIST_DIR)/assets/helper.elf

app: helper
\t@mkdir -p build $(DIST_DIR)/sce_sys $(DIST_DIR)/sce_module
\tclang++-18 -std=c++20 -O2 -fPIC src/gui_main.cpp -o build/eboot.unsigned.elf
\tpython3 scripts/check-title-imports.py build/eboot.unsigned.elf
\tpython3 scripts/make_fself.py build/eboot.unsigned.elf $(DIST_DIR)/eboot.bin
\tcp sce_sys/param.json $(DIST_DIR)/sce_sys/param.json

deploy-ftp: all
\tcurl -T $(DIST_DIR)/eboot.bin ftp://$(PS5_HOST):$(FTP_PORT)/data/homebrew/$(TITLE_ID)/eboot.bin --ftp-create-dirs
\tcurl -T $(DIST_DIR)/assets/helper.elf ftp://$(PS5_HOST):$(FTP_PORT)/data/homebrew/$(TITLE_ID)/assets/helper.elf --ftp-create-dirs
\tcurl -T $(DIST_DIR)/sce_sys/param.json ftp://$(PS5_HOST):$(FTP_PORT)/data/homebrew/$(TITLE_ID)/sce_sys/param.json

clean:
\trm -rf build dist
`;

    return [
      {
        path: 'sce_sys/param.json',
        language: 'json',
        description: `Манифест гибридного приложения (${config.titleId}, v${config.contentVersion})`,
        content: paramJson,
      },
      {
        path: 'Makefile',
        language: 'makefile',
        description: 'Двухэтапная сборка: helper.elf (ps5-payload-sdk) + eboot.bin (boilerplate)',
        content: makefileContent,
      },
      {
        path: 'src/gui_main.cpp',
        language: 'cpp',
        description: 'GUI-клиент, загружающий /app0/assets/helper.elf в локальный elfldr (127.0.0.1:9021)',
        content: guiMainCpp,
      },
      {
        path: 'src/helper.c',
        language: 'c',
        description: 'Вспомогательный ELF-пэйлоад вне песочницы с доступом к libkernel_sys (statfs)',
        content: helperC,
      },
      {
        path: 'scripts/check-title-imports.py',
        language: 'python',
        description: 'Проверка импортов Title-бинарника (запрет statvfs/statfs в GUI-части)',
        content: buildCheckTitleImportsPy(),
      },
    ];
  },

  generateDeployCommands(config: ProjectScaffoldConfig): string {
    return `# 1. Закройте ${config.titleId} на PS5 перед обновлением по FTP
export PS5_PAYLOAD_SDK=/opt/ps5-payload-sdk
export PS5_HOST=${config.ps5Ip}

# 2. Сборка гибридного пакета (helper.elf упаковывается внутрь assets/helper.elf)
make clean && make deploy-ftp

# 3. Вызов пересканирования ShadowMountPlus v1.7
curl -X POST http://${config.ps5Ip}:10101/api/v1/scan -H "Content-Type: application/json" -d '{}'`;
  },
};
