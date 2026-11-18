import assert from 'node:assert/strict';
import test from 'node:test';
import { parseElf64Binary } from './elf64Parser';
import { filterElfSymbols, filterExtractedStrings } from './elfFilters';
import { buildSampleElf64Binary } from './sampleElfGenerator';

test('parseElf64Binary parses ELF64 headers, sections, and catches statvfs in Title eboot', () => {
  const sample = buildSampleElf64Binary('buggy-title-eboot');
  const report = parseElf64Binary(sample.fileName, sample.bytes, 'title-eboot');

  assert.equal(report.header.is64Bit, true);
  assert.equal(report.header.osAbi, 9); // FreeBSD / Prospero ABI
  assert.equal(report.programHeaders.length, 2);
  assert.equal(report.sectionHeaders.length, 6);

  const hasForbiddenStatvfs = report.symbols.some(
    (s) => s.name === 'statvfs' && s.isImported && s.forbiddenInTitle
  );
  assert.equal(hasForbiddenStatvfs, true);

  const hasCriticalImportIssue = report.auditIssues.some(
    (i) => i.id === 'forbidden-title-imports-statvfs' && i.severity === 'critical'
  );
  assert.equal(hasCriticalImportIssue, true);
});

test('parseElf64Binary validates clean Vulkan PS5 13.60 ELF64 binary without false positives', () => {
  const sample = buildSampleElf64Binary('clean-vulkan-eboot');
  const report = parseElf64Binary(sample.fileName, sample.bytes, 'title-eboot');

  assert.equal(report.header.is64Bit, true);
  assert.equal(
    report.auditIssues.every((i) => i.severity === 'nominal'),
    true
  );
  assert.equal(
    report.extractedStrings.some((s) => s.value === '/system/common/cert/CA_LIST'),
    true
  );
});

test('parseElf64Binary allows statfs in Payload ELF mode (libkernel_sys.so)', () => {
  const sample = buildSampleElf64Binary('hybrid-helper-elf');
  const report = parseElf64Binary(sample.fileName, sample.bytes, 'payload-elf');

  assert.equal(
    report.auditIssues.some((i) => i.severity === 'critical'),
    false
  );
});

test('filterElfSymbols filters forbidden imports and substring queries accurately', () => {
  const sample = buildSampleElf64Binary('buggy-title-eboot');
  const report = parseElf64Binary(sample.fileName, sample.bytes, 'title-eboot');

  const forbiddenOnly = filterElfSymbols(report.symbols, 'forbidden', '');
  assert.equal(forbiddenOnly.length > 0, true);
  assert.equal(
    forbiddenOnly.every((s) => s.forbiddenInTitle),
    true
  );

  const queryMatched = filterElfSymbols(report.symbols, 'all', 'statvfs');
  assert.equal(queryMatched.some((s) => s.name === 'statvfs'), true);
});

test('filterExtractedStrings filters by PS5 path category and text query', () => {
  const sample = buildSampleElf64Binary('clean-vulkan-eboot');
  const report = parseElf64Binary(sample.fileName, sample.bytes, 'title-eboot');

  const pathsOnly = filterExtractedStrings(
    report.extractedStrings,
    'ps5-path',
    'CA_LIST'
  );
  assert.equal(
    pathsOnly.some((entry) => entry.value === '/system/common/cert/CA_LIST'),
    true
  );
  assert.equal(
    pathsOnly.every((entry) => entry.category === 'ps5-path'),
    true
  );
});
