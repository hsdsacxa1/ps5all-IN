import { FIRMWARE_OFFSET_MAP } from '../../data/firmwareOffsetsData';
import {
  ElfLoaderEntryVariant,
  GeneratedHeaderResult,
  PayloadHeaderConfig,
} from '../../types/payloadHeader';
import { byepervisorS3Strategy } from './strategies/byepervisorS3Strategy';
import { elfldrSdkStrategy } from './strategies/elfldrSdkStrategy';
import { libkernelSyscallStrategy } from './strategies/libkernelSyscallStrategy';
import { y2jbAutoloaderStrategy } from './strategies/y2jbAutoloaderStrategy';
import { ElfLoaderVariantStrategy } from './types';

export const ELF_LOADER_VARIANT_REGISTRY: Record<
  ElfLoaderEntryVariant,
  ElfLoaderVariantStrategy
> = {
  'elfldr-sdk-v045': elfldrSdkStrategy,
  'y2jb-autoloader': y2jbAutoloaderStrategy,
  'byepervisor-s3': byepervisorS3Strategy,
  'libkernel-syscall-stub': libkernelSyscallStrategy,
};

export const ELF_LOADER_VARIANTS: readonly ElfLoaderVariantStrategy[] =
  Object.values(ELF_LOADER_VARIANT_REGISTRY);

export const DEFAULT_PAYLOAD_HEADER_CONFIG: PayloadHeaderConfig = {
  firmwareId: 'fw-1360',
  loaderVariant: 'elfldr-sdk-v045',
  fileName: 'ps5_payload_offsets.h',
  headerGuard: 'PS5_PAYLOAD_OFFSETS_H',
  namespacePrefix: 'PS5_LDR',
  includeElf64Boilerplate: true,
  includeKernelReadWriteMacros: true,
  includeSandboxEscapeHelpers: true,
  includeS3ResumeCheck: true,
  customKernelDataBaseOverride: '',
};

export function sanitizeCIdentifier(raw: string, fallback: string): string {
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/^_+/, '')
    .replace(/_+/g, '_');
  if (!cleaned) {
    return fallback;
  }
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
}

export function sanitizeHeaderFileName(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .replace(/^\.+/, '');
  if (!cleaned) {
    return 'ps5_payload_offsets.h';
  }
  return cleaned.endsWith('.h') || cleaned.endsWith('.hpp')
    ? cleaned
    : `${cleaned}.h`;
}

export function isValidHexAddress(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }
  return /^0x[0-9a-fA-F]{1,16}(?:U|UL|ULL)?$/.test(trimmed);
}

function buildElf64BoilerplateSection(prefix: string): string {
  return `/* --- Standard ELF64 Loader Header & Segment Macros --- */
#define ${prefix}_ELF64_MAGIC                0x464C457FU /* "\\x7FELF" LE */
#define ${prefix}_ELF_PT_LOAD                1U
#define ${prefix}_ELF_PT_DYNAMIC             2U
#define ${prefix}_ELF_PF_X                   0x1U
#define ${prefix}_ELF_PF_W                   0x2U
#define ${prefix}_ELF_PF_R                   0x4U
#define ${prefix}_PAGE_SIZE                  0x4000ULL   /* PS5 16 KiB page */

typedef struct ${prefix.toLowerCase()}_elf64_ehdr {
    uint8_t  e_ident[16];
    uint16_t e_type;
    uint16_t e_machine;
    uint32_t e_version;
    uint64_t e_entry;
    uint64_t e_phoff;
    uint64_t e_shoff;
    uint32_t e_flags;
    uint16_t e_ehsize;
    uint16_t e_phentsize;
    uint16_t e_phnum;
    uint16_t e_shentsize;
    uint16_t e_shnum;
    uint16_t e_shstrndx;
} ${prefix.toLowerCase()}_elf64_ehdr_t;

typedef struct ${prefix.toLowerCase()}_elf64_phdr {
    uint32_t p_type;
    uint32_t p_flags;
    uint64_t p_offset;
    uint64_t p_vaddr;
    uint64_t p_paddr;
    uint64_t p_filesz;
    uint64_t p_memsz;
    uint64_t p_align;
} ${prefix.toLowerCase()}_elf64_phdr_t;`;
}

function buildKernelRwSection(prefix: string): string {
  return `/* --- Kernel R/W Address Resolution Helpers --- */
#define ${prefix}_RESOLVE_KDATA(kbase, off)  ((uint64_t)(kbase) + (uint64_t)(off))
#define ${prefix}_ALIGN_PAGE_UP(sz)          (((uint64_t)(sz) + (${prefix}_PAGE_SIZE - 1ULL)) & ~(${prefix}_PAGE_SIZE - 1ULL))

static inline uint64_t ${prefix.toLowerCase()}_get_allproc_addr(uint64_t kdata_base) {
    return ${prefix}_RESOLVE_KDATA(kdata_base, ${prefix}_OFF_ALLPROC);
}

static inline uint64_t ${prefix.toLowerCase()}_get_prison0_addr(uint64_t kdata_base) {
    return ${prefix}_RESOLVE_KDATA(kdata_base, ${prefix}_OFF_PRISON0);
}`;
}

function buildSandboxEscapeSection(prefix: string): string {
  return `/* --- Privilege Escalation & Sandbox Escape Targets --- */
#define ${prefix}_SANDBOX_ROOTVNODE_OFF       ${prefix}_OFF_ROOTVNODE
#define ${prefix}_QA_FLAGS_DEBUG_BIT         (1ULL << 1)
#define ${prefix}_SECURITY_FLAGS_UNLOCK      0x14U
#define ${prefix}_UTOKEN_DEBUG_CAP           0x4000000000000000ULL`;
}

function buildS3ResumeSection(prefix: string): string {
  return `/* --- Rest Mode (S3 Resume) Socket & State Guard --- */
#define ${prefix}_S3_REINIT_DELAY_US         250000U
#define ${prefix}_IS_KADDR_CANONICAL(addr)   (((uint64_t)(addr) & ${prefix}_KERNEL_BASE_MASK) == ${prefix}_KERNEL_BASE_MASK)`;
}

export function generatePayloadHeaderTemplate(
  config: PayloadHeaderConfig
): GeneratedHeaderResult {
  const fw = FIRMWARE_OFFSET_MAP[config.firmwareId] ?? FIRMWARE_OFFSET_MAP['fw-1360'];
  const strategy =
    ELF_LOADER_VARIANT_REGISTRY[config.loaderVariant] ??
    ELF_LOADER_VARIANT_REGISTRY['elfldr-sdk-v045'];

  const headerGuard = sanitizeCIdentifier(
    config.headerGuard,
    'PS5_PAYLOAD_OFFSETS_H'
  );
  const prefix = sanitizeCIdentifier(config.namespacePrefix, 'PS5_LDR');
  const fileName = sanitizeHeaderFileName(config.fileName);

  const warnings: string[] = [];
  const rawOverride = config.customKernelDataBaseOverride.trim();
  let effectiveKdataBase = fw.offsets.kernelDataBaseHint;

  if (rawOverride.length > 0) {
    if (isValidHexAddress(rawOverride)) {
      effectiveKdataBase = rawOverride.endsWith('ULL') || rawOverride.endsWith('UL') || rawOverride.endsWith('U')
        ? rawOverride
        : `${rawOverride}ULL`;
    } else {
      warnings.push(
        `Некорректный hex-адрес override "${rawOverride}" — использован базовый адрес ${fw.offsets.kernelDataBaseHint}.`
      );
    }
  }

  if (
    config.loaderVariant === 'byepervisor-s3' &&
    !['fw-1360', 'fw-1320', 'fw-1300', 'fw-451'].includes(fw.id)
  ) {
    warnings.push(
      `Byepervisor-Reborn официально подтверждён для FW 4.51, 13.00, 13.20 и 13.60 (выбрана ${fw.fwNumber}).`
    );
  }

  const sections: string[] = [
    `/**
 * @file ${fileName}
 * @brief PS5 Firmware ${fw.fwNumber} ELF Loader Payload Offsets & Template
 * @target ${fw.fwLabel}
 * @sdk    ${fw.sdkTarget}
 * @entry  ${fw.entryVector}
 * @hen    ${fw.kstuffSupport}
 *
 * NOTE: Offsets are relative to resolved kernel_data_base (kdata_base).
 *       Always verify runtime kdata_base via your kernel R/W primitive before patching.
 */

#ifndef ${headerGuard}
#define ${headerGuard}

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/* --- Target Firmware Identification --- */
#define ${prefix}_TARGET_FW                  ${fw.fwHex}
#define ${prefix}_TARGET_FW_STR              "${fw.fwNumber}"
#define ${prefix}_KERNEL_BASE_MASK           ${fw.offsets.kernelBaseMask}
#define ${prefix}_KDATA_BASE_HINT            ${effectiveKdataBase}

/* --- Kernel Data Offsets (Relative to kdata_base) --- */
#define ${prefix}_OFF_ALLPROC                ${fw.offsets.allproc}
#define ${prefix}_OFF_PRISON0                ${fw.offsets.prison0}
#define ${prefix}_OFF_ROOTVNODE              ${fw.offsets.rootvnode}
#define ${prefix}_OFF_SECURITY_FLAGS         ${fw.offsets.securityFlags}
#define ${prefix}_OFF_QA_FLAGS               ${fw.offsets.qaFlags}
#define ${prefix}_OFF_UTOKEN_FLAGS           ${fw.offsets.utokenFlags}`,
    strategy.buildLoaderSection(config, fw, prefix),
  ];

  if (config.includeElf64Boilerplate) {
    sections.push(buildElf64BoilerplateSection(prefix));
  }
  if (config.includeKernelReadWriteMacros) {
    sections.push(buildKernelRwSection(prefix));
  }
  if (config.includeSandboxEscapeHelpers) {
    sections.push(buildSandboxEscapeSection(prefix));
  }
  if (config.includeS3ResumeCheck) {
    sections.push(buildS3ResumeSection(prefix));
  }

  sections.push(`#ifdef __cplusplus
}
#endif

#endif /* ${headerGuard} */
`);

  const content = sections.join('\n\n');
  const lines = content.split('\n');
  const macroCount = lines.filter((line) => line.startsWith('#define ')).length;

  return {
    fileName,
    headerGuard,
    content,
    lineCount: lines.length,
    macroCount,
    firmware: fw,
    loaderLabel: strategy.label,
    validationWarnings: warnings,
  };
}
