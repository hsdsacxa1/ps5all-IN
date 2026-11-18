import test from 'node:test';
import assert from 'node:assert/strict';
import { DUMP_MODS_CATALOG } from '../data/dumpModsCatalogData';
import { DUMP_SYMPTOMS_DIAGNOSIS } from '../data/dumpSymptomsData';
import {
  auditDumpModRecipe,
  DUMP_MOD_STRATEGY_LIST,
  filterDumpModsCatalog,
  generateDumpModArtifacts,
  getDumpModStrategy,
  getDumpSymptomById,
} from './dumpModRegistry';

test('all 5 polymorphic dump mod strategies generate 4 valid artifacts', () => {
  assert.equal(DUMP_MOD_STRATEGY_LIST.length, 5);

  for (const strategy of DUMP_MOD_STRATEGY_LIST) {
    const sampleConfig = {
      gameTitle: 'Test PS5 Dump',
      titleId: 'PPSA13600',
      contentVersion: '01.002.000',
      targetSdkHex: '0x13600000',
      strategyId: strategy.id,
      includeAmpr041: true,
      includeNpOfflineStub: true,
      rewriteUpgradableDrm: true,
      extract16ProtectedCnt: true,
      enable60FpsUnlocked: true,
      enableDlcRedirect: true,
      enableUnionFsModLayer: true,
    };

    const artifacts = generateDumpModArtifacts(sampleConfig);
    assert.equal(artifacts.length, 4, `Strategy ${strategy.id} must return 4 artifacts`);
    assert.ok(artifacts.some((a) => a.id === 'pipeline-sh' && a.content.includes('PPSA13600')));
    assert.ok(artifacts.some((a) => a.id === 'param-json' && a.content.includes('"PPSA13600"')));
    assert.ok(artifacts.some((a) => a.id === 'patch-manifest'));
    assert.ok(artifacts.some((a) => a.id === 'ai-prompt'));
  }
});

test('filterDumpModsCatalog filters by category and search query accurately', () => {
  const allItems = filterDumpModsCatalog(DUMP_MODS_CATALOG, 'all', '');
  assert.equal(allItems.length, DUMP_MODS_CATALOG.length);
  assert.ok(allItems.length >= 12);

  const bootFixes = filterDumpModsCatalog(DUMP_MODS_CATALOG, 'boot-fix', '');
  assert.ok(bootFixes.length >= 3);
  assert.ok(bootFixes.every((item) => item.category === 'boot-fix'));

  const amprSearch = filterDumpModsCatalog(DUMP_MODS_CATALOG, 'all', 'ampr-emu-ng');
  assert.ok(amprSearch.length >= 1);
  assert.equal(amprSearch[0].id, 'mod-ampr-emu-ng-041');
});

test('getDumpSymptomById resolves known crash symptoms and presets', () => {
  assert.ok(DUMP_SYMPTOMS_DIAGNOSIS.length >= 7);
  const cntSymptom = getDumpSymptomById('ce-107112-2-cnt-trophy');
  assert.equal(cntSymptom.id, 'ce-107112-2-cnt-trophy');
  assert.ok(cntSymptom.errorCodeOrSymptom.includes('CE-107112-2'));
  assert.equal(cntSymptom.preset.extract16ProtectedCnt, true);
});

test('auditDumpModRecipe flags missing AMPR and upgradable DRM risks', () => {
  const riskyFindings = auditDumpModRecipe({
    gameTitle: 'Stellar Blade',
    titleId: 'INVALID_ID',
    contentVersion: '01.00',
    targetSdkHex: '0x13600000',
    strategyId: getDumpModStrategy('boot-ampr-npfix').id,
    includeAmpr041: false,
    includeNpOfflineStub: false,
    rewriteUpgradableDrm: false,
    extract16ProtectedCnt: true,
    enable60FpsUnlocked: false,
    enableDlcRedirect: false,
    enableUnionFsModLayer: false,
  });

  assert.ok(riskyFindings.some((f) => f.id === 'title-id-format' && f.level === 'warning'));
  assert.ok(riskyFindings.some((f) => f.id === 'ampr-disabled-warning' && f.level === 'warning'));
  assert.ok(riskyFindings.some((f) => f.id === 'upgradable-drm-risk' && f.level === 'critical'));
});
