import {
  HIGH_FW_TIER_MAP,
  TECHNICAL_GATES,
  VERDICT_META,
} from './highFwFeasibilityData.ts';
import type {
  FeasibilityVerdictLevel,
  HighFwFeasibilityReport,
  HighFwTierId,
  TechnicalGateId,
} from '../types/highFwFeasibility.ts';

function resolveVerdictLevel(
  tierId: HighFwTierId,
  publicJailbreak: boolean,
  satisfiedIds: ReadonlySet<TechnicalGateId>
): FeasibilityVerdictLevel {
  if (tierId === '14.23-patched') {
    return 'patched-deadend';
  }
  if (publicJailbreak && satisfiedIds.size === TECHNICAL_GATES.length) {
    return 'ready-1360';
  }
  const hasDecryptedAndAbi =
    satisfiedIds.has('decrypted-self-pfs') &&
    satisfiedIds.has('fakelib-prx-abi');
  if (hasDecryptedAndAbi) {
    return 'conditional-backport';
  }
  return 'blocked-private';
}

export function evaluateHighFwFeasibility(
  tierId: HighFwTierId,
  satisfiedGateIds: readonly TechnicalGateId[]
): HighFwFeasibilityReport {
  const tier = HIGH_FW_TIER_MAP[tierId];
  const satisfiedSet = new Set<TechnicalGateId>(satisfiedGateIds);

  const gateEvaluations = TECHNICAL_GATES.map((gate) => ({
    gate,
    satisfied: satisfiedSet.has(gate.id),
  }));

  const gateScore = gateEvaluations.reduce(
    (sum, item) => sum + (item.satisfied ? item.gate.weight : 0),
    0
  );
  const readinessPercent = Math.max(
    0,
    Math.min(100, tier.baseAccessScore + gateScore)
  );

  const activeBlockers = gateEvaluations
    .filter((item) => !item.satisfied)
    .map((item) => item.gate.failureReason);

  if (!tier.publicJailbreak) {
    activeBlockers.unshift(
      `На ${tier.label} отсутствует публичный userland/kernel эксплойт и дампер.`
    );
  }

  const verdictLevel = resolveVerdictLevel(
    tierId,
    tier.publicJailbreak,
    satisfiedSet
  );
  const verdictMeta = VERDICT_META[verdictLevel];

  return {
    tier,
    verdictLevel,
    verdictLabel: verdictMeta.label,
    verdictSummary: verdictMeta.summary,
    readinessPercent,
    backportRequired: tierId !== '13.60-public',
    gateEvaluations,
    activeBlockers,
  };
}
