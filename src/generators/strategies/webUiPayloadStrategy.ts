import { GeneratedFileArtifact, ProjectScaffoldConfig } from '../../types/ps5';
import { ArchitectureStrategy } from './types';

export const webUiPayloadStrategy: ArchitectureStrategy = {
  id: 'payload-webui',
  label: 'ELF Payload + HTTP WebUI (libmicrohttpd)',
  generateFiles(config: ProjectScaffoldConfig): GeneratedFileArtifact[] {
    const safeName = config.projectName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'ps5_webui';
    const makefileContent = `# Target: PS5 FW 13.60 Payload + HTTP WebUI (ps5-payload-dev/sdk v0.45 + pacbrew)
PS5_PAYLOAD_SDK ?= /opt/ps5-payload-sdk
PS5_HOST ?= ${config.ps5Ip}
PS5_PORT ?= ${config.elfldrPort}

include $(PS5_PAYLOAD_SDK)/toolchain/prospero.mk

TARGET := build/${safeName}_webui.elf
SRCS := src/webui_server.c

CFLAGS := -O2 -Wall -Wextra -std=c11
LDFLAGS := -lmicrohttpd -lcurl -lmbedtls -lmbedx509 -lmbedcrypto -lpthread

.PHONY: all deploy clean

all: $(TARGET)

$(TARGET): $(SRCS)
\t@mkdir -p build
\t$(CC) $(CFLAGS) $(SRCS) $(LDFLAGS) -o $(TARGET)

deploy: $(TARGET)
\tnc -w 10 $(PS5_HOST) $(PS5_PORT) < $(TARGET)

clean:
\trm -rf build
`;

    const serverCContent = `/**
 * Project: ${config.projectName} (HTTP WebUI Payload)
 * Target: PS5 Firmware 13.60 | Port: ${config.webuiPort}
 * Stack: ps5-payload-dev/sdk v0.45 + libmicrohttpd + mbedTLS (/system/common/cert/CA_LIST)
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>
#include <sys/stat.h>
#include <microhttpd.h>

#define WEBUI_PORT ${config.webuiPort}
#define SYSTEM_CA_BUNDLE "/system/common/cert/CA_LIST"

static enum MHD_Result handle_request(
    void *cls,
    struct MHD_Connection *connection,
    const char *url,
    const char *method,
    const char *version,
    const char *upload_data,
    size_t *upload_data_size,
    void **con_cls
) {
    (void)cls; (void)version; (void)upload_data; (void)upload_data_size; (void)con_cls;

    if (strcmp(url, "/api/status") == 0 && strcmp(method, "GET") == 0) {
        const char *json = "{\\"service\\":\\"${safeName}\\",\\"fw\\":\\"13.60\\",\\"ca_list\\":\\"" SYSTEM_CA_BUNDLE "\\"}\\n";
        struct MHD_Response *resp = MHD_create_response_from_buffer(
            strlen(json), (void *)json, MHD_RESPMEM_PERSISTENT
        );
        MHD_add_response_header(resp, "Content-Type", "application/json");
        enum MHD_Result ret = MHD_queue_response(connection, MHD_HTTP_OK, resp);
        MHD_destroy_response(resp);
        return ret;
    }

    const char *html = "<!doctype html><html><head><meta charset='utf-8'><title>${safeName}</title></head>"
                       "<body><h1>${safeName} WebUI (PS5 FW 13.60)</h1><p>Listening on port ${config.webuiPort}</p></body></html>";
    struct MHD_Response *resp = MHD_create_response_from_buffer(
        strlen(html), (void *)html, MHD_RESPMEM_PERSISTENT
    );
    MHD_add_response_header(resp, "Content-Type", "text/html; charset=utf-8");
    enum MHD_Result ret = MHD_queue_response(connection, MHD_HTTP_OK, resp);
    MHD_destroy_response(resp);
    return ret;
}

int main(void) {
    struct MHD_Daemon *daemon = MHD_start_daemon(
        MHD_USE_INTERNAL_POLLING_THREAD,
        WEBUI_PORT,
        NULL, NULL,
        &handle_request, NULL,
        MHD_OPTION_END
    );
    if (!daemon) {
        fprintf(stderr, "[${safeName}] Failed to bind port %d\\n", WEBUI_PORT);
        return 1;
    }
    printf("[${safeName}] WebUI active at http://${config.ps5Ip}:%d\\n", WEBUI_PORT);
    while (1) {
        sleep(10);
    }
    MHD_stop_daemon(daemon);
    return 0;
}
`;

    return [
      {
        path: 'Makefile',
        language: 'makefile',
        description: 'Сборка ELF-сервера с libmicrohttpd и статическим TLS из pacbrew-repo',
        content: makefileContent,
      },
      {
        path: 'src/webui_server.c',
        language: 'c',
        description: 'HTTP-сервер на базе libmicrohttpd с JSON эндпоинтом /api/status и CA_LIST',
        content: serverCContent,
      },
    ];
  },

  generateDeployCommands(config: ProjectScaffoldConfig): string {
    const safeName = config.projectName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'ps5_webui';
    return `# 1. Сборка с пакетами pacbrew (libmicrohttpd, libcurl, mbedtls)
export PS5_PAYLOAD_SDK=/opt/ps5-payload-sdk
export PS5_HOST=${config.ps5Ip}
make

# 2. Загрузка в elfldr (порт ${config.elfldrPort}) и открытие WebUI
nc -w 10 $PS5_HOST ${config.elfldrPort} < build/${safeName}_webui.elf
echo "WebUI доступен по адресу: http://${config.ps5Ip}:${config.webuiPort}"`;
  },
};
