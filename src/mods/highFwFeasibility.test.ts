import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_GATE_STATE_BY_TIER,
  GTA6_BACKPORT_LAB_PRESET,
  HIGH_FW_TIER_LIST,
  TECHNICAL_GATES,
} from './highFwFeasibilityData';
import { evaluateHighFwFeasibility } from './highFwFeasibilityEvaluator';

test('FW 13.60 baseline evaluates as ready-1360 with 100% readiness and zero blockers', () => {
  const report = evaluateHighFwFeasibility(
    '13.60-public',
    DEFAULT_GATE_STATE_BY_TIER['13.60-public']
  );

  assert.equal(report.verdictLevel, 'ready-1360');
  assert.equal(report.readinessPercent, 100);
  assert.equal(report.backportRequired, false);
  assert.equal(report.activeBlockers.length, 0);
});

test('FW 14.22 private claim evaluates as blocked-private by default with clear blockers', () => {
  const report = evaluateHighFwFeasibility(
    '14.22-private',
    DEFAULT_GATE_STATE_BY_TIER['14.22-private']
  );

  assert.equal(report.verdictLevel, 'blocked-private');
  assert.equal(report.backportRequired, true);
  assert.ok(report.readinessPercent < 40);
  assert.ok(report.activeBlockers.length >= 3);
  assert.ok(report.tier.upgradeAdvice.includes('НЕ обновлять 13.60'));
});

test('FW 14.22 transitions to conditional-backport only when decrypted ELF/PFS and fakelib ABI are satisfied', () => {
  const allGateIds = TECHNICAL_GATES.map((g) => g.id);
  const conditionalReport = evaluateHighFwFeasibility('14.22-private', allGateIds);

  assert.equal(conditionalReport.verdictLevel, 'conditional-backport');
  assert.equal(conditionalReport.readinessPercent, 75);
  assert.equal(conditionalReport.activeBlockers.length, 1);
});

test('FW 14.23 always remains patched-deadend regardless of simulated gate toggles', () => {
  const allGateIds = TECHNICAL_GATES.map((g) => g.id);
  const patchedReport = evaluateHighFwFeasibility('14.23-patched', allGateIds);

  assert.equal(patchedReport.verdictLevel, 'patched-deadend');
  assert.equal(HIGH_FW_TIER_LIST.length, 4);
  assert.equal(GTA6_BACKPORT_LAB_PRESET.strategyId, 'fakelib-backport');
  assert.equal(GTA6_BACKPORT_LAB_PRESET.targetSdkHex, '0x13600000');
});
