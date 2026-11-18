import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseKrakenIssue } from './krakenDiagnostics';
import { KRAKEN_SHADOW_MIX_PATCHES } from './krakenShadowMixPatches';
import {
  getMounterStrategy,
  listMounterSpecs,
  MOUNTER_COMPARISON_MATRIX,
} from './mounterRegistry';
import {
  filterTitanCorePatches,
  TITAN_CORE_MOD_PATCHES,
  TITAN_CORE_MOD_SUMMARY,
} from './titanCoreModSpec';
import {
  classifyDumpFormatByPath,
  PS5_DUMP_FORMATS,
} from './titanCoreDumpFormats';
import {
  analyzeTitanDebugBundle,
  SAMPLE_TITAN_DEBUG_BUNDLE,
  TITAN_CORE_DEBUG_ENDPOINTS,
} from './titanCoreDebugCollector';
import {
  TITAN_CORE_GITHUB_README_PREVIEW,
  TITAN_CORE_RELEASE_FILES,
  TITAN_CORE_RELEASE_TAG,
} from './titanCoreReleaseData';
import {
  compareThreePartVersions,
  isProtectedY2jbTitleId,
  matchBackportCatalogEntry,
  SAMPLE_BACKPORT_CATALOG_V1,
  TITAN_FORK_COMPARISON_MATRIX,
  validateBackportFileRelativePath,
} from './titanForkComparison';

test('diagnoseKrakenIssue identifies sparse extent PKG bug and ShadowMountPlus unionfs collision', () => {
  const sparseMatch = diagnoseKrakenIssue(
    '/mnt/ext0/homebrew/game.pkg: unsupported package: the layout has a sparse extent at mount 0xeb83b4f5; repack with --kraken stored'
  );
  assert.equal(sparseMatch[0]?.id, 'sparse-extent-pkg');

  const unionfsMatch = diagnoseKrakenIssue(
    'PPSA01341 common/lib occupied by unionfs from /data/homebrew; not mounting'
  );
  assert.equal(unionfsMatch[0]?.id, 'shadowmount-unionfs-collision');
});

test('mounterRegistry returns KrakenShadow-Mix, Kraken Mount v0.0.1-beta, and ShadowMountPlus v1.7 specs', () => {
  const specs = listMounterSpecs();
  assert.equal(specs.length, 3);

  const mix = getMounterStrategy('kraken-shadow-mix');
  assert.equal(mix.spec.defaultPort, 8097);
  assert.equal(mix.spec.supportedFormats.length, 6);
  assert.ok(mix.spec.supportedFormats.includes('ffpkg'));
  assert.ok(mix.spec.supportedFormats.includes('pkg'));

  const kraken = getMounterStrategy('kraken-mount-0.0.1-beta');
  assert.equal(kraken.spec.defaultPort, 8097);
  assert.equal(kraken.spec.repository, 'quer3q/kraken-mount');
  assert.ok(kraken.spec.supportedFormats.includes('pkg'));
  assert.ok(kraken.spec.supportedFormats.includes('zstd'));
  assert.ok(kraken.spec.supportedFormats.includes('lz4'));
});

test('krakenShadowMixStrategy handles both Kraken (.pkg/zstd) and ShadowMountPlus (.ffpkg/.ffpfsc) titles without switching', () => {
  const mix = getMounterStrategy('kraken-shadow-mix');
  const initial = mix.spec.initialEntries;

  const pkgMount = mix.executeAction('mount', initial, 'PPSA08560', '192.168.1.50');
  assert.equal(pkgMount.payload.status, 'mounted_unified');
  assert.ok(pkgMount.payload.bridge.includes('Stacked UnionFS'));

  const ffpkgMount = mix.executeAction('mount', initial, 'PPSA99210', '192.168.1.50');
  assert.equal(ffpkgMount.payload.status, 'mounted_unified');
  assert.ok(ffpkgMount.payload.endpoint.includes('127.0.0.1:10101'));

  assert.equal(KRAKEN_SHADOW_MIX_PATCHES.length, 5);
});

test('krakenMountStrategy executes mount, rebuild, and config actions polymorphically', () => {
  const kraken = getMounterStrategy('kraken-mount-0.0.1-beta');
  const initial = kraken.spec.initialEntries;

  const mountResult = kraken.executeAction('mount', initial, 'PPSA99808', '192.168.1.50');
  assert.equal(mountResult.payload.status, 'mounted_via_ampr');
  assert.ok(mountResult.payload.endpoint.includes(':8097/api/mount'));
  const mountedTarget = mountResult.updatedEntries.find((e) => e.titleId === 'PPSA99808');
  assert.equal(mountedTarget?.mounted, true);

  const configResult = kraken.executeAction('config', initial, 'PPSA99808', '192.168.1.50');
  assert.ok(configResult.payload.configPreview?.includes('ampr-emu-ng'));
  assert.ok(configResult.payload.configPreview?.includes('port = 8097'));
});

test('krakenMountStrategy creates valid container entries for pkg, zstd, and lz4', () => {
  const kraken = getMounterStrategy('kraken-mount-0.0.1-beta');
  const zstdEntry = kraken.createEntry('PPSA77777', 'Test ZSTD Title', 'zstd');
  assert.equal(zstdEntry.path, '/data/games/PPSA77777.zst');
  assert.equal(zstdEntry.mounted, false);
  assert.ok(zstdEntry.backendInfo.includes('ampr-emu-ng v0.4.0'));
  assert.ok(MOUNTER_COMPARISON_MATRIX.length >= 5);
});

test('titanCoreModSpec lists all 18 Mod v2.3 fork patches while preserving Mod v2.2 release artifacts', () => {
  assert.equal(TITAN_CORE_MOD_PATCHES.length, 18);
  assert.equal(TITAN_CORE_MOD_SUMMARY.elfArtifact, 'TITAN-CORE-v1.0-mod-20261118-v2.3.elf');
  assert.equal(TITAN_CORE_MOD_SUMMARY.patchArtifact, 'TITAN-CORE-v1.0-mod-20261118-v2.3.patch');
  assert.equal(
    TITAN_CORE_MOD_SUMMARY.preservedV22ElfArtifact,
    'TITAN-CORE-v1.0-mod-20261118-v2.2.elf'
  );
  assert.equal(
    TITAN_CORE_MOD_SUMMARY.preservedV22PatchArtifact,
    'TITAN-CORE-v1.0-mod-20261118-v2.2.patch'
  );
  assert.equal(TITAN_CORE_RELEASE_TAG, 'v1.0.3-mod-20261118');
  assert.equal(TITAN_CORE_RELEASE_FILES.length, 13);
  assert.ok(
    TITAN_CORE_RELEASE_FILES.some(
      (f) => f.filename === 'TITAN-CORE-v1.0.3-mod-20261118-src.tar.gz'
    )
  );
  assert.ok(
    TITAN_CORE_RELEASE_FILES.some(
      (f) => f.filename === 'publish-github-release.sh'
    )
  );
  assert.ok(
    TITAN_CORE_RELEASE_FILES.some(
      (f) => f.filename === 'TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz'
    )
  );
  assert.ok(TITAN_CORE_GITHUB_README_PREVIEW.includes('189183ee84d2d12f73c7c3d7e3999291eed7c7460a90389b8e67292dcc68f1de'));
  assert.ok(TITAN_CORE_GITHUB_README_PREVIEW.includes('Upgraded fork of devchmod/TITAN-CORE'));
  assert.equal(filterTitanCorePatches('all').length, 18);
  assert.equal(filterTitanCorePatches('gdrive-telemetry').length, 1);
  assert.equal(filterTitanCorePatches('grimmtroll-fix7-port').length, 5);
  assert.equal(filterTitanCorePatches('debug-memory').length, 2);
  assert.equal(filterTitanCorePatches('dump-formats').length, 3);
  assert.equal(filterTitanCorePatches('hen-guard').length, 1);
  assert.equal(filterTitanCorePatches('containers').length, 2);
  assert.equal(filterTitanCorePatches('scanner-config').length, 3);
  assert.equal(filterTitanCorePatches('upstream-v1').length, 1);
});

test('titanForkComparison validates 3-region Y2JB guard, numeric 3-part versions (01.008.000 == 1.8.0), and Schema v1 backports', () => {
  assert.equal(TITAN_FORK_COMPARISON_MATRIX.length, 8);
  assert.equal(isProtectedY2jbTitleId('PPSA01650'), true);
  assert.equal(isProtectedY2jbTitleId('ppsa01651'), true);
  assert.equal(isProtectedY2jbTitleId('PPSA01652'), true);
  assert.equal(isProtectedY2jbTitleId('PPSA08560'), false);

  assert.equal(compareThreePartVersions('01.008.000', '1.8.0'), 0);
  assert.ok((compareThreePartVersions('01.009.000', '1.8.0') ?? 0) > 0);

  assert.equal(validateBackportFileRelativePath('fakelib/libScePlayGo.sprx').valid, true);
  assert.equal(validateBackportFileRelativePath('eboot.bin').valid, true);
  assert.equal(validateBackportFileRelativePath('fakelib/libSceAmpr.sprx').valid, false);
  assert.equal(validateBackportFileRelativePath('../eboot.bin').valid, false);

  const matchOk = matchBackportCatalogEntry(SAMPLE_BACKPORT_CATALOG_V1, {
    titleId: 'PPSA08560',
    gameVersion: '1.8.0',
    firmware: '13.60',
    consoleModel: 'base',
    sourceKind: 'pkg',
  });
  assert.equal(matchOk.matched, true);

  const y2jbBlocked = matchBackportCatalogEntry(SAMPLE_BACKPORT_CATALOG_V1, {
    titleId: 'PPSA01651',
    gameVersion: '01.009.253',
    firmware: '13.60',
    consoleModel: 'base',
    sourceKind: 'pkg',
  });
  assert.equal(y2jbBlocked.matched, false);
  assert.ok(y2jbBlocked.reason.includes('protected Y2JB host'));
});

test('titanCoreDumpFormats classifies all 7 PS5 dump formats cleanly without switch statements', () => {
  assert.equal(PS5_DUMP_FORMATS.length, 7);
  assert.equal(classifyDumpFormatByPath('/data/games/test.pkg').id, 'pkg-debug-sparse');
  assert.equal(classifyDumpFormatByPath('/mnt/usb0/game.ffpfsc').id, 'pfs-ffpkg-ffpfsc');
  assert.equal(classifyDumpFormatByPath('/mnt/ext0/game.zst').id, 'archive-zst-lz4');
  assert.equal(classifyDumpFormatByPath('/mnt/usb1/disk.exfat').id, 'image-exfat-img');
  assert.equal(classifyDumpFormatByPath('/data/homebrew/PPSA08560', ['ampr_zstd.index']).id, 'folder-zstd');
  assert.equal(classifyDumpFormatByPath('/data/homebrew/PPSA08560', ['ampr_assets.index']).id, 'folder-lz4');
  assert.equal(classifyDumpFormatByPath('/data/homebrew/PPSA08560').id, 'folder-plain');
});

test('titanCoreDebugCollector detects memory pressure, unionfs collisions, and index errors', () => {
  assert.equal(TITAN_CORE_DEBUG_ENDPOINTS.length, 4);
  const sampleFindings = analyzeTitanDebugBundle(SAMPLE_TITAN_DEBUG_BUNDLE);
  assert.equal(sampleFindings.length, 4);
  assert.equal(sampleFindings.find((f) => f.id === 'ampr-index-and-errors')?.severity, 'warning');

  const stressed = analyzeTitanDebugBundle({
    ...SAMPLE_TITAN_DEBUG_BUNDLE,
    memory: { ...SAMPLE_TITAN_DEBUG_BUNDLE.memory, rssMiB: 410, freeDataGiB: 2.1 },
    mounts: [
      { fstype: 'unionfs', from: '<above>:/a', on: '/mnt/sandbox/PPSA1_000/app0/common/lib', rdonly: false },
      { fstype: 'unionfs', from: '<above>:/b', on: '/mnt/sandbox/PPSA1_000/app0/common/lib', rdonly: false },
    ],
  });
  assert.equal(stressed.find((f) => f.id === 'rss-headroom')?.severity, 'critical');
  assert.equal(stressed.find((f) => f.id === 'unionfs-collision')?.severity, 'critical');
  assert.equal(stressed.find((f) => f.id === 'data-free-space')?.severity, 'critical');
});
