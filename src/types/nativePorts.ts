export type PortStrategyId =
  | 'source-port'
  | 'static-recomp'
  | 'emulator-dynarec'
  | 'proton-wrapper'
  | 'media-native';

export type PortGpuBackendId =
  | 'ps5-vulkan-radv'
  | 'ps5-opengl-46'
  | 'sdl2-videoout'
  | 'agc-direct'
  | 'proton-dxvk';

export type PortCatalogCategory =
  | 'all'
  | 'graphics-sdk'
  | 'game-ports'
  | 'recomp-proton'
  | 'stores-tooling';

export interface NativePortConfig {
  portName: string;
  sourceProject: string;
  titleId: string;
  contentVersion: string;
  strategy: PortStrategyId;
  gpuBackend: PortGpuBackendId;
  flexibleMemoryMiB: number;
  enableDualSensePad: boolean;
  enableAudioOut: boolean;
  enableJitDynarec: boolean;
  enableMbedTls: boolean;
  enableDownload0Fallback: boolean;
  enableS3ResumeHook: boolean;
  packageFormat: 'folder' | 'ffpkg' | 'ffpfsc';
}

export interface PortCatalogPreset {
  strategy: PortStrategyId;
  gpuBackend: PortGpuBackendId;
  sourceProject: string;
  portName: string;
  enableJitDynarec?: boolean;
}

export interface NativePortCatalogEntry {
  id: string;
  name: string;
  repo: string;
  category: Exclude<PortCatalogCategory, 'all'>;
  stackLabel: string;
  status2026: string;
  summary: string;
  keyTech: string[];
  preset?: PortCatalogPreset;
}

export interface PortApiMappingRow {
  id: string;
  subsystem: string;
  upstreamApi: string;
  ps5NativeApi: string;
  pitfallNote: string;
}

export interface PortGeneratedArtifact {
  id: string;
  filename: string;
  language: string;
  description: string;
  content: string;
}

export interface PortGpuBackendMeta {
  id: PortGpuBackendId;
  label: string;
  repo: string;
  apiLevel: string;
  bestFor: string;
  cmakeLinkLibs: string;
  initSnippet: string;
}

export interface PortStrategyMeta {
  id: PortStrategyId;
  title: string;
  shortLabel: string;
  tagline: string;
  recommendedGpu: PortGpuBackendId;
  memoryNote: string;
  keyPitfalls: string[];
}
