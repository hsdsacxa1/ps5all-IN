import {
  ArchitecturePatternId,
  GeneratedFileArtifact,
  ProjectScaffoldConfig,
} from '../../types/ps5';

export interface ArchitectureStrategy {
  readonly id: ArchitecturePatternId;
  readonly label: string;
  generateFiles(config: ProjectScaffoldConfig): GeneratedFileArtifact[];
  generateDeployCommands(config: ProjectScaffoldConfig): string;
}
