import { FirmwareOffsetRecord, PayloadHeaderConfig } from '../../../types/payloadHeader';
import { ElfLoaderVariantStrategy } from '../types';

export const byepervisorS3Strategy: ElfLoaderVariantStrategy = {
  id: 'byepervisor-s3',
  label: 'Byepervisor-Reborn (S3 Resume / XOM Bypass)',
  shortBadge: 'HV / .text R/W',
  description:
    'Шаблон для R&D пэйлоадов с поддержкой Byepervisor-Reborn (отключение XOM через S3 Resume и R/W к .text ядра).',
  buildLoaderSection(
    _config: PayloadHeaderConfig,
    fw: FirmwareOffsetRecord,
    prefix: string
  ): string {
    return `/* --- Byepervisor-Reborn S3 Resume / XOM Bypass ABI --- */
#define ${prefix}_HV_REQUIRED_S3_RESUME     1
#define ${prefix}_HV_CR0_WP_MASK            (1ULL << 16)
#define ${prefix}_ELFLDR_ENTRY_HOOK         ${fw.offsets.elfldrEntryHook}
#define ${prefix}_SCE_KERNEL_DLSYM_OFF      ${fw.offsets.sceKernelDlsymOffset}

typedef struct ${prefix.toLowerCase()}_hv_state {
    uint64_t kernel_text_base;
    uint64_t kernel_data_base;
    uint32_t xom_disabled;
    uint32_t s3_resume_count;
} ${prefix.toLowerCase()}_hv_state_t;

static inline int ${prefix.toLowerCase()}_hv_text_rw_available(const ${prefix.toLowerCase()}_hv_state_t *hv) {
    return (hv != NULL) && (hv->xom_disabled != 0U) && (hv->s3_resume_count > 0U);
}`;
  },
};
