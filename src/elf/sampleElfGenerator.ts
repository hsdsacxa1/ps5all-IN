export type SampleElfPresetId =
  | 'buggy-title-eboot'
  | 'clean-vulkan-eboot'
  | 'hybrid-helper-elf';

interface SyntheticElfSpec {
  fileName: string;
  eType: number;
  entryPoint: bigint;
  codeSegmentFlags: number;
  imports: string[];
  exports: string[];
  rodataStrings: string[];
}

const SAMPLE_ELF_SPECS: Record<SampleElfPresetId, SyntheticElfSpec> = {
  'buggy-title-eboot': {
    fileName: 'eboot_buggy_unsigned.elf',
    eType: 3, // ET_DYN / Title PIE
    entryPoint: 0x00401000n,
    codeSegmentFlags: 0x7, // RWX (triggers W^X warning)
    imports: [
      'statvfs',
      'statfs',
      'sceSslInit',
      'sceVideoOutOpen',
      'fopen',
      'fwrite',
    ],
    exports: ['main', '_start', 'save_user_config'],
    rodataStrings: [
      '/app0/assets/settings.cfg',
      '/data/buggy_app/state.json',
      'libkernel.sprx',
      'libSceSsl.sprx',
      'libSceVideoOut.sprx',
    ],
  },
  'clean-vulkan-eboot': {
    fileName: 'psp5_vulkan_1360.elf',
    eType: 3, // ET_DYN
    entryPoint: 0x00402080n,
    codeSegmentFlags: 0x5, // R-X (Clean W^X)
    imports: [
      'sceVideoOutOpen',
      'sceVideoOutSubmitFlip',
      'scePadReadState',
      'vkCreateInstance',
      'vkEnumeratePhysicalDevices',
      'curl_easy_setopt',
      'open',
      'write',
    ],
    exports: ['main', '_start', 'prospero_resolve_writable_storage'],
    rodataStrings: [
      '/app0/assets/shaders/main.spv',
      '/data/psp5_vulkan_core/config.json',
      '/download0',
      '/system/common/cert/CA_LIST',
      'libkernel.sprx',
      'libSceVideoOut.sprx',
      'libScePad.sprx',
      'libSceVulkan.sprx',
    ],
  },
  'hybrid-helper-elf': {
    fileName: 'nasbridge_helper_9021.elf',
    eType: 2, // ET_EXEC (ps5-payload-dev/sdk v0.45)
    entryPoint: 0x00200000n,
    codeSegmentFlags: 0x5, // R-X
    imports: [
      'statfs',
      'socket',
      'bind',
      'listen',
      'accept',
      'mount',
    ],
    exports: ['main', 'payload_entry', 'query_shadowmount_api'],
    rodataStrings: [
      'http://127.0.0.1:10101/api/v1/scan',
      'http://127.0.0.1:10101/api/v1/games/mount',
      '/data/homebrew/PPSA99808',
      '/download0',
      'libkernel_sys.sprx',
    ],
  },
};

function encodeNullTerminatedStrings(strings: string[]): {
  buffer: Uint8Array;
  offsets: number[];
} {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [new Uint8Array([0])]; // leading null byte at index 0
  const offsets: number[] = [];
  let currentOffset = 1;

  for (const s of strings) {
    offsets.push(currentOffset);
    const encoded = encoder.encode(s);
    const withNull = new Uint8Array(encoded.length + 1);
    withNull.set(encoded, 0);
    withNull[encoded.length] = 0;
    chunks.push(withNull);
    currentOffset += withNull.length;
  }

  const total = new Uint8Array(currentOffset);
  let pos = 0;
  for (const c of chunks) {
    total.set(c, pos);
    pos += c.length;
  }
  return { buffer: total, offsets };
}

export function buildSampleElf64Binary(presetId: SampleElfPresetId): {
  fileName: string;
  bytes: Uint8Array;
  defaultMode: 'title-eboot' | 'payload-elf';
} {
  const spec = SAMPLE_ELF_SPECS[presetId];

  // Build .shstrtab
  const sectionNames = ['.shstrtab', '.text', '.rodata', '.dynsym', '.dynstr'];
  const shstr = encodeNullTerminatedStrings(sectionNames);

  // Build .dynstr (all imported + exported symbol names)
  const allSyms = [...spec.imports, ...spec.exports];
  const dynstr = encodeNullTerminatedStrings(allSyms);

  // Build .rodata
  const rodata = encodeNullTerminatedStrings(spec.rodataStrings);

  // Build .dynsym (24 bytes per Elf64_Sym: index 0 is NULL symbol)
  const symCount = 1 + allSyms.length;
  const dynsymBytes = new Uint8Array(symCount * 24);
  const dynsymView = new DataView(dynsymBytes.buffer);

  for (let i = 0; i < allSyms.length; i++) {
    const base = (i + 1) * 24;
    const isImport = i < spec.imports.length;
    dynsymView.setUint32(base, dynstr.offsets[i], true); // st_name
    dynsymBytes[base + 4] = (1 << 4) | 2; // STB_GLOBAL (1) | STT_FUNC (2)
    dynsymBytes[base + 5] = 0; // st_other
    dynsymView.setUint16(base + 6, isImport ? 0 : 2, true); // st_shndx (0 = UND, 2 = .text)
    dynsymView.setBigUint64(
      base + 8,
      isImport ? 0n : spec.entryPoint + BigInt(i * 64),
      true
    );
    dynsymView.setBigUint64(base + 16, isImport ? 0n : 64n, true);
  }

  // Synthetic x86-64 machine code for .text (push rbp; mov rbp, rsp; xor eax, eax; pop rbp; ret)
  const textBytes = new Uint8Array(64);
  textBytes.set([0x55, 0x48, 0x89, 0xe5, 0x31, 0xc0, 0x5d, 0xc3], 0);

  // Layout offsets:
  // 0x0000: ELF64 Header (64 bytes)
  // 0x0040: 2 Program Headers (2 * 56 = 112 bytes -> ends at 0x00B0)
  // 0x00B0: .shstrtab
  // Next: .text, .rodata, .dynsym, .dynstr
  // Final: 6 Section Headers (6 * 64 = 384 bytes)
  const phoff = 64;
  const phnum = 2;
  const shstrOffset = phoff + phnum * 56;
  const textOffset = shstrOffset + shstr.buffer.length;
  const rodataOffset = textOffset + textBytes.length;
  const dynsymOffset = rodataOffset + rodata.buffer.length;
  const dynstrOffset = dynsymOffset + dynsymBytes.length;
  const shoff = dynstrOffset + dynstr.buffer.length;
  const shnum = 6;
  const totalSize = shoff + shnum * 64;

  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  // 1. Write ELF64 Header
  out.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 9], 0); // \x7FELF, 64-bit, LSB, v1, FreeBSD ABI (9)
  view.setUint16(16, spec.eType, true);
  view.setUint16(18, 0x3e, true); // EM_X86_64
  view.setUint32(20, 1, true);
  view.setBigUint64(24, spec.entryPoint, true);
  view.setBigUint64(32, BigInt(phoff), true);
  view.setBigUint64(40, BigInt(shoff), true);
  view.setUint16(52, 64, true); // e_ehsize
  view.setUint16(54, 56, true); // e_phentsize
  view.setUint16(56, phnum, true);
  view.setUint16(58, 64, true); // e_shentsize
  view.setUint16(60, shnum, true);
  view.setUint16(62, 1, true); // e_shstrndx = section 1 (.shstrtab)

  // 2. Write Program Headers
  // Phdr 0: PT_LOAD (.text)
  const ph0 = phoff;
  view.setUint32(ph0, 1, true); // PT_LOAD
  view.setUint32(ph0 + 4, spec.codeSegmentFlags, true);
  view.setBigUint64(ph0 + 8, BigInt(textOffset), true);
  view.setBigUint64(ph0 + 16, spec.entryPoint, true);
  view.setBigUint64(ph0 + 24, spec.entryPoint, true);
  view.setBigUint64(ph0 + 32, BigInt(textBytes.length), true);
  view.setBigUint64(ph0 + 40, BigInt(textBytes.length), true);
  view.setBigUint64(ph0 + 48, 0x4000n, true); // 16 KiB page align

  // Phdr 1: PT_SCE_DYNLIBDATA (0x61000001)
  const ph1 = phoff + 56;
  view.setUint32(ph1, 0x61000001, true);
  view.setUint32(ph1 + 4, 0x4, true); // R--
  view.setBigUint64(ph1 + 8, BigInt(rodataOffset), true);
  view.setBigUint64(ph1 + 16, spec.entryPoint + 0x10000n, true);
  view.setBigUint64(ph1 + 32, BigInt(rodata.buffer.length + dynsymBytes.length + dynstr.buffer.length), true);
  view.setBigUint64(ph1 + 40, BigInt(rodata.buffer.length + dynsymBytes.length + dynstr.buffer.length), true);
  view.setBigUint64(ph1 + 48, 0x10n, true);

  // 3. Copy section payloads
  out.set(shstr.buffer, shstrOffset);
  out.set(textBytes, textOffset);
  out.set(rodata.buffer, rodataOffset);
  out.set(dynsymBytes, dynsymOffset);
  out.set(dynstr.buffer, dynstrOffset);

  // Helper to write Section Header
  const writeShdr = (
    idx: number,
    nameOffset: number,
    shType: number,
    addr: bigint,
    offset: number,
    size: number,
    link: number,
    entsize: number
  ) => {
    const base = shoff + idx * 64;
    view.setUint32(base, nameOffset, true);
    view.setUint32(base + 4, shType, true);
    view.setBigUint64(base + 16, addr, true);
    view.setBigUint64(base + 24, BigInt(offset), true);
    view.setBigUint64(base + 32, BigInt(size), true);
    view.setUint32(base + 40, link, true);
    view.setBigUint64(base + 56, BigInt(entsize), true);
  };

  // Shdr 0: SHT_NULL
  writeShdr(0, 0, 0, 0n, 0, 0, 0, 0);
  // Shdr 1: .shstrtab (SHT_STRTAB = 3)
  writeShdr(1, shstr.offsets[0], 3, 0n, shstrOffset, shstr.buffer.length, 0, 0);
  // Shdr 2: .text (SHT_PROGBITS = 1)
  writeShdr(2, shstr.offsets[1], 1, spec.entryPoint, textOffset, textBytes.length, 0, 0);
  // Shdr 3: .rodata (SHT_PROGBITS = 1)
  writeShdr(3, shstr.offsets[2], 1, spec.entryPoint + 0x10000n, rodataOffset, rodata.buffer.length, 0, 0);
  // Shdr 4: .dynsym (SHT_DYNSYM = 11, link = 5 -> .dynstr, entsize = 24)
  writeShdr(4, shstr.offsets[3], 11, 0n, dynsymOffset, dynsymBytes.length, 5, 24);
  // Shdr 5: .dynstr (SHT_STRTAB = 3)
  writeShdr(5, shstr.offsets[4], 3, 0n, dynstrOffset, dynstr.buffer.length, 0, 0);

  return {
    fileName: spec.fileName,
    bytes: out,
    defaultMode: presetId === 'hybrid-helper-elf' ? 'payload-elf' : 'title-eboot',
  };
}
