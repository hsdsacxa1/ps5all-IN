export type DumpModCategoryId =
  | 'all'
  | 'boot-fix'
  | 'backport-fakelib'
  | 'dlc-unlocker'
  | 'fps-xml-patch'
  | 'content-overlay';

export type DumpModStrategyId =
  | 'boot-ampr-npfix'
  | 'fakelib-backport'
  | 'dlc-entitlement-unlock'
  | 'xml-60fps-resolution'
  | 'unionfs-content-mod';

export type DumpSymptomId =
  | 'ce-108255-1-ampr'
  | 'ce-107112-2-cnt-trophy'
  | 'ce-100008-9-fself-sdk'
  | 'np-sign-in-freeze'
  | 'dlc-installed-locked'
  | 'higher-fw-sdk-barrier'
  | 'loose-mod-ignored';

export interface DumpModRecipePreset {
  gameTitle: string;
  titleId: string;
  contentVersion: string;
  targetSdkHex: string;
  strategyId: DumpModStrategyId;
  includeAmpr041: boolean;
  includeNpOfflineStub: boolean;
  rewriteUpgradableDrm: boolean;
  extract16ProtectedCnt: boolean;
  enable60FpsUnlocked: boolean;
  enableDlcRedirect: boolean;
  enableUnionFsModLayer: boolean;
}

export interface DumpModCatalogItem {
  id: string;
  name: string;
  category: Exclude<DumpModCategoryId, 'all'>;
  categoryLabel: string;
  repoOrAuthor: string;
  version2026: string;
  supportedFw: string;
  purposeBadge: 'Запуск дампа' | 'Добавление контента' | 'Запуск + Контент';
  summary: string;
  technicalMechanism: string;
  targetFilesOrPaths: string[];
  solvedErrors: string[];
  preset: DumpModRecipePreset;
}

export interface DumpSymptomDiagnosis {
  id: DumpSymptomId;
  errorCodeOrSymptom: string;
  shortTitle: string;
  affectedExamples: string;
  severity: 'critical' | 'high' | 'medium';
  rootCause: string;
  recommendedTools: string[];
  remediationSteps: string[];
  preset: DumpModRecipePreset;
}

export interface DumpModRecipeConfig {
  gameTitle: string;
  titleId: string;
  contentVersion: string;
  targetSdkHex: string;
  strategyId: DumpModStrategyId;
  includeAmpr041: boolean;
  includeNpOfflineStub: boolean;
  rewriteUpgradableDrm: boolean;
  extract16ProtectedCnt: boolean;
  enable60FpsUnlocked: boolean;
  enableDlcRedirect: boolean;
  enableUnionFsModLayer: boolean;
}

export interface DumpModAuditFinding {
  id: string;
  level: 'ok' | 'warning' | 'critical';
  title: string;
  detail: string;
}

export interface DumpModGeneratedArtifact {
  id: 'pipeline-sh' | 'param-json' | 'patch-manifest' | 'ai-prompt';
  filename: string;
  label: string;
  language: 'bash' | 'json' | 'xml' | 'markdown';
  description: string;
  content: string;
}
