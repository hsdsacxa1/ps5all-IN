import { FirmwareOffsetRecord, PayloadHeaderConfig } from '../../../types/payloadHeader';
import { ElfLoaderVariantStrategy } from '../types';

export const elfldrSdkStrategy: ElfLoaderVariantStrategy = {
  id: 'elfldr-sdk-v045',
  label: 'Standard elfldr v0.27 (ps5-payload-dev/sdk v0.45)',
  shortBadge: 'TCP :9021',
  description:
    'Стандартный шаблон для ELF-пэйлоадов под ps5-payload-dev/sdk v0.45 и загрузчик elfldr (порт 9021).',
  buildLoaderSection(
    _config: PayloadHeaderConfig,
    fw: FirmwareOffsetRecord,
    prefix: string
  ): string {
    return `/* --- Standard elfldr v0.27 / ps5-payload-dev/sdk v0.45 ABI --- */
#define ${prefix}_ELFLDR_PORT               9021
#define ${prefix}_ELFLDR_ENTRY_HOOK         ${fw.offsets.elfldrEntryHook}
#define ${prefix}_SCE_KERNEL_DLSYM_OFF      ${fw.offsets.sceKernelDlsymOffset}

typedef struct ${prefix.toLowerCase()}_payload_args {
    uint64_t sce_kernel_dlsym;
    int     *rw_pipe;
    uint64_t rwpair_kdata_base;
    int     *payload_out;
    uint64_t fw_version;
} ${prefix.toLowerCase()}_payload_args_t;

#define ${prefix}_ENTRY_MAIN(args_ptr) \\
    int ${prefix.toLowerCase()}_payload_main(${prefix.toLowerCase()}_payload_args_t *(args_ptr))`;
  },
};
