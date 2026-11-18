export type DebugFindingSeverity = 'critical' | 'warning' | 'ok';

export interface DebugBundleMemorySnapshot {
  readonly rssMiB: number;
  readonly flexibleBudgetMiB: number;
  readonly amprPoolMiB: number;
  readonly freeDataGiB: number;
  readonly pageFaultsMajor: number;
  readonly vmRegionsCount: number;
  readonly amprMapped: boolean;
}

export interface DebugBundleMountEntry {
  readonly fstype: string;
  readonly from: string;
  readonly on: string;
  readonly rdonly: boolean;
}

export interface DebugBundleErrorEntry {
  readonly tsMs: number;
  readonly titleId: string;
  readonly errno: number;
  readonly message: string;
}

export interface TitanCoreDebugBundle {
  readonly version: string;
  readonly firmware: string;
  readonly amprVersion: string;
  readonly memory: DebugBundleMemorySnapshot;
  readonly mounts: readonly DebugBundleMountEntry[];
  readonly errors: readonly DebugBundleErrorEntry[];
  readonly formatsDetected: Readonly<Record<string, number>>;
}

export interface DebugBundleFinding {
  readonly id: string;
  readonly severity: DebugFindingSeverity;
  readonly area: string;
  readonly summary: string;
  readonly recommendation: string;
}

export interface DebugEndpointSpec {
  readonly method: 'GET' | 'POST';
  readonly path: string;
  readonly title: string;
  readonly outputArtifact: string;
  readonly description: string;
}

export const TITAN_CORE_DEBUG_ENDPOINTS: readonly DebugEndpointSpec[] = [
  {
    method: 'GET',
    path: '/api/debug/memory',
    title: 'Снимок памяти и VM-регионов (KERN_PROC_VMMAP + rusage)',
    outputArtifact: 'JSON (RSS, major faults, AMPR 256 MiB PRX map, flexible headroom)',
    description:
      'Снимает getrusage(RUSAGE_SELF), vm.stats/hw.physmem через sysctl и список mmap/PRX-регионов без остановки игр.',
  },
  {
    method: 'GET',
    path: '/api/debug/error-dump',
    title: 'Кольцевой буфер ошибок и последний паник-бандл',
    outputArtifact: '256 последних событий + /data/titan-core/debug/last-crash-bundle.json',
    description:
      'Собирает errno, проблемные пути, отказы ampr_emu.index (#62), ошибки fix_access и последний backtrace-контекст.',
  },
  {
    method: 'POST',
    path: '/api/debug/dump-bundle',
    title: 'Полный дамп отладки (память + монтирования + форматы + ошибки)',
    outputArtifact: '/data/titan-core/debug/titan-debug-<ts>.json',
    description:
      'Записывает единый диагностический JSON-снимок на /data и отдаёт его в UI для анализа коллизий и нехватки памяти.',
  },
  {
    method: 'GET',
    path: '/api/debug/formats',
    title: 'Реестр обнаруженных форматов дампов и индексов',
    outputArtifact: 'JSON-сводка по 7 форматам (.pkg, folder, lz4, zstd, ffpkg, ffpfsc, exfat)',
    description:
      'Показывает распределение тайлов по форматам, наличие ampr_emu.index, protected CNT-записей и статус кэша.',
  },
];

export const SAMPLE_TITAN_DEBUG_BUNDLE: TitanCoreDebugBundle = {
  version: '1.0.0-mod-v2.2',
  firmware: '13.60',
  amprVersion: '0.4.1-3ced5c0',
  memory: {
    rssMiB: 284,
    flexibleBudgetMiB: 448,
    amprPoolMiB: 256,
    freeDataGiB: 18.4,
    pageFaultsMajor: 3,
    vmRegionsCount: 142,
    amprMapped: true,
  },
  mounts: [
    { fstype: 'nullfs', from: '/data/titan-core/caches/PPSA08560', on: '/system_ex/app/PPSA08560', rdonly: false },
    { fstype: 'unionfs', from: '<above>:/data/titan-core/caches/PPSA08560/fakelib', on: '/mnt/sandbox/PPSA08560_000/app0/common/lib', rdonly: false },
  ],
  errors: [
    {
      tsMs: 91420,
      titleId: 'PPSA01341',
      errno: 22,
      message: 'ampr_emu.index (4096 bytes): read limit exceeded (#62); rebuilding cache',
    },
  ],
  formatsDetected: {
    'pkg-debug-sparse': 4,
    'folder-zstd': 2,
    'folder-lz4': 1,
    'pfs-ffpkg-ffpfsc': 2,
    'folder-plain': 3,
  },
};

interface DiagnosticRule {
  readonly id: string;
  readonly area: string;
  readonly check: (b: TitanCoreDebugBundle) => DebugBundleFinding | null;
}

const DIAGNOSTIC_RULES: readonly DiagnosticRule[] = [
  {
    id: 'rss-headroom',
    area: 'Память процесса',
    check: (b) => {
      if (b.memory.rssMiB >= b.memory.flexibleBudgetMiB - 64) {
        return {
          id: 'rss-headroom',
          severity: 'critical',
          area: 'Память процесса',
          summary: `RSS ${b.memory.rssMiB} MiB приближается к лимиту Flexible (${b.memory.flexibleBudgetMiB} MiB)`,
          recommendation: 'Проверьте крупные .pkg декодеры и оставьте 256 MiB PRX пул без фоновых дубликатов.',
        };
      }
      return {
        id: 'rss-headroom',
        severity: 'ok',
        area: 'Память процесса',
        summary: `RSS ${b.memory.rssMiB} MiB в норме (запас до ${b.memory.flexibleBudgetMiB} MiB, AMPR пул ${b.memory.amprPoolMiB} MiB)`,
        recommendation: 'Запас памяти стабилен для параллельного скана и AMPR-кэширования.',
      };
    },
  },
  {
    id: 'unionfs-collision',
    area: 'UnionFS / NullFS монтирования',
    check: (b) => {
      const commonLibTargets = new Map<string, number>();
      for (const m of b.mounts) {
        if (m.fstype === 'unionfs' && m.on.includes('common/lib')) {
          commonLibTargets.set(m.on, (commonLibTargets.get(m.on) ?? 0) + 1);
        }
      }
      const collided = [...commonLibTargets.entries()].find(([, count]) => count > 1);
      if (collided) {
        return {
          id: 'unionfs-collision',
          severity: 'critical',
          area: 'UnionFS / NullFS монтирования',
          summary: `Двойное монтирование unionfs на ${collided[0]} (${collided[1]} слоя)`,
          recommendation: 'Включите unified per-title owner gate или размонтируйте дубль через ShadowMountPlus API.',
        };
      }
      return {
        id: 'unionfs-collision',
        severity: 'ok',
        area: 'UnionFS / NullFS монтирования',
        summary: `Активно ${b.mounts.length} монтирований, коллизий common/lib не обнаружено`,
        recommendation: 'Граф монтирований чистый.',
      };
    },
  },
  {
    id: 'ampr-index-and-errors',
    area: 'Ошибки индексов и системных вызовов',
    check: (b) => {
      const idxErr = b.errors.find((e) => e.message.toLowerCase().includes('ampr_emu.index'));
      if (idxErr) {
        return {
          id: 'ampr-index-and-errors',
          severity: 'warning',
          area: 'Ошибки индексов и системных вызовов',
          summary: `Зафиксирована ошибка индекса (${idxErr.titleId}, errno ${idxErr.errno}): ${idxErr.message}`,
          recommendation: 'Запустите точечный rebuild кэша для этого Title ID (используется ampr-emu-ng 3ced5c0 без 48 MiB лимита).',
        };
      }
      if (b.errors.length > 0) {
        return {
          id: 'ampr-index-and-errors',
          severity: 'warning',
          area: 'Ошибки индексов и системных вызовов',
          summary: `В кольцевом буфере ${b.errors.length} предупреждений/ошибок`,
          recommendation: 'Изучите записи errno в /api/debug/error-dump.',
        };
      }
      return {
        id: 'ampr-index-and-errors',
        severity: 'ok',
        area: 'Ошибки индексов и системных вызовов',
        summary: 'Ошибок в кольцевом буфере и паник-дампов не зафиксировано',
        recommendation: 'Система работает штатно.',
      };
    },
  },
  {
    id: 'data-free-space',
    area: 'Хранилище /data',
    check: (b) => {
      if (b.memory.freeDataGiB < 4) {
        return {
          id: 'data-free-space',
          severity: 'critical',
          area: 'Хранилище /data',
          summary: `Критически мало места на /data: ${b.memory.freeDataGiB.toFixed(1)} GiB`,
          recommendation: 'Освободите место перед распаковкой non-streamable loose-файлов и кэшей.',
        };
      }
      return {
        id: 'data-free-space',
        severity: 'ok',
        area: 'Хранилище /data',
        summary: `Свободно на /data: ${b.memory.freeDataGiB.toFixed(1)} GiB`,
        recommendation: 'Места достаточно для кэшей и отладочных бандлов.',
      };
    },
  },
];

export function analyzeTitanDebugBundle(bundle: TitanCoreDebugBundle): DebugBundleFinding[] {
  return DIAGNOSTIC_RULES.map((rule) => rule.check(bundle)).filter(
    (item): item is DebugBundleFinding => item !== null
  );
}
