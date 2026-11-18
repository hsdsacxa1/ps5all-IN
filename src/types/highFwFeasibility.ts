export type HighFwTierId =
  | '13.60-public'
  | '14.00-14.21'
  | '14.22-private'
  | '14.23-patched';

export type TechnicalGateId =
  | 'decrypted-self-pfs'
  | 'fakelib-prx-abi'
  | 'no-new-syscalls-a53'
  | 'ampr-256mib-streaming';

export type FeasibilityVerdictLevel =
  | 'ready-1360'
  | 'conditional-backport'
  | 'blocked-private'
  | 'patched-deadend';

export interface HighFwTierProfile {
  readonly id: HighFwTierId;
  readonly label: string;
  readonly fwBadge: string;
  readonly publicJailbreak: boolean;
  readonly publicDumper: boolean;
  readonly baseAccessScore: number;
  readonly statusSummary: string;
  readonly sceneRealityNote: string;
  readonly upgradeAdvice: string;
}

export interface TechnicalGateDefinition {
  readonly id: TechnicalGateId;
  readonly title: string;
  readonly weight: number;
  readonly technicalDetail: string;
  readonly failureReason: string;
}

export interface TechnicalGateEvaluation {
  readonly gate: TechnicalGateDefinition;
  readonly satisfied: boolean;
}

export interface HighFwFeasibilityReport {
  readonly tier: HighFwTierProfile;
  readonly verdictLevel: FeasibilityVerdictLevel;
  readonly verdictLabel: string;
  readonly verdictSummary: string;
  readonly readinessPercent: number;
  readonly backportRequired: boolean;
  readonly gateEvaluations: readonly TechnicalGateEvaluation[];
  readonly activeBlockers: readonly string[];
}
