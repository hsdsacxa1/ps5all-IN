export type BinaryFormatKind =
  | 'elf64-prospero'
  | 'ps5-fself'
  | 'unknown-binary';

export interface ElfHeaderInfo {
  formatKind: BinaryFormatKind;
  formatLabel: string;
  is64Bit: boolean;
  littleEndian: boolean;
  osAbi: number;
  osAbiLabel: string;
  eType: number;
  eTypeLabel: string;
  eMachine: number;
  eMachineLabel: string;
  entryPointHex: string;
  phoff: number;
  shoff: number;
  phnum: number;
  shnum: number;
  shstrndx: number;
  fileSize: number;
}

export interface ElfProgramHeader {
  index: number;
  pType: number;
  typeLabel: string;
  flags: number;
  flagsLabel: string;
  offsetHex: string;
  vaddrHex: string;
  filesz: number;
  memsz: number;
  align: number;
}

export interface ElfSectionHeader {
  index: number;
  name: string;
  shType: number;
  typeLabel: string;
  addrHex: string;
  offset: number;
  size: number;
  entsize: number;
  link: number;
}

export interface ElfSymbolEntry {
  index: number;
  name: string;
  binding: 'LOCAL' | 'GLOBAL' | 'WEAK' | 'OTHER';
  symType: 'NOTYPE' | 'OBJECT' | 'FUNC' | 'SECTION' | 'FILE' | 'OTHER';
  isImported: boolean;
  shndx: number;
  valueHex: string;
  size: number;
  forbiddenInTitle: boolean;
}

export interface ExtractedBinaryString {
  offsetHex: string;
  value: string;
  category: 'ps5-path' | 'sprx-module' | 'symbol-or-literal';
}

export interface ElfAuditIssue {
  id: string;
  severity: 'critical' | 'warning' | 'nominal';
  title: string;
  detail: string;
  remediation: string;
}

export interface ParsedElfReport {
  fileName: string;
  header: ElfHeaderInfo;
  programHeaders: ElfProgramHeader[];
  sectionHeaders: ElfSectionHeader[];
  symbols: ElfSymbolEntry[];
  extractedStrings: ExtractedBinaryString[];
  totalLoadMemBytes: number;
  hexHeaderDump: string[];
  auditIssues: ElfAuditIssue[];
}
