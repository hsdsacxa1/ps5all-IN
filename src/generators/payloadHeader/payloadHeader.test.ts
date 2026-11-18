import assert from 'node:assert/strict';
import test from 'node:test';
import { FIRMWARE_OFFSET_PROFILES } from '../../data/firmwareOffsetsData';
import {
  DEFAULT_PAYLOAD_HEADER_CONFIG,
  ELF_LOADER_VARIANTS,
  generatePayloadHeaderTemplate,
  isValidHexAddress,
  sanitizeCIdentifier,
  sanitizeHeaderFileName,
} from './payloadHeaderRegistry';

test('sanitizeCIdentifier normalizes guards and prefixes safely', () => {
  assert.equal(sanitizeCIdentifier('ps5-1360.h', 'FALLBACK'), 'PS5_1360_H');
  assert.equal(sanitizeCIdentifier('123bad', 'FALLBACK'), '_123BAD');
  assert.equal(sanitizeCIdentifier('   ', 'FALLBACK'), 'FALLBACK');
});

test('sanitizeHeaderFileName enforces valid .h extension', () => {
  assert.equal(sanitizeHeaderFileName('offsets'), 'offsets.h');
  assert.equal(sanitizeHeaderFileName('my_hdr.hpp'), 'my_hdr.hpp');
  assert.equal(sanitizeHeaderFileName(''), 'ps5_payload_offsets.h');
});

test('isValidHexAddress accepts valid hex literals and rejects malformed input', () => {
  assert.equal(isValidHexAddress('0xffffffff82400000ULL'), true);
  assert.equal(isValidHexAddress('0x0276D820'), true);
  assert.equal(isValidHexAddress('not_hex'), false);
  assert.equal(isValidHexAddress(''), false);
});

test('generatePayloadHeaderTemplate produces valid C header for all firmware profiles', () => {
  for (const fw of FIRMWARE_OFFSET_PROFILES) {
    const result = generatePayloadHeaderTemplate({
      ...DEFAULT_PAYLOAD_HEADER_CONFIG,
      firmwareId: fw.id,
    });
    assert.equal(result.firmware.id, fw.id);
    assert.equal(result.content.includes(`#ifndef ${result.headerGuard}`), true);
    assert.equal(result.content.includes(`#define ${result.headerGuard}`), true);
    assert.equal(result.content.includes(`#endif /* ${result.headerGuard} */`), true);
    assert.equal(result.content.includes(fw.offsets.allproc), true);
    assert.equal(result.content.includes(fw.offsets.prison0), true);
    assert.equal(result.macroCount >= 10, true);
  }
});

test('generatePayloadHeaderTemplate supports all 4 ELF loader strategies via dictionary dispatch', () => {
  for (const variant of ELF_LOADER_VARIANTS) {
    const result = generatePayloadHeaderTemplate({
      ...DEFAULT_PAYLOAD_HEADER_CONFIG,
      loaderVariant: variant.id,
    });
    assert.equal(result.loaderLabel, variant.label);
    assert.equal(result.content.includes('extern "C"'), true);
  }
});

test('generatePayloadHeaderTemplate respects optional sections and warns on invalid hex override', () => {
  const minimal = generatePayloadHeaderTemplate({
    ...DEFAULT_PAYLOAD_HEADER_CONFIG,
    includeElf64Boilerplate: false,
    includeKernelReadWriteMacros: false,
    includeSandboxEscapeHelpers: false,
    includeS3ResumeCheck: false,
    customKernelDataBaseOverride: 'xyz_invalid',
  });
  assert.equal(minimal.content.includes('elf64_ehdr'), false);
  assert.equal(minimal.content.includes('RESOLVE_KDATA'), false);
  assert.equal(minimal.content.includes('SANDBOX_ROOTVNODE_OFF'), false);
  assert.equal(minimal.content.includes('S3_REINIT_DELAY_US'), false);
  assert.equal(minimal.validationWarnings.length, 1);

  const validOverride = generatePayloadHeaderTemplate({
    ...DEFAULT_PAYLOAD_HEADER_CONFIG,
    customKernelDataBaseOverride: '0xffffffff82500000',
  });
  assert.equal(validOverride.validationWarnings.length, 0);
  assert.equal(validOverride.content.includes('0xffffffff82500000ULL'), true);
});
