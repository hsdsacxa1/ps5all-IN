import { BinaryFormatKind } from '../types/elf';

export interface BinaryMagicMatcher {
  readonly kind: BinaryFormatKind;
  readonly label: string;
  matches(bytes: Uint8Array): boolean;
}

const BINARY_MAGIC_MATCHERS: BinaryMagicMatcher[] = [
  {
    kind: 'elf64-prospero',
    label: 'ELF64 Executable / Payload (x86-64 FreeBSD / Prospero)',
    matches(bytes) {
      return (
        bytes.length >= 64 &&
        bytes[0] === 0x7f &&
        bytes[1] === 0x45 && // 'E'
        bytes[2] === 0x4c && // 'L'
        bytes[3] === 0x46 && // 'F'
        bytes[4] === 2       // ELFCLASS64
      );
    },
  },
  {
    kind: 'ps5-fself',
    label: 'PS5 Signed Fake-SELF (FSELF / eboot.bin)',
    matches(bytes) {
      // PS4/PS5 SELF/FSELF magic: 0x4F 0x15 0x3D 0x1D or 0x54 0x14 0xF5 0xEE
      if (bytes.length < 32) return false;
      const isOrbisSelf =
        bytes[0] === 0x4f && bytes[1] === 0x15 && bytes[2] === 0x3d && bytes[3] === 0x1d;
      const isProsperoSelf =
        bytes[0] === 0x54 && bytes[1] === 0x14 && bytes[2] === 0xf5 && bytes[3] === 0xee;
      return isOrbisSelf || isProsperoSelf;
    },
  },
];

export function detectBinaryFormat(bytes: Uint8Array): {
  kind: BinaryFormatKind;
  label: string;
} {
  for (const matcher of BINARY_MAGIC_MATCHERS) {
    if (matcher.matches(bytes)) {
      return { kind: matcher.kind, label: matcher.label };
    }
  }
  return {
    kind: 'unknown-binary',
    label: 'Raw / Non-ELF Binary Stream',
  };
}

export const ELF_OSABI_LABELS: Record<number, string> = {
  0: 'UNIX System V',
  9: 'FreeBSD (PS5 / Prospero Native ABI)',
  12: 'OpenBSD',
};

export const ELF_TYPE_LABELS: Record<number, string> = {
  0: 'ET_NONE',
  1: 'ET_REL (Relocatable)',
  2: 'ET_EXEC (Executable Payload)',
  3: 'ET_DYN (PIE / Shared Object / Title eboot)',
  4: 'ET_CORE',
  0xfe00: 'ET_SCE_EXEC (PlayStation Executable)',
  0xfe10: 'ET_SCE_DYNEXEC (PlayStation ASLR Title)',
  0xfe18: 'ET_SCE_DYNAMIC (PlayStation PRX / SPRX)',
};

export const ELF_PHDR_TYPE_LABELS: Record<number, string> = {
  0: 'PT_NULL',
  1: 'PT_LOAD',
  2: 'PT_DYNAMIC',
  3: 'PT_INTERP',
  4: 'PT_NOTE',
  6: 'PT_PHDR',
  7: 'PT_TLS',
  0x6474e550: 'PT_GNU_EH_FRAME',
  0x6474e551: 'PT_GNU_STACK',
  0x6474e552: 'PT_GNU_RELRO',
  0x61000000: 'PT_SCE_RELA',
  0x61000001: 'PT_SCE_DYNLIBDATA',
  0x61000002: 'PT_SCE_PROCPARAM',
  0x61000010: 'PT_SCE_RELRO',
};

export const ELF_SHDR_TYPE_LABELS: Record<number, string> = {
  0: 'SHT_NULL',
  1: 'SHT_PROGBITS',
  2: 'SHT_SYMTAB',
  3: 'SHT_STRTAB',
  4: 'SHT_RELA',
  5: 'SHT_HASH',
  6: 'SHT_DYNAMIC',
  7: 'SHT_NOTE',
  8: 'SHT_NOBITS (.bss)',
  9: 'SHT_REL',
  11: 'SHT_DYNSYM',
};

export const FORBIDDEN_PS5_TITLE_IMPORTS = new Set<string>([
  'statvfs',
  'statfs',
  'fstatvfs',
  'fstatfs',
]);
