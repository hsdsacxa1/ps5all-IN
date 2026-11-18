import { GeneratedFileArtifact, ProjectScaffoldConfig } from '../../types/ps5';
import { ArchitectureStrategy } from './types';

export const payloadStrategy: ArchitectureStrategy = {
  id: 'payload',
  label: 'Headless ELF Payload (ps5-payload-dev/sdk v0.45)',
  generateFiles(config: ProjectScaffoldConfig): GeneratedFileArtifact[] {
    const safeName = config.projectName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'ps5_daemon';
    const makefileContent = `# Target: PS5 Firmware 13.60 ELF Payload (ps5-payload-dev/sdk v0.45)
PS5_PAYLOAD_SDK ?= /opt/ps5-payload-sdk
PS5_HOST ?= ${config.ps5Ip}
PS5_PORT ?= ${config.elfldrPort}

include $(PS5_PAYLOAD_SDK)/toolchain/prospero.mk

TARGET := build/${safeName}.elf
SRCS := src/main.c

CFLAGS := -O2 -Wall -Wextra -std=c11
LDFLAGS := -lkernel_sys ${config.useHttpsTls ? '-lcurl -lmbedtls -lmbedx509 -lmbedcrypto' : ''}

.PHONY: all clean deploy

all: $(TARGET)

$(TARGET): $(SRCS)
\t@mkdir -p build
\t$(CC) $(CFLAGS) $(SRCS) $(LDFLAGS) -o $(TARGET)

deploy: $(TARGET)
\tnc -w 10 $(PS5_HOST) $(PS5_PORT) < $(TARGET)

clean:
\trm -rf build
`;

    const mainCContent = `/**
 * Project: ${config.projectName}
 * Target: PS5 Firmware 13.60 | Architecture: Headless ELF Payload (*.elf)
 * SDK: ps5-payload-dev/sdk v0.45 (Shared ~1.6 GiB RAM with SceShellUI)
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <sys/stat.h>
#include <netinet/in.h>
#include <sys/socket.h>

static const char* resolve_storage_dir(void) {
    const char* primary = "/data/${safeName}";
    if (mkdir(primary, 0777) == 0 || errno == EEXIST) {
        if (access(primary, W_OK) == 0) {
            return primary;
        }
    }
    return "/download0";
}

int main(void) {
    const char* data_dir = resolve_storage_dir();
    printf("[${safeName}] Started on PS5 FW 13.60. Storage: %s\\n", data_dir);

    int server_fd = -1;
    while (1) {
        if (server_fd < 0) {
            server_fd = socket(AF_INET, SOCK_STREAM, 0);
            if (server_fd >= 0) {
                int opt = 1;
                setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
                struct sockaddr_in addr = {0};
                addr.sin_family = AF_INET;
                addr.sin_addr.s_addr = htonl(INADDR_ANY);
                addr.sin_port = htons(${config.webuiPort});
                if (bind(server_fd, (struct sockaddr*)&addr, sizeof(addr)) == 0) {
                    listen(server_fd, 4);
                } else {
                    close(server_fd);
                    server_fd = -1;
                }
            }
        }
        /* S3 Resume / Rest Mode resilience: reinitialize socket if network resets */
        sleep(5);
    }
    return 0;
}
`;

    return [
      {
        path: 'Makefile',
        language: 'makefile',
        description: 'Сборка .elf через ps5-payload-dev/sdk v0.45 и отправка в elfldr (порт 9021)',
        content: makefileContent,
      },
      {
        path: 'src/main.c',
        language: 'c',
        description: 'Точка входа фонового ELF-демона с поддержкой S3 Resume и fallback-хранилища',
        content: mainCContent,
      },
    ];
  },

  generateDeployCommands(config: ProjectScaffoldConfig): string {
    const safeName = config.projectName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'ps5_daemon';
    return `# 1. Настройка окружения ps5-payload-dev/sdk v0.45
export PS5_PAYLOAD_SDK=/opt/ps5-payload-sdk
export PS5_HOST=${config.ps5Ip}
export PS5_PORT=${config.elfldrPort}

# 2. Сборка и прямая отправка ELF-пэйлоада в elfldr (TCP 9021)
make clean && make
nc -w 10 $PS5_HOST $PS5_PORT < build/${safeName}.elf`;
  },
};
