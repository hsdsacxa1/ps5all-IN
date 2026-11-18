export type ArchitecturePatternId =
  | 'payload'
  | 'payload-webui'
  | 'native-app'
  | 'hybrid-app';

export type GraphicsBackendId =
  | 'headless'
  | 'videoout-sdl2-imgui'
  | 'opengl-mesa'
  | 'vulkan-radv';

export type HenFlavorId =
  | 'kstuff-lite-1.11'
  | 'onionhen-0.9.0'
  | 'etahen-2.6b'
  | 'legacy-kstuff-1.6.7'
  | 'none';

export type ExploitEntryId = 'y2jb-1.3.0' | 'webkit-relapse';

export type PackageFormatId =
  | 'unpacked-folder'
  | 'ffpkg-ufs2'
  | 'ffpfsc-compressed'
  | 'pkg-fpkg'
  | 'zstd-pack'
  | 'lz4-pack';

export interface ProjectScaffoldConfig {
  projectName: string;
  titleId: string;
  contentVersion: string;
  ps5Ip: string;
  elfldrPort: number;
  ftpPort: number;
  webuiPort: number;
  architecture: ArchitecturePatternId;
  graphicsBackend: GraphicsBackendId;
  packageFormat: PackageFormatId;
  flexibleMemoryMiB: number;
  useElevatedPrivileges: boolean;
  useHttpsTls: boolean;
  includeS3ResumeHandler: boolean;
  includeDownload0Fallback: boolean;
  openSourceGpl: boolean;
}

export interface GeneratedFileArtifact {
  path: string;
  language: 'cpp' | 'c' | 'json' | 'makefile' | 'python' | 'shell' | 'markdown';
  description: string;
  content: string;
}

export interface ArchitecturePatternMeta {
  id: ArchitecturePatternId;
  title: string;
  shortTitle: string;
  useCaseSummary: string;
  outputFormat: string;
  keyStack: string;
  ramCeiling: string;
  supportsGui: boolean;
  requiresKstuff: boolean;
  requiresShadowMount: boolean;
}

export interface ExploitChainComponent {
  id: string;
  layer: 'Entrypoint' | 'Kernel Exploit' | 'Hypervisor';
  name: string;
  repositories: string[];
  supportedFw: string;
  stabilityRating: string;
  dnsOrTrigger: string;
  notes: string;
  recommended: boolean;
}

export interface RuntimeDaemonSpec {
  id: string;
  name: string;
  repository: string;
  version: string;
  portOrPath: string;
  mandatory: boolean;
  role: string;
  criticalNotes: string;
}

export interface CriticalPitfallSpec {
  id: string;
  number: string;
  title: string;
  affectedTarget: string;
  symptom: string;
  rootCause: string;
  mandatoryFix: string;
  codeSnippetGood: string;
  codeSnippetBad: string;
}

export interface ReferenceRepositorySpec {
  id: string;
  repo: string;
  category: 'SDK & Loaders' | 'Native App Templates' | 'Verified 13.60 Projects';
  architecture: ArchitecturePatternId;
  stackHighlights: string[];
  description: string;
  verifiedFw: string;
}

export interface MemoryBudgetAnalysis {
  architecture: ArchitecturePatternId;
  totalBudgetMiB: number;
  flexibleMemoryMiB: number;
  directMemoryMiB: number;
  defaultFlexibleMiB: number;
  directMemoryLostMiB: number;
  status: 'nominal' | 'warning' | 'critical';
  summary: string;
  recommendation: string;
}

export interface AuditFinding {
  id: string;
  ruleName: string;
  severity: 'critical' | 'warning' | 'pass';
  category: 'Imports' | 'TLS & Privileges' | 'Sandbox & I/O' | 'Memory & Manifest' | 'Assets & Packaging' | 'Lifecycle';
  message: string;
  remediation: string;
}

export interface SourceAuditInput {
  architecture: ArchitecturePatternId;
  sourceCode: string;
  titleId: string;
  contentVersion: string;
  flexibleMemoryMiB: number;
  iconWidth: number;
  iconHeight: number;
  iconHasAlpha: boolean;
  elevatedPrivileges: boolean;
}

export interface RuntimeStackSelection {
  exploitEntry: ExploitEntryId;
  henSelections: HenFlavorId[];
  elfldrEnabled: boolean;
  shadowMountEnabled: boolean;
  shadowMountVersion: '1.7beta11' | '1.6-legacy';
  krakenMountEnabled?: boolean;
  ftpServer: 'ftpsrv-2121' | 'zftpd-2120' | 'none';
  byepervisorEnabled: boolean;
  usbPowerInRestMode: boolean;
}

export interface StackValidationIssue {
  id: string;
  severity: 'critical' | 'warning' | 'nominal';
  title: string;
  detail: string;
  fixAction: string;
}
