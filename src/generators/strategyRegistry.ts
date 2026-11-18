import {
  ArchitecturePatternId,
  GeneratedFileArtifact,
  ProjectScaffoldConfig,
} from '../types/ps5';
import { hybridAppStrategy } from './strategies/hybridAppStrategy';
import { nativeAppStrategy } from './strategies/nativeAppStrategy';
import { payloadStrategy } from './strategies/payloadStrategy';
import { ArchitectureStrategy } from './strategies/types';
import { webUiPayloadStrategy } from './strategies/webUiPayloadStrategy';

export const ARCHITECTURE_STRATEGY_REGISTRY: Record<
  ArchitecturePatternId,
  ArchitectureStrategy
> = {
  payload: payloadStrategy,
  'payload-webui': webUiPayloadStrategy,
  'native-app': nativeAppStrategy,
  'hybrid-app': hybridAppStrategy,
};

export function getArchitectureStrategy(
  architectureId: ArchitecturePatternId
): ArchitectureStrategy {
  return ARCHITECTURE_STRATEGY_REGISTRY[architectureId];
}

export function generateProjectArtifacts(
  config: ProjectScaffoldConfig
): GeneratedFileArtifact[] {
  const strategy = getArchitectureStrategy(config.architecture);
  const artifacts = [...strategy.generateFiles(config)];

  if (config.openSourceGpl && (config.architecture === 'native-app' || config.architecture === 'hybrid-app')) {
    artifacts.push({
      path: 'licenses/GPL-3.0-NOTICE.md',
      language: 'markdown',
      description: 'Обязательное уведомление GPL-3.0-or-later для производных drakmor/ps5-native-app-boilerplate',
      content: `# Third-Party License Notice (GPL-3.0-or-later)\n\nProject **${config.projectName}** (${config.titleId}) incorporates runtime components from \`drakmor/ps5-native-app-boilerplate\` (originally created by BlackBearReloaded) under the **GNU General Public License v3.0 or later**.\n\nEnsure the \`licenses/\` directory is distributed with all release archives (\`.ffpkg\`, \`.ffpfsc\`, or unpacked folders).\n`,
    });
  }

  return artifacts;
}
