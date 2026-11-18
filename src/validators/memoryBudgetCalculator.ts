import { ArchitecturePatternId, MemoryBudgetAnalysis } from '../types/ps5';

const DEFAULT_FLEXIBLE_MIB = 448;
const TOTAL_NATIVE_TITLE_MIB = 12800; // ~12.5 GiB Title budget on PS5
const ELF_SHARED_SHELLUI_MIB = 1638;  // ~1.6 GiB shared with SceShellUI

export function calculateMemoryBudget(
  architecture: ArchitecturePatternId,
  requestedFlexibleMiB: number
): MemoryBudgetAnalysis {
  const isElfOnly = architecture === 'payload' || architecture === 'payload-webui';

  if (isElfOnly) {
    const status = requestedFlexibleMiB > 1200 ? 'critical' : requestedFlexibleMiB > 800 ? 'warning' : 'nominal';
    return {
      architecture,
      totalBudgetMiB: ELF_SHARED_SHELLUI_MIB,
      flexibleMemoryMiB: Math.min(requestedFlexibleMiB, ELF_SHARED_SHELLUI_MIB),
      directMemoryMiB: 0,
      defaultFlexibleMiB: DEFAULT_FLEXIBLE_MIB,
      directMemoryLostMiB: 0,
      status,
      summary: `ELF Payload делит общий пул памяти с SceShellUI (~1638 MiB). Запрошено: ${requestedFlexibleMiB} MiB.`,
      recommendation:
        requestedFlexibleMiB > 1200
          ? 'КРИТИЧНО: При потреблении >1.2–1.6 ГБ RAM переведите проект на архитектуру Native PS5 App (eboot.bin).'
          : 'Для фоновых демонов удерживайте потребление RAM в пределах 64–512 MiB, чтобы не вызывать OOM в SceShellUI.',
    };
  }

  const clampedFlexible = Math.max(64, Math.min(requestedFlexibleMiB, 4096));
  const directMemoryLostMiB = Math.max(0, clampedFlexible - DEFAULT_FLEXIBLE_MIB);
  const directMemoryMiB = TOTAL_NATIVE_TITLE_MIB - clampedFlexible;

  const status =
    clampedFlexible >= 1024
      ? 'warning'
      : clampedFlexible > 2048
        ? 'critical'
        : 'nominal';

  return {
    architecture,
    totalBudgetMiB: TOTAL_NATIVE_TITLE_MIB,
    flexibleMemoryMiB: clampedFlexible,
    directMemoryMiB,
    defaultFlexibleMiB: DEFAULT_FLEXIBLE_MIB,
    directMemoryLostMiB,
    status,
    summary:
      directMemoryLostMiB > 0
        ? `Гибкая память увеличена до ${clampedFlexible} MiB: это отнимает ${directMemoryLostMiB} MiB у Direct Memory (доступно ${directMemoryMiB} MiB).`
        : `Оптимальный баланс: ${clampedFlexible} MiB Flexible Memory и ${directMemoryMiB} MiB Direct Memory под GPU/Vulkan/JIT.`,
    recommendation:
      clampedFlexible >= 1024
        ? `Запрос ${clampedFlexible} MiB гибкой памяти в sce_sys/param.json отнимает ${directMemoryLostMiB} MiB у Direct Memory (нужной для GPU-буферов RADV/Vulkan и больших арен). Не завышайте выше 448 MiB без профилирования.`
        : 'Стандартное значение 448 MiB (469762048 байт) сохраняет максимальный объём Direct Memory для графики и ресурсов.',
  };
}
