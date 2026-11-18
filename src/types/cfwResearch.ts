export type CfwStageId =
  | 'stage-1-entry'
  | 'stage-2-kernel-rw'
  | 'stage-3-kcfi-exec'
  | 'stage-4-hypervisor'
  | 'stage-5-a53-io-mmu'
  | 'stage-6-psp-samu'
  | 'stage-7-emc-bootrom'
  | 'stage-8-untethered-cfw';

export type CfwStageStatus =
  | 'ACHIEVED'
  | 'PARTIAL_RND'
  | 'LOCKED_TARGET'
  | 'ENDGAME_CFW';

export type PersistenceTier =
  | 'Volatile (RAM / Tethered)'
  | 'Warm-Boot / S3 Resume'
  | 'Semi-Tethered (Auto-Trigger)'
  | 'Untethered Coldboot (Full CFW)';

export interface ReverseEngineeringArtifact {
  readonly name: string;
  readonly addressOrOffset: string;
  readonly role: string;
}

export interface CrossGenComparison {
  readonly ps3Lv0: string;
  readonly ps4Orbis: string;
  readonly ps5Prospero1360: string;
}

export interface CfwResearchStage {
  readonly id: CfwStageId;
  readonly stageNumber: number;
  readonly shortLabel: string;
  readonly codeName: string;
  readonly title: string;
  readonly privilegeRing: string;
  readonly completionPercent1360: number;
  readonly difficultyScore: number;
  readonly persistenceTier: PersistenceTier;
  readonly status1360: CfwStageStatus;
  readonly summary: string;
  readonly attackVectors: readonly string[];
  readonly hardwareMitigations: readonly string[];
  readonly reverseEngineeringArtifacts: readonly ReverseEngineeringArtifact[];
  readonly keyPrimitives: readonly string[];
  readonly blockersToNextStage: readonly string[];
  readonly technicalSnippet: string;
  readonly crossGenComparison: CrossGenComparison;
}

export interface FirmwareMitigationTimelinePoint {
  readonly fwRange: string;
  readonly releaseEra: string;
  readonly entryVectorScore: number;
  readonly kernelRwScore: number;
  readonly hvBypassScore: number;
  readonly hardwareLockdownIndex: number;
  readonly keyVectorsAndPatches: string;
}

export interface SecurityLayerComparisonMetric {
  readonly layerId: string;
  readonly layerName: string;
  readonly ps3Cfw355: number;
  readonly ps4GoldHen900: number;
  readonly ps5Fw1360Current: number;
  readonly ps5CfwTarget: number;
  readonly technicalNote: string;
}

export interface CfwCoreOsPartitionSpec {
  readonly id: string;
  readonly partitionName: string;
  readonly targetPathOrOffset: string;
  readonly cryptoLayer: string;
  readonly stockBehavior: string;
  readonly cfwPatchAction: string;
  readonly requiredStageId: CfwStageId;
}

export interface CfwReadinessSimulationResult {
  readonly baselineReadinessPercent: number;
  readonly simulatedReadinessPercent: number;
  readonly deltaPercent: number;
  readonly achievedPersistence: PersistenceTier;
  readonly estimatedBootToHenSeconds: number;
  readonly unlockedCapabilities: readonly string[];
  readonly remainingCriticalBlockers: readonly string[];
}
