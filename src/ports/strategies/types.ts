import { NativePortConfig, PortStrategyMeta } from '../../types/nativePorts';

export interface PortStrategyHandler {
  meta: PortStrategyMeta;
  getStrategyCmakeFlags(config: NativePortConfig): string[];
  getStrategyCppDefines(config: NativePortConfig): string[];
  getStrategyInitBlock(config: NativePortConfig): string;
  getStrategyWorkflowSteps(config: NativePortConfig): string[];
}
