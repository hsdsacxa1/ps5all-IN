import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractBridgeUrlFromText,
  formatBytesCompact,
} from './bridgeUrlValidator.ts';
import {
  classifyTitleId,
  extractPreviewText,
  normalizeInstalledGames,
  normalizeProcessList,
  sortDirEntries,
  substituteBodyTemplate,
  substituteConsolePath,
} from './bridgeRegistry.ts';
import { BRIDGE_ENDPOINT_MAP } from './bridgeCatalog.ts';
import {
  BUILT_ELF_ARTIFACTS,
  DEFAULT_BUILT_ELF_ID,
  getBuildDownloadUrl,
  resolveBuiltElfArtifact,
  resolveDownloadableBuildFile,
} from './builtElfCatalog.ts';

test('extractPreviewText decodes UTF-8 base64 payloads from ps5upload read-preview', () => {
  const sample = 'Kraken Mount запущен\nPPSA05143 OK';
  const b64 = Buffer.from(sample, 'utf-8').toString('base64');
  assert.equal(extractPreviewText({ base64: b64, size: sample.length }), sample);
});

test('extractBridgeUrlFromText extracts trycloudflare quick tunnel URL from full terminal log', () => {
  const sampleLog = `
2026-11-14T20:10:38Z INF +--------------------------------------------------------------------------------------------+
2026-11-14T20:10:38Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
2026-11-14T20:10:38Z INF |  https://occupational-signals-spreading-camera.trycloudflare.com                           |
2026-11-14T20:10:38Z INF +--------------------------------------------------------------------------------------------+
2026-11-15T02:31:57Z ERR Request failed dest=https://occupational-signals-spreading-camera.trycloudflare.com/mcp
  `;

  const parsed = extractBridgeUrlFromText(sampleLog);
  assert.equal(parsed.valid, true);
  assert.equal(
    parsed.normalizedUrl,
    'https://occupational-signals-spreading-camera.trycloudflare.com'
  );
  assert.equal(parsed.extractedFromLog, true);
  assert.equal(parsed.sourceLabel, 'trycloudflare');
});

test('extractBridgeUrlFromText strips /mcp and trailing slashes on direct URL', () => {
  const parsed = extractBridgeUrlFromText('http://127.0.0.1:19113/mcp/');
  assert.equal(parsed.valid, true);
  assert.equal(parsed.normalizedUrl, 'http://127.0.0.1:19113');
  assert.equal(parsed.sourceLabel, 'localhost');
});

test('extractBridgeUrlFromText rejects invalid or empty URLs safely', () => {
  assert.equal(extractBridgeUrlFromText('').valid, false);
  assert.equal(extractBridgeUrlFromText('ftp://192.168.1.50:21').valid, false);
});

test('classifyTitleId distinguishes PS5 PPSA, PS4 CUSA and Homebrew', () => {
  assert.equal(classifyTitleId('PPSA01650').kind, 'ps5');
  assert.equal(classifyTitleId('CUSA08519').kind, 'ps4');
  assert.equal(classifyTitleId('FAKE00000').kind, 'homebrew');
});

test('normalizeProcessList and normalizeInstalledGames handle array or wrapped objects', () => {
  const procs = normalizeProcessList({
    processes: [{ pid: 42, name: 'SceShellUI' }],
  });
  assert.equal(procs.length, 1);
  assert.equal(procs[0].name, 'SceShellUI');

  const games = normalizeInstalledGames([
    { title_id: 'CUSA08519', title: 'Red Dead Redemption 2' },
  ]);
  assert.equal(games.length, 1);
  assert.equal(games[0].title_id, 'CUSA08519');
});

test('sortDirEntries puts directories before files alphabetically', () => {
  const sorted = sortDirEntries([
    { name: 'z.log', kind: 'file', size: 10 },
    { name: 'shadowmount', kind: 'dir', size: 0 },
    { name: 'a.bin', kind: 'file', size: 20 },
    { name: 'homebrew', kind: 'dir', size: 0 },
  ]);
  assert.deepEqual(
    sorted.map((e) => e.name),
    ['homebrew', 'shadowmount', 'a.bin', 'z.log']
  );
});

test('endpoint catalog and path/body substitution populate console host', () => {
  const spec = BRIDGE_ENDPOINT_MAP['ps5-smp-status'];
  assert.ok(spec);
  assert.equal(
    substituteConsolePath(spec.pathTemplate, '192.168.50.14'),
    '/api/ps5/smp/status?addr=192.168.50.14'
  );

  const launchSpec = BRIDGE_ENDPOINT_MAP['ps5-app-launch'];
  const body = substituteBodyTemplate(launchSpec.defaultBody, '192.168.50.14');
  assert.equal(body?.addr, '192.168.50.14');
  assert.equal(formatBytesCompact(1024 * 1024 * 512), '512 MiB');
});

test('builtElfCatalog resolves allow-listed ELFs and downloadable build files safely', () => {
  assert.equal(BUILT_ELF_ARTIFACTS.length, 4);
  assert.equal(DEFAULT_BUILT_ELF_ID, 'TITAN-CORE-v1.0-mod-20261118-v2.2.elf');
  assert.equal(
    resolveBuiltElfArtifact('TITAN-CORE-v1.0-mod-20261118-v2.2.elf').id,
    'TITAN-CORE-v1.0-mod-20261118-v2.2.elf'
  );
  assert.equal(
    resolveBuiltElfArtifact('TITAN-CORE-v1.0-mod-20261116.elf').id,
    'TITAN-CORE-v1.0-mod-20261116.elf'
  );
  assert.equal(
    resolveBuiltElfArtifact('kraken-shadow-mix.elf').id,
    'kraken-shadow-mix.elf'
  );
  assert.equal(
    resolveBuiltElfArtifact('../../etc/passwd').id,
    DEFAULT_BUILT_ELF_ID
  );
  assert.equal(
    resolveDownloadableBuildFile('TITAN-CORE-v1.0-mod-20261118-v2.2.elf'),
    'TITAN-CORE-v1.0-mod-20261118-v2.2.elf'
  );
  assert.equal(
    resolveDownloadableBuildFile('TITAN-CORE-v1.0-mod-20261118-v2.2.patch'),
    'TITAN-CORE-v1.0-mod-20261118-v2.2.patch'
  );
  assert.equal(
    resolveDownloadableBuildFile('TITAN-CORE-README.md'),
    'TITAN-CORE-README.md'
  );
  assert.equal(resolveDownloadableBuildFile('SHA256SUMS'), 'SHA256SUMS');
  assert.equal(resolveDownloadableBuildFile('../server.ts'), null);
  assert.equal(
    getBuildDownloadUrl('TITAN-CORE-v1.0-mod-20261118-v2.2.elf'),
    '/api/bridge/download-build/TITAN-CORE-v1.0-mod-20261118-v2.2.elf'
  );
});
