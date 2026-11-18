import React, { useRef, useState } from 'react';
import {
  DumpModRecipeConfig,
  DumpModRecipePreset,
} from '../../types/dumpMods';
import { DumpModArtifactsPanel } from './DumpModArtifactsPanel';
import { DumpModCatalogPanel } from './DumpModCatalogPanel';
import { DumpModConfiguratorPanel } from './DumpModConfiguratorPanel';
import { DumpModDiagnosticPanel } from './DumpModDiagnosticPanel';

const INITIAL_DUMP_MOD_CONFIG: DumpModRecipeConfig = {
  gameTitle: "Marvel's Spider-Man 2",
  titleId: 'PPSA01411',
  contentVersion: '01.002.003',
  targetSdkHex: '0x13600000',
  strategyId: 'boot-ampr-npfix',
  includeAmpr041: true,
  includeNpOfflineStub: true,
  rewriteUpgradableDrm: true,
  extract16ProtectedCnt: true,
  enable60FpsUnlocked: true,
  enableDlcRedirect: true,
  enableUnionFsModLayer: false,
};

export const DumpModsView: React.FC = () => {
  const [config, setConfig] = useState<DumpModRecipeConfig>(
    INITIAL_DUMP_MOD_CONFIG
  );
  const configuratorRef = useRef<HTMLDivElement | null>(null);

  const handleApplyPreset = (preset: DumpModRecipePreset) => {
    setConfig({ ...preset });
    configuratorRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="space-y-8">
      <DumpModCatalogPanel onApplyPreset={handleApplyPreset} />
      <DumpModDiagnosticPanel onApplyPreset={handleApplyPreset} />
      <div ref={configuratorRef}>
        <DumpModConfiguratorPanel
          config={config}
          onChangeConfig={setConfig}
        />
      </div>
      <DumpModArtifactsPanel config={config} />
    </div>
  );
};
