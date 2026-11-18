import {
  CFW_COREOS_PARTITIONS,
  CFW_RESEARCH_STAGES_1360,
} from '../data/cfwStagesData';
import {
  CfwReadinessSimulationResult,
  CfwResearchStage,
  CfwStageId,
  CfwStageStatus,
  PersistenceTier,
} from '../types/cfwResearch';

export type CfwStageFilter = 'ALL' | CfwStageStatus;

export interface RndBreakthroughToggle {
  readonly id: CfwStageId;
  readonly label: string;
  readonly shortBadge: string;
  readonly readinessBoost: number;
  readonly bootSecondsDelta: number;
  readonly persistenceUpgrade: PersistenceTier;
  readonly unlockedCapability: string;
}

export const RND_BREAKTHROUGH_TOGGLES: readonly RndBreakthroughToggle[] = [
  {
    id: 'stage-3-kcfi-exec',
    label: 'Gate G0: Подтверждённый CPL0 Stub Exec (sys_getuid+0xE)',
    shortBadge: 'G0 CPL0 Exec',
    readinessBoost: 6,
    bootSecondsDelta: -0.8,
    persistenceUpgrade: 'Volatile (RAM / Tethered)',
    unlockedCapability:
      'Прямое чтение аппаратных регистров CR0/CR3/CR4 и исполнение произвольного Ring 0 кода без прерываний IDT',
  },
  {
    id: 'stage-4-hypervisor',
    label: 'Ring -1 Live NPT: Снятие XOM гипервизора без цикла S3 Rest Mode',
    shortBadge: 'Live Ring -1 NPT',
    readinessBoost: 14,
    bootSecondsDelta: -3.5,
    persistenceUpgrade: 'Warm-Boot / S3 Resume',
    unlockedCapability:
      'Мгновенный R/W доступ к .text ядра FreeBSD прямо при старте эксплойта без увода консоли в режим покоя',
  },
  {
    id: 'stage-5-a53-io-mmu',
    label: 'A53 GDDR6 Window (a53_mmu1): Открытие 0x80000000 через Syshub TLB',
    shortBadge: 'A53 GDDR6 R/W',
    readinessBoost: 16,
    bootSecondsDelta: -1.2,
    persistenceUpgrade: 'Semi-Tethered (Auto-Trigger)',
    unlockedCapability:
      'Нативное монтирование классических FPKG и .zst напрямую через сопроцессор MP4 без 256 MiB PRX эмуляции в userland',
  },
  {
    id: 'stage-6-psp-samu',
    label: 'AMD-SP / CCP Mailbox Exploit: Обход проверки подписи CoreOS / PUP',
    shortBadge: 'AMD-SP Code Exec',
    readinessBoost: 18,
    bootSecondsDelta: -2.0,
    persistenceUpgrade: 'Semi-Tethered (Auto-Trigger)',
    unlockedCapability:
      'Подпись и установка модифицированных системных контейнеров CoreOS и кастомных пакетов PS5UPDATE.PUP',
  },
  {
    id: 'stage-7-emc-bootrom',
    label: 'Titania EMC / SPI NOR Coldboot Hook: Автостарт при включении питания',
    shortBadge: 'EMC Coldboot CFW',
    readinessBoost: 21,
    bootSecondsDelta: -4.5,
    persistenceUpgrade: 'Untethered Coldboot (Full CFW)',
    unlockedCapability:
      'Полный Untethered Coldboot CFW: консоль загружается в пропатченное ядро за 0 с без запуска Y2JB или браузера',
  },
];

const PERSISTENCE_RANK: Readonly<Record<PersistenceTier, number>> = {
  'Volatile (RAM / Tethered)': 1,
  'Warm-Boot / S3 Resume': 2,
  'Semi-Tethered (Auto-Trigger)': 3,
  'Untethered Coldboot (Full CFW)': 4,
};

export function filterCfwStages(
  filter: CfwStageFilter,
  stages: readonly CfwResearchStage[] = CFW_RESEARCH_STAGES_1360
): readonly CfwResearchStage[] {
  if (filter === 'ALL') {
    return stages;
  }
  return stages.filter((stage) => stage.status1360 === filter);
}

export function calculateBaselineReadiness(
  stages: readonly CfwResearchStage[] = CFW_RESEARCH_STAGES_1360
): number {
  if (stages.length === 0) return 0;
  const sum = stages.reduce((acc, s) => acc + s.completionPercent1360, 0);
  return Math.round(sum / stages.length);
}

export function simulateCfwBreakthroughs(
  unlockedIds: readonly CfwStageId[]
): CfwReadinessSimulationResult {
  const baseline = calculateBaselineReadiness(CFW_RESEARCH_STAGES_1360);
  const unlockedSet = new Set<CfwStageId>(unlockedIds);

  const activeToggles = RND_BREAKTHROUGH_TOGGLES.filter((t) =>
    unlockedSet.has(t.id)
  );
  const inactiveToggles = RND_BREAKTHROUGH_TOGGLES.filter(
    (t) => !unlockedSet.has(t.id)
  );

  const totalBoost = activeToggles.reduce(
    (sum, item) => sum + item.readinessBoost,
    0
  );
  const simulatedReadinessPercent = Math.min(100, baseline + totalBoost);

  const baseBootSeconds = 12.5;
  const bootDelta = activeToggles.reduce(
    (sum, item) => sum + item.bootSecondsDelta,
    0
  );
  const estimatedBootToHenSeconds = Math.max(
    0.5,
    Number((baseBootSeconds + bootDelta).toFixed(1))
  );

  const achievedPersistence = activeToggles.reduce<PersistenceTier>(
    (best, current) =>
      PERSISTENCE_RANK[current.persistenceUpgrade] > PERSISTENCE_RANK[best]
        ? current.persistenceUpgrade
        : best,
    'Volatile (RAM / Tethered)'
  );

  const unlockedCapabilities = [
    'Базовый стек 13.60: Y2JB (4.2 с) + Relapse Kernel R/W + kstuff-lite v1.11 + TITAN-CORE v1.0 Mod v2.1',
    ...activeToggles.map((t) => t.unlockedCapability),
  ];

  const remainingCriticalBlockers = inactiveToggles.map((t) => t.label);

  return {
    baselineReadinessPercent: baseline,
    simulatedReadinessPercent,
    deltaPercent: simulatedReadinessPercent - baseline,
    achievedPersistence,
    estimatedBootToHenSeconds,
    unlockedCapabilities,
    remainingCriticalBlockers,
  };
}

export function generateCfwManifestToml(
  unlockedIds: readonly CfwStageId[]
): string {
  const sim = simulateCfwBreakthroughs(unlockedIds);
  const unlockedSet = new Set<CfwStageId>(unlockedIds);

  const hvMode = unlockedSet.has('stage-4-hypervisor')
    ? 'live_npt_rw_unlocked'
    : 's3_resume_byepervisor_1360';
  const a53Mode = unlockedSet.has('stage-5-a53-io-mmu')
    ? 'native_syshub_gddr6_unlocked'
    : 'userland_ampr_emu_ng_3ced5c0_256mb';
  const bootMode = unlockedSet.has('stage-7-emc-bootrom')
    ? 'untethered_emc_coldboot'
    : 'tethered_y2jb_ppsa01650_autoloader';

  const partitionLines = CFW_COREOS_PARTITIONS.map((p) => {
    const active =
      p.requiredStageId === 'stage-3-kcfi-exec' ||
      p.requiredStageId === 'stage-8-untethered-cfw' ||
      unlockedSet.has(p.requiredStageId);
    return `# ${p.partitionName} (${p.targetPathOrOffset})\n${p.id.replace(/-/g, '_')} = "${active ? 'PATCHED_ACTIVE' : 'PENDING_RND_UNLOCK'}"`;
  }).join('\n');

  return `# Prospero 13.60 Custom Firmware Blueprint Manifest
# Сгенерировано реверс-инженерным симулятором (Готовность цепочки: ${sim.simulatedReadinessPercent}%)

[target]
platform = "PS5 Prospero"
firmware = "13.60 (0x13600007)"
persistence_tier = "${sim.achievedPersistence}"
estimated_boot_to_ready_sec = ${sim.estimatedBootToHenSeconds}

[chain_domains]
boot_trigger = "${bootMode}"
kernel_exploit = "relapse_1360_data_rw"
hypervisor_ring_minus_1 = "${hvMode}"
coprocessor_a53_mp4 = "${a53Mode}"
mounter_daemon = "TITAN-CORE-v1.0-mod-v2.1 + ShadowMountPlus-1.7beta12"

[coreos_partitions]
${partitionLines}
`;
}
