import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CFW_COREOS_PARTITIONS,
  CFW_RESEARCH_STAGES_1360,
} from '../data/cfwStagesData';
import {
  FIRMWARE_MITIGATION_TIMELINE,
  SECURITY_LAYER_COMPARISON_MATRIX,
} from '../data/cfwChartsData';
import {
  calculateBaselineReadiness,
  filterCfwStages,
  generateCfwManifestToml,
  RND_BREAKTHROUGH_TOGGLES,
  simulateCfwBreakthroughs,
} from './cfwResearchEngine';

test('CFW_RESEARCH_STAGES_1360 contains all 8 ordered reverse-engineering stages up to Endgame CFW', () => {
  assert.equal(CFW_RESEARCH_STAGES_1360.length, 8);
  assert.equal(CFW_RESEARCH_STAGES_1360[0]?.id, 'stage-1-entry');
  assert.equal(CFW_RESEARCH_STAGES_1360[7]?.id, 'stage-8-untethered-cfw');
  assert.equal(CFW_RESEARCH_STAGES_1360[7]?.status1360, 'ENDGAME_CFW');
  assert.equal(CFW_COREOS_PARTITIONS.length, 5);
});

test('filterCfwStages filters stages cleanly by status without mutating dataset', () => {
  assert.equal(filterCfwStages('ALL').length, 8);
  assert.equal(filterCfwStages('ACHIEVED').length, 3);
  assert.equal(filterCfwStages('PARTIAL_RND').length, 2);
  assert.equal(filterCfwStages('LOCKED_TARGET').length, 2);
  assert.equal(filterCfwStages('ENDGAME_CFW').length, 1);
});

test('simulateCfwBreakthroughs calculates baseline and full 100% Untethered CFW readiness accurately', () => {
  const baseSim = simulateCfwBreakthroughs([]);
  assert.equal(
    baseSim.baselineReadinessPercent,
    calculateBaselineReadiness()
  );
  assert.equal(baseSim.deltaPercent, 0);
  assert.equal(baseSim.achievedPersistence, 'Volatile (RAM / Tethered)');
  assert.equal(
    baseSim.remainingCriticalBlockers.length,
    RND_BREAKTHROUGH_TOGGLES.length
  );

  const allUnlocked = RND_BREAKTHROUGH_TOGGLES.map((t) => t.id);
  const fullSim = simulateCfwBreakthroughs(allUnlocked);
  assert.ok(fullSim.simulatedReadinessPercent >= 95);
  assert.equal(
    fullSim.achievedPersistence,
    'Untethered Coldboot (Full CFW)'
  );
  assert.equal(fullSim.remainingCriticalBlockers.length, 0);
  assert.ok(
    fullSim.estimatedBootToHenSeconds < baseSim.estimatedBootToHenSeconds
  );
});

test('generateCfwManifestToml produces valid TOML configuration reflecting unlocked stages', () => {
  const toml = generateCfwManifestToml([
    'stage-4-hypervisor',
    'stage-5-a53-io-mmu',
    'stage-7-emc-bootrom',
  ]);
  assert.ok(toml.includes('live_npt_rw_unlocked'));
  assert.ok(toml.includes('native_syshub_gddr6_unlocked'));
  assert.ok(toml.includes('untethered_emc_coldboot'));
  assert.equal(FIRMWARE_MITIGATION_TIMELINE.length, 7);
  assert.equal(SECURITY_LAYER_COMPARISON_MATRIX.length, 6);
});
