import { FirmwareOffsetRecord, PayloadHeaderConfig } from '../../../types/payloadHeader';
import { ElfLoaderVariantStrategy } from '../types';

export const libkernelSyscallStrategy: ElfLoaderVariantStrategy = {
  id: 'libkernel-syscall-stub',
  label: 'Minimal libkernel Syscall Stub (No-libc)',
  shortBadge: 'Syscall Stub',
  description:
    'Облегчённый ELF-заголовок без внешних зависимостей с прямыми макросами системных вызовов FreeBSD/Prospero.',
  buildLoaderSection(
    _config: PayloadHeaderConfig,
    fw: FirmwareOffsetRecord,
    prefix: string
  ): string {
    return `/* --- Minimal libkernel Syscall Stub (Zero-Dependency ELF) --- */
#define ${prefix}_SYS_EXIT                  1
#define ${prefix}_SYS_READ                  3
#define ${prefix}_SYS_WRITE                 4
#define ${prefix}_SYS_GETPID                20
#define ${prefix}_SYS_MPROTECT              74
#define ${prefix}_ELFLDR_ENTRY_HOOK         ${fw.offsets.elfldrEntryHook}
#define ${prefix}_SCE_KERNEL_DLSYM_OFF      ${fw.offsets.sceKernelDlsymOffset}

#if defined(__x86_64__)
static inline int64_t ${prefix.toLowerCase()}_syscall3(int64_t num, uint64_t a1, uint64_t a2, uint64_t a3) {
    int64_t ret;
    __asm__ volatile (
        "syscall"
        : "=a"(ret)
        : "a"(num), "D"(a1), "S"(a2), "d"(a3)
        : "rcx", "r11", "memory"
    );
    return ret;
}
#endif`;
  },
};
