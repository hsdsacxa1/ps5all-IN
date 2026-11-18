export type BridgeConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export type BridgeActionCategory = 'read' | 'mutate' | 'destructive';

export interface BridgeConfig {
  bridgeUrl: string;
  selectedConsoleHost: string;
  elfldrPort: number;
}

export interface BridgeEngineVersion {
  version: string;
  default_console?: string | null;
  caps?: Record<string, boolean>;
}

export interface Ps5ConsoleEntry {
  id: string;
  host: string;
  name: string;
  has_rp_credentials?: boolean;
  has_wake_credential?: boolean;
  notes?: string | null;
  rp_users?: Array<{ chosen?: boolean; name: string }>;
}

export interface BridgeProbeResponse {
  ok: boolean;
  bridgeUrl: string;
  latencyMs: number;
  version?: BridgeEngineVersion;
  consoles?: {
    consoles?: Ps5ConsoleEntry[];
  };
  error?: string;
}

export interface Ps5HelperStatus {
  version?: string;
  ps5_kernel?: string;
  command_count?: number;
  ucred_elevated?: boolean;
  fan_threshold?: number;
  max_transfer_streams?: number;
  started_at_unix?: number;
}

export interface Ps5HardwareInfo {
  model?: string;
  hw_model?: string;
  serial?: string;
  hw_machine?: string;
  os?: string;
  ncpu?: number;
  physmem?: number;
  has_wlan_bt?: boolean;
  has_optical_out?: boolean;
}

export interface Ps5TempsInfo {
  cpu_temp?: number;
  soc_temp?: number;
  m2_temp?: number;
  cpu_freq_mhz?: number;
  fan_duty_pct?: number;
  fan_target_c?: number;
  fan_filtered_c?: number;
}

export interface Ps5StorageInfo {
  total_bytes?: number;
  free_bytes?: number;
  used_bytes?: number;
  user_total_bytes?: number;
  user_free_bytes?: number;
  system_data_total_bytes?: number;
  system_data_free_bytes?: number;
}

export interface Ps5SmpStatus {
  installed?: boolean;
  running?: boolean;
  config_ini?: string | null;
  autotune_ini?: string | null;
  debug_log_tail?: string | null;
}

export interface Ps5InstalledGame {
  title_id: string;
  title: string;
  hosts?: string[];
  platform?: string;
  path?: string;
}

export interface Ps5ProcessEntry {
  pid: number;
  name: string;
  title_id?: string;
}

export interface Ps5DirEntry {
  name: string;
  kind: 'dir' | 'file' | 'symlink' | string;
  size: number;
  mtime?: number;
}

export interface Ps5DirListing {
  path: string;
  entries: Ps5DirEntry[];
}

export interface Ps5FilePreviewResult {
  path: string;
  text?: string;
  content?: string;
  size?: number;
  truncated?: boolean;
  encoding?: string;
}

export interface BridgeSectionState<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

export interface BridgeConsoleOverview {
  ok: boolean;
  bridgeUrl: string;
  consoleAddr: string;
  fetchedAt: string;
  sections: {
    status: BridgeSectionState<Ps5HelperStatus>;
    hwInfo: BridgeSectionState<Ps5HardwareInfo>;
    hwTemps: BridgeSectionState<Ps5TempsInfo>;
    hwStorage: BridgeSectionState<Ps5StorageInfo>;
    smpStatus: BridgeSectionState<Ps5SmpStatus>;
    games: BridgeSectionState<Ps5InstalledGame[]>;
    processes: BridgeSectionState<Ps5ProcessEntry[] | { processes?: Ps5ProcessEntry[] }>;
  };
}

export interface BridgeEndpointSpec {
  id: string;
  label: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  pathTemplate: string;
  category: BridgeActionCategory;
  description: string;
  defaultBody?: Record<string, unknown>;
}

export interface BridgeActionLogEntry {
  id: string;
  timestamp: string;
  action: string;
  target: string;
  ok: boolean;
  status: number;
  summary: string;
}
