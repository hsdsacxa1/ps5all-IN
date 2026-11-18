import React, { useRef, useState } from 'react';
import {
  NativePortConfig,
  PortCatalogPreset,
} from '../../types/nativePorts';
import { PortCatalogPanel } from './PortCatalogPanel';
import { PortConfiguratorPanel } from './PortConfiguratorPanel';
import { PortArtifactsPanel } from './PortArtifactsPanel';

const INITIAL_PORT_CONFIG: NativePortConfig = {
  portName: 'devilutionx_ps5',
  sourceProject: 'DevilutionX (C++17 / SDL2)',
  titleId: 'PPSA99501',
  contentVersion: '01.00',
  strategy: 'source-port',
  gpuBackend: 'ps5-vulkan-radv',
  flexibleMemoryMiB: 448,
  enableDualSensePad: true,
  enableAudioOut: true,
  enableJitDynarec: false,
  enableMbedTls: true,
  enableDownload0Fallback: true,
  enableS3ResumeHook: true,
  packageFormat: 'ffpfsc',
};

export const NativePortsView: React.FC = () => {
  const [config, setConfig] = useState<NativePortConfig>(INITIAL_PORT_CONFIG);
  const configuratorRef = useRef<HTMLDivElement | null>(null);

  const handleApplyPreset = (preset: PortCatalogPreset) => {
    setConfig((prev) => ({
      ...prev,
      strategy: preset.strategy,
      gpuBackend: preset.gpuBackend,
      sourceProject: preset.sourceProject,
      portName: preset.portName,
      enableJitDynarec: Boolean(preset.enableJitDynarec),
    }));
    configuratorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6">
      <PortCatalogPanel onApplyPreset={handleApplyPreset} />
      <div ref={configuratorRef}>
        <PortConfiguratorPanel config={config} onChangeConfig={setConfig} />
      </div>
      <PortArtifactsPanel config={config} />
    </div>
  );
};
