export type MounterEngineId =
  | 'kraken-shadow-mix'
  | 'kraken-mount-0.0.1-beta'
  | 'shadowmount-1.7';

export type MounterContainerFormat =
  | 'folder'
  | 'ffpkg'
  | 'ffpfsc'
  | 'pkg'
  | 'zstd'
  | 'lz4';

export type MounterActionId = 'discover' | 'mount' | 'rebuild' | 'config';

export interface MountableTitleEntry {
  titleId: string;
  titleName: string;
  contentVersion: string;
  containerType: MounterContainerFormat;
  path: string;
  mounted: boolean;
  backendInfo: string;
}

export interface MounterActionSpec {
  id: MounterActionId;
  method: 'GET' | 'POST';
  endpoint: string;
  label: string;
  description: string;
}

export interface MounterEngineSpec {
  id: MounterEngineId;
  name: string;
  version: string;
  repository: string;
  releaseUrl: string;
  defaultPort: number;
  baseUrlTemplate: string;
  backendBridge: string;
  dataDirectory: string;
  configPath: string;
  logPath: string;
  deployCommand: string;
  supportedFormats: MounterContainerFormat[];
  formatDescriptions: Record<string, string>;
  actions: MounterActionSpec[];
  initialEntries: MountableTitleEntry[];
}

export interface MounterSimulationPayload {
  status: string;
  daemon: string;
  endpoint: string;
  bridge: string;
  storagePaths: string[];
  configPreview?: string;
  logTail?: string[];
  target?: MountableTitleEntry;
  games: MountableTitleEntry[];
}

export interface MounterStrategy {
  readonly spec: MounterEngineSpec;
  executeAction(
    actionId: MounterActionId,
    entries: MountableTitleEntry[],
    selectedTitleId: string,
    ps5Ip: string
  ): {
    updatedEntries: MountableTitleEntry[];
    payload: MounterSimulationPayload;
  };
  createEntry(
    titleId: string,
    titleName: string,
    format: MounterContainerFormat
  ): MountableTitleEntry;
}

export interface KrakenShadowPatchArtifact {
  id: string;
  filename: string;
  targetFileInRepo: string;
  language: 'rust' | 'diff' | 'shell' | 'toml';
  title: string;
  problemSolved: string;
  content: string;
}
