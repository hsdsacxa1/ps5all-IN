import React, { useMemo, useState } from 'react';
import {
  generateProjectArtifacts,
  getArchitectureStrategy,
} from '../../generators/strategyRegistry';
import { ProjectScaffoldConfig } from '../../types/ps5';
import { CodeArtifactViewer } from './CodeArtifactViewer';
import { ConfigFormPanel } from './ConfigFormPanel';
import { PayloadGeneratorPanel } from './PayloadGeneratorPanel';

type ScaffolderUtilityMode = 'all' | 'mvp' | 'payload-header';

interface ProjectScaffolderViewProps {
  config: ProjectScaffoldConfig;
  onChangeConfig: (next: ProjectScaffoldConfig) => void;
}

export const ProjectScaffolderView: React.FC<ProjectScaffolderViewProps> = ({
  config,
  onChangeConfig,
}) => {
  const [utilityMode, setUtilityMode] = useState<ScaffolderUtilityMode>('all');
  const artifacts = useMemo(() => generateProjectArtifacts(config), [config]);
  const deployCommands = useMemo(
    () => getArchitectureStrategy(config.architecture).generateDeployCommands(config),
    [config]
  );

  const handleLoadPreset = (
    presetId: 'nasbridge' | 'patchdl' | 'vulkan-emu' | 'daemon' | 'kraken-mount'
  ) => {
    const presets: Record<typeof presetId, ProjectScaffoldConfig> = {
      nasbridge: {
        ...config,
        projectName: 'nasbridge_ps5',
        titleId: 'PPSA99808',
        contentVersion: '01.04',
        architecture: 'hybrid-app',
        graphicsBackend: 'videoout-sdl2-imgui',
        flexibleMemoryMiB: 448,
        useHttpsTls: true,
        openSourceGpl: true,
      },
      'vulkan-emu': {
        ...config,
        projectName: 'psp5_vulkan_core',
        titleId: 'FAKE00001',
        contentVersion: '01.02',
        architecture: 'native-app',
        graphicsBackend: 'vulkan-radv',
        flexibleMemoryMiB: 448,
        useHttpsTls: false,
        openSourceGpl: true,
      },
      'kraken-mount': {
        ...config,
        projectName: 'kraken_mount',
        titleId: 'KRAK00897',
        contentVersion: '00.01',
        architecture: 'payload-webui',
        webuiPort: 8097,
        packageFormat: 'zstd-pack',
        flexibleMemoryMiB: 320,
        useHttpsTls: false,
        openSourceGpl: true,
      },
      patchdl: {
        ...config,
        projectName: 'ps5_patchdl',
        titleId: 'PPSA99100',
        contentVersion: '01.00',
        architecture: 'payload-webui',
        webuiPort: 8088,
        flexibleMemoryMiB: 384,
        useHttpsTls: true,
        openSourceGpl: false,
      },
      daemon: {
        ...config,
        projectName: 'relapse_telemetry_srv',
        titleId: 'PPSA99001',
        contentVersion: '01.00',
        architecture: 'payload',
        flexibleMemoryMiB: 192,
        useHttpsTls: false,
        openSourceGpl: false,
      },
    };
    onChangeConfig(presets[presetId]);
  };

  const utilityTabs: ReadonlyArray<{ id: ScaffolderUtilityMode; label: string }> = [
    { id: 'all', label: 'Все утилиты Scaffolder' },
    { id: 'mvp', label: '01–02. Архитектурный MVP' },
    { id: 'payload-header', label: '03. Payload Generator (C-Header)' },
  ];

  const showMvp = utilityMode === 'all' || utilityMode === 'mvp';
  const showPayloadHeader =
    utilityMode === 'all' || utilityMode === 'payload-header';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Утилиты Scaffolder"
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-lg border border-slate-300/70 dark:border-slate-800 w-fit"
        >
          {utilityTabs.map((tab) => {
            const active = utilityMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setUtilityMode(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {showMvp && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <ConfigFormPanel
              config={config}
              onChange={onChangeConfig}
              onLoadPreset={handleLoadPreset}
            />
          </div>
          <div className="lg:col-span-7">
            <CodeArtifactViewer
              config={config}
              artifacts={artifacts}
              deployCommands={deployCommands}
            />
          </div>
        </div>
      )}

      {showPayloadHeader && (
        <PayloadGeneratorPanel projectName={config.projectName} />
      )}
    </div>
  );
};
