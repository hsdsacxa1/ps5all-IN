import {
  ElfHeaderInfo,
  ElfProgramHeader,
  ElfSectionHeader,
  ElfSymbolEntry,
  ExtractedBinaryString,
  ParsedElfReport,
} from '../types/elf';
import { auditParsedElf } from './elfCompatibilityAuditor';
import {
  detectBinaryFormat,
  ELF_OSABI_LABELS,
  ELF_PHDR_TYPE_LABELS,
  ELF_SHDR_TYPE_LABELS,
  ELF_TYPE_LABELS,
  FORBIDDEN_PS5_TITLE_IMPORTS,
} from './magicMatchers';

function toHex64(val: bigint): string {
  return '0x' + val.toString(16).toUpperCase().padStart(8, '0');
}

function readNullTerminatedAscii(bytes: Uint8Array, startOffset: number, maxLen = 256): string {
  if (startOffset < 0 || startOffset >= bytes.length) return '';
  const endLimit = Math.min(bytes.length, startOffset + maxLen);
  let out = '';
  for (let i = startOffset; i < endLimit; i++) {
    const code = bytes[i];
    if (code === 0) break;
    if (code >= 32 && code <= 126) {
      out += String.fromCharCode(code);
    }
  }
  return out;
}

function formatPhdrFlags(flags: number): string {
  const r = (flags & 0x4) !== 0 ? 'R' : '-';
  const w = (flags & 0x2) !== 0 ? 'W' : '-';
  const x = (flags & 0x1) !== 0 ? 'X' : '-';
  return `${r}${w}${x}`;
}

export function buildHexHeaderDump(bytes: Uint8Array, maxBytes = 128): string[] {
  const limit = Math.min(bytes.length, maxBytes);
  const lines: string[] = [];
  for (let offset = 0; offset < limit; offset += 16) {
    const slice = bytes.subarray(offset, Math.min(limit, offset + 16));
    const hexPart = Array.from(slice)
      .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ')
      .padEnd(47, ' ');
    const asciiPart = Array.from(slice)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('');
    lines.push(
      `${offset.toString(16).toUpperCase().padStart(4, '0')}:  ${hexPart}  |${asciiPart}|`
    );
  }
  return lines;
}

export function extractInterestingStrings(bytes: Uint8Array): ExtractedBinaryString[] {
  const results: ExtractedBinaryString[] = [];
  const seen = new Set<string>();
  let current = '';
  let startOffset = 0;

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed.length >= 5 && !seen.has(trimmed)) {
      const isPath =
        trimmed.startsWith('/data') ||
        trimmed.startsWith('/app0') ||
        trimmed.startsWith('/download0') ||
        trimmed.startsWith('/system/') ||
        trimmed.startsWith('/dev/');
      const isSprx =
        trimmed.endsWith('.sprx') ||
        trimmed.endsWith('.prx') ||
        trimmed.endsWith('.so') ||
        trimmed.includes('libkernel') ||
        trimmed.includes('libSce');

      if (isPath || isSprx || results.length < 40) {
        seen.add(trimmed);
        results.push({
          offsetHex: '0x' + startOffset.toString(16).toUpperCase().padStart(6, '0'),
          value: trimmed,
          category: isPath ? 'ps5-path' : isSprx ? 'sprx-module' : 'symbol-or-literal',
        });
      }
    }
    current = '';
  };

  const scanLimit = Math.min(bytes.length, 256 * 1024);
  for (let i = 0; i < scanLimit; i++) {
    const b = bytes[i];
    if (b >= 32 && b <= 126) {
      if (current.length === 0) startOffset = i;
      current += String.fromCharCode(b);
    } else {
      if (current.length > 0) flush();
    }
  }
  if (current.length > 0) flush();

  return results.slice(0, 60);
}

function findEmbeddedElfOffset(
  bytes: Uint8Array,
  kind: ReturnType<typeof detectBinaryFormat>['kind']
): number {
  if (kind !== 'ps5-fself') return 0;
  const searchLimit = Math.min(bytes.length - 64, 4096);
  for (let i = 16; i < searchLimit; i++) {
    if (
      bytes[i] === 0x7f &&
      bytes[i + 1] === 0x45 &&
      bytes[i + 2] === 0x4c &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 2
    ) {
      return i;
    }
  }
  return 0;
}

function isElf64AtOffset(bytes: Uint8Array, elfOffset: number): boolean {
  return (
    bytes.length >= elfOffset + 64 &&
    bytes[elfOffset] === 0x7f &&
    bytes[elfOffset + 1] === 0x45 &&
    bytes[elfOffset + 2] === 0x4c &&
    bytes[elfOffset + 3] === 0x46 &&
    bytes[elfOffset + 4] === 2
  );
}

function createFallbackHeader(
  detected: ReturnType<typeof detectBinaryFormat>,
  fileSize: number
): ElfHeaderInfo {
  return {
    formatKind: detected.kind,
    formatLabel: detected.label,
    is64Bit: false,
    littleEndian: true,
    osAbi: 0,
    osAbiLabel: 'Unknown / Non-ELF',
    eType: 0,
    eTypeLabel: 'N/A',
    eMachine: 0,
    eMachineLabel: 'N/A',
    entryPointHex: '0x00000000',
    phoff: 0,
    shoff: 0,
    phnum: 0,
    shnum: 0,
    shstrndx: 0,
    fileSize,
  };
}

interface RawElfHeaderTables {
  readonly header: ElfHeaderInfo;
  readonly littleEndian: boolean;
  readonly phentsize: number;
  readonly shentsize: number;
}

function parseElfHeader(
  bytes: Uint8Array,
  view: DataView,
  elfOffset: number,
  detected: ReturnType<typeof detectBinaryFormat>
): RawElfHeaderTables {
  const littleEndian = bytes[elfOffset + 5] !== 2;
  const osAbi = bytes[elfOffset + 7];
  const eType = view.getUint16(elfOffset + 16, littleEndian);
  const eMachine = view.getUint16(elfOffset + 18, littleEndian);
  const entryPoint = view.getBigUint64(elfOffset + 24, littleEndian);
  const phoff = Number(view.getBigUint64(elfOffset + 32, littleEndian));
  const shoff = Number(view.getBigUint64(elfOffset + 40, littleEndian));
  const phentsize = view.getUint16(elfOffset + 54, littleEndian) || 56;
  const phnum = view.getUint16(elfOffset + 56, littleEndian);
  const shentsize = view.getUint16(elfOffset + 58, littleEndian) || 64;
  const shnum = view.getUint16(elfOffset + 60, littleEndian);
  const shstrndx = view.getUint16(elfOffset + 62, littleEndian);

  return {
    littleEndian,
    phentsize,
    shentsize,
    header: {
      formatKind: detected.kind,
      formatLabel: detected.label,
      is64Bit: true,
      littleEndian,
      osAbi,
      osAbiLabel: ELF_OSABI_LABELS[osAbi] || `OSABI_${osAbi}`,
      eType,
      eTypeLabel: ELF_TYPE_LABELS[eType] || `0x${eType.toString(16)}`,
      eMachine,
      eMachineLabel:
        eMachine === 0x3e
          ? 'AMD x86-64 (PS5 Zen 2)'
          : `Machine 0x${eMachine.toString(16)}`,
      entryPointHex: toHex64(entryPoint),
      phoff,
      shoff,
      phnum,
      shnum,
      shstrndx,
      fileSize: bytes.length,
    },
  };
}

function parseProgramHeaders(
  bytesLength: number,
  view: DataView,
  elfOffset: number,
  tables: RawElfHeaderTables
): { programHeaders: ElfProgramHeader[]; totalLoadMemBytes: number } {
  const programHeaders: ElfProgramHeader[] = [];
  let totalLoadMemBytes = 0;
  const { header, littleEndian, phentsize } = tables;
  const maxPh = Math.min(header.phnum, 64);

  for (let i = 0; i < maxPh; i++) {
    const base = elfOffset + header.phoff + i * phentsize;
    if (base + 56 > bytesLength) break;
    const pType = view.getUint32(base, littleEndian);
    const pFlags = view.getUint32(base + 4, littleEndian);
    const pOffset = view.getBigUint64(base + 8, littleEndian);
    const pVaddr = view.getBigUint64(base + 16, littleEndian);
    const pFilesz = Number(view.getBigUint64(base + 32, littleEndian));
    const pMemsz = Number(view.getBigUint64(base + 40, littleEndian));
    const pAlign = Number(view.getBigUint64(base + 48, littleEndian));

    if (pType === 1) {
      totalLoadMemBytes += pMemsz;
    }

    programHeaders.push({
      index: i,
      pType,
      typeLabel:
        ELF_PHDR_TYPE_LABELS[pType] || `0x${pType.toString(16).toUpperCase()}`,
      flags: pFlags,
      flagsLabel: formatPhdrFlags(pFlags),
      offsetHex: toHex64(pOffset),
      vaddrHex: toHex64(pVaddr),
      filesz: pFilesz,
      memsz: pMemsz,
      align: pAlign,
    });
  }

  return { programHeaders, totalLoadMemBytes };
}

function parseSectionHeaders(
  bytes: Uint8Array,
  view: DataView,
  elfOffset: number,
  tables: RawElfHeaderTables
): ElfSectionHeader[] {
  const sectionHeaders: ElfSectionHeader[] = [];
  const { header, littleEndian, shentsize } = tables;
  const maxSh = Math.min(header.shnum, 128);
  let shstrtabOffset = 0;

  if (header.shoff > 0 && header.shstrndx < maxSh) {
    const strShBase = elfOffset + header.shoff + header.shstrndx * shentsize;
    if (strShBase + 64 <= bytes.length) {
      shstrtabOffset =
        elfOffset + Number(view.getBigUint64(strShBase + 24, littleEndian));
    }
  }

  for (let i = 0; i < maxSh; i++) {
    const base = elfOffset + header.shoff + i * shentsize;
    if (header.shoff === 0 || base + 64 > bytes.length) break;
    const shNameIdx = view.getUint32(base, littleEndian);
    const shType = view.getUint32(base + 4, littleEndian);
    const shAddr = view.getBigUint64(base + 16, littleEndian);
    const shOffset = Number(view.getBigUint64(base + 24, littleEndian));
    const shSize = Number(view.getBigUint64(base + 32, littleEndian));
    const shLink = view.getUint32(base + 40, littleEndian);
    const shEntsize = Number(view.getBigUint64(base + 56, littleEndian));

    const name =
      shstrtabOffset > 0
        ? readNullTerminatedAscii(bytes, shstrtabOffset + shNameIdx)
        : `.sec_${i}`;

    sectionHeaders.push({
      index: i,
      name: name || (i === 0 ? 'NULL' : `.sec_${i}`),
      shType,
      typeLabel: ELF_SHDR_TYPE_LABELS[shType] || `0x${shType.toString(16)}`,
      addrHex: toHex64(shAddr),
      offset: shOffset,
      size: shSize,
      entsize: shEntsize,
      link: shLink,
    });
  }

  return sectionHeaders;
}

const SYMBOL_BINDING_MAP: Record<number, ElfSymbolEntry['binding']> = {
  0: 'LOCAL',
  1: 'GLOBAL',
  2: 'WEAK',
};

const SYMBOL_TYPE_MAP: Record<number, ElfSymbolEntry['symType']> = {
  0: 'NOTYPE',
  1: 'OBJECT',
  2: 'FUNC',
  3: 'SECTION',
  4: 'FILE',
};

function parseSymbolTables(
  bytes: Uint8Array,
  view: DataView,
  elfOffset: number,
  littleEndian: boolean,
  sectionHeaders: readonly ElfSectionHeader[]
): ElfSymbolEntry[] {
  const symbols: ElfSymbolEntry[] = [];

  for (const sec of sectionHeaders) {
    if (sec.shType !== 11 && sec.shType !== 2) continue;
    const linkedStrSec = sectionHeaders[sec.link];
    if (!linkedStrSec) continue;

    const symTableStart = elfOffset + sec.offset;
    const strTableStart = elfOffset + linkedStrSec.offset;
    const entrySize = sec.entsize >= 24 ? sec.entsize : 24;
    const count = Math.min(Math.floor(sec.size / entrySize), 500);

    for (let s = 0; s < count; s++) {
      const symBase = symTableStart + s * entrySize;
      if (symBase + 24 > bytes.length) break;

      const stName = view.getUint32(symBase, littleEndian);
      const stInfo = bytes[symBase + 4];
      const stShndx = view.getUint16(symBase + 6, littleEndian);
      const stValue = view.getBigUint64(symBase + 8, littleEndian);
      const stSize = Number(view.getBigUint64(symBase + 16, littleEndian));

      const symName = readNullTerminatedAscii(bytes, strTableStart + stName);
      if (!symName) continue;

      const bindCode = stInfo >> 4;
      const typeCode = stInfo & 0xf;
      const isImported = stShndx === 0;

      symbols.push({
        index: symbols.length,
        name: symName,
        binding: SYMBOL_BINDING_MAP[bindCode] || 'OTHER',
        symType: SYMBOL_TYPE_MAP[typeCode] || 'OTHER',
        isImported,
        shndx: stShndx,
        valueHex: toHex64(stValue),
        size: stSize,
        forbiddenInTitle: isImported && FORBIDDEN_PS5_TITLE_IMPORTS.has(symName),
      });
    }
  }

  return symbols;
}

export function parseElf64Binary(
  fileName: string,
  bytes: Uint8Array,
  targetMode: 'title-eboot' | 'payload-elf' = 'title-eboot'
): ParsedElfReport {
  const detected = detectBinaryFormat(bytes);
  const hexHeaderDump = buildHexHeaderDump(bytes, 128);
  const extractedStrings = extractInterestingStrings(bytes);
  const elfOffset = findEmbeddedElfOffset(bytes, detected.kind);

  if (!isElf64AtOffset(bytes, elfOffset)) {
    const partialReport: Omit<ParsedElfReport, 'auditIssues'> = {
      fileName,
      header: createFallbackHeader(detected, bytes.length),
      programHeaders: [],
      sectionHeaders: [],
      symbols: [],
      extractedStrings,
      totalLoadMemBytes: 0,
      hexHeaderDump,
    };
    return {
      ...partialReport,
      auditIssues: auditParsedElf(partialReport, targetMode),
    };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tables = parseElfHeader(bytes, view, elfOffset, detected);
  const { programHeaders, totalLoadMemBytes } = parseProgramHeaders(
    bytes.length,
    view,
    elfOffset,
    tables
  );
  const sectionHeaders = parseSectionHeaders(bytes, view, elfOffset, tables);
  const symbols = parseSymbolTables(
    bytes,
    view,
    elfOffset,
    tables.littleEndian,
    sectionHeaders
  );

  const partialReport: Omit<ParsedElfReport, 'auditIssues'> = {
    fileName,
    header: tables.header,
    programHeaders,
    sectionHeaders,
    symbols,
    extractedStrings,
    totalLoadMemBytes,
    hexHeaderDump,
  };

  return {
    ...partialReport,
    auditIssues: auditParsedElf(partialReport, targetMode),
  };
}
