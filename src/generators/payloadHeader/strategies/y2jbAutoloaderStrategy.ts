import { FirmwareOffsetRecord, PayloadHeaderConfig } from '../../../types/payloadHeader';
import { ElfLoaderVariantStrategy } from '../types';

export const y2jbAutoloaderStrategy: ElfLoaderVariantStrategy = {
  id: 'y2jb-autoloader',
  label: 'Y2JB Autoloader v1.1.0 (YouTube Entry)',
  shortBadge: 'Y2JB / DNS 127.0.0.2',
  description:
    'Совместимый с Gezine/Y2JB и ps5-y2jb-autoloader заголовок для цепочки Relapse-Exploit.',
  buildLoaderSection(
    _config: PayloadHeaderConfig,
    fw: FirmwareOffsetRecord,
    prefix: string
  ): string {
    return `/* --- Y2JB Autoloader v1.1.0 / Relapse-Exploit Entry ABI --- */
#define ${prefix}_Y2JB_TITLE_ID             "PPSA01650"
#define ${prefix}_Y2JB_HANDOFF_PORT         9021
#define ${prefix}_ELFLDR_ENTRY_HOOK         ${fw.offsets.elfldrEntryHook}
#define ${prefix}_SCE_KERNEL_DLSYM_OFF      ${fw.offsets.sceKernelDlsymOffset}

typedef struct ${prefix.toLowerCase()}_y2jb_ctx {
    uint32_t fw_version;
    uint32_t flags;
    uint64_t kdata_base;
    uint64_t dlsym_addr;
    int      pipe_read_fd;
    int      pipe_write_fd;
} ${prefix.toLowerCase()}_y2jb_ctx_t;

static inline int ${prefix.toLowerCase()}_is_relapse_ready(const ${prefix.toLowerCase()}_y2jb_ctx_t *ctx) {
    return (ctx != NULL) && (ctx->kdata_base >= ${prefix}_KERNEL_BASE_MASK) && (ctx->fw_version == ${prefix}_TARGET_FW);
}`;
  },
};
