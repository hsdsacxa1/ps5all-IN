import {
  DumpModGeneratedArtifact,
  DumpModRecipeConfig,
  DumpModStrategyId,
} from '../../types/dumpMods';

export interface DumpModStrategyHandler {
  id: DumpModStrategyId;
  label: string;
  shortBadge: string;
  architectureSummary: string;
  requiredRuntimeStack: string[];
  generateArtifacts: (config: DumpModRecipeConfig) => DumpModGeneratedArtifact[];
}
