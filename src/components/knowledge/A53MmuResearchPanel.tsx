import React, { useState } from 'react';

export interface GateDiagnosticItem {
  readonly id: string;
  readonly gate: string;
  readonly title: string;
  readonly status: 'PASS' | 'PARTIAL';
  readonly metrics: readonly { readonly label: string; readonly value: string }[];
  readonly summary: string;
  readonly blockerNote: string;
}

export interface A53MmuProbeStep {
  readonly step: number;
  readonly title: string;
  readonly addressRange: string;
  readonly method: string;
  readonly expectedOutcome: string;
}

export const G0_TO_G4_DIAGNOSTICS_1360: readonly GateDiagnosticItem[] = [
  {
    id: 'gate-g0',
    gate: 'G0 — CPL0 & Hypervisor Cookie',
    title: 'Чтение ядра, проверка гаджетов и установка хука sys_getuid+0xE',
    status: 'PARTIAL',
    metrics: [
      { label: 'Firmware', value: '13.60 (0x13600007)' },
      { label: 'Kernel Text / Data Base', value: '0xffffffffce240000 / 0xffffffffcef00000' },
      { label: 'Data Cave', value: '0xffffffffd0f79000' },
      { label: 'Hypervisor Cookie', value: '0xcafedead00001337 (PASS)' },
      { label: 'Gadgets & CPL0 Stub', value: '16/16 readable (12/12 matched), 21B stub' },
      { label: 'Hook Site & kh_install', value: 'sys_getuid+0xE (kh_install=0, IDT Restore PASS)' },
    ],
    summary:
      'Самотестирование чтения ядра, cookie гипервизора, 16 байт гаджетов и модификация флага XD/XOTEXT в scratch-странице проходят штатно.',
    blockerNote:
      'kernel_exec остаётся PARTIAL: контрольное значение 0x12345678 не записано, регистры CR0/CR3/CR4/CR8 возвращают 0 (хук установлен, но фактическое исполнение stub ещё не подтверждено).',
  },
  {
    id: 'gate-g1',
    gate: 'G1 — IOMMU Subsystem',
    title: 'Инициализация IOMMU Softc, MMIO окна и кольцевого буфера CB3',
    status: 'PASS',
    metrics: [
      { label: 'IOMMU Softc', value: '0xffffff8007368000' },
      { label: 'MMIO VA', value: '0xffff8860fdd80000' },
      { label: 'Command Buffer CB3', value: '0xffffffffd1792000 (Index 0x6)' },
      { label: 'CB3 Head / Tail', value: '0x660 / 0x660 (PASS)' },
    ],
    summary:
      'Полный PASS: структуры драйвера IOMMU, окно регистров MMIO и указатели кольцевого буфера команд CB3 полностью доступны и синхронизированы.',
    blockerNote: 'Блокеров на уровне G1 нет.',
  },
  {
    id: 'gate-g2',
    gate: 'G2 — CR3 & Page Tables',
    title: 'Обход таблиц страниц (Process / Kernel PMAP) и сверка с pmap_kextract',
    status: 'PARTIAL',
    metrics: [
      { label: 'Process / Kernel PMAP Root', value: '0x130fd000 / 0x12094000' },
      { label: 'DMAP Base', value: '0xffff886000000000' },
      { label: 'Kernel Text VA -> PA', value: '0xffffffffce241000 -> 0x0e241000' },
      { label: 'Page Walk', value: 'PASS (level=3, my_walk_pa == pmap_kextract_pa)' },
    ],
    summary:
      'Программный обход таблиц страниц (level=3) полностью совпадает с ядерным pmap_kextract_pa.',
    blockerNote:
      'Чтение аппаратного регистра CPU Live CR3 заблокировано до подтверждения исполнения CPL0-хука из G0.',
  },
  {
    id: 'gate-g3',
    gate: 'G3 — Physical Backing & DMAP',
    title: 'Трансляция физических адресов Kernel Text и Data Cave',
    status: 'PARTIAL',
    metrics: [
      { label: 'Kernel Text VA -> PA', value: '0xffffffffce241000 -> PA 0x0e241000' },
      { label: 'Data Cave VA -> PA', value: '0xffffffffd0f79000 -> PA 0x179000' },
      { label: 'PMAP Walk Levels', value: 'level=3 и level=2 (исправлен старый level=0)' },
      { label: 'Дампы сегментов', value: '3.bin и 4.bin (уникальные имена без коллизий)' },
    ],
    summary:
      'Трансляция виртуальных адресов в физические работает на уровнях 2 и 3.',
    blockerNote:
      'Сверка чтения через VA и DMAP пока расходится (va_bytes == dmap_bytes : 0) — прямое физическое чтение через DMAP-окно требует согласования кэша/атрибутов.',
  },
  {
    id: 'gate-g4',
    gate: 'G4 — A53 / MP4 Coprocessor',
    title: 'Обнаружение сопроцессора A53 (MP4), шины и окна BAR2',
    status: 'PARTIAL',
    metrics: [
      { label: 'MP4 Device Pointer', value: '0xffff8860019de300 (PASS)' },
      { label: 'MP4 Bus Address', value: '0xffffffffd0f98228' },
      { label: 'BAR2 Candidate', value: '0xffff8860e0400000' },
      { label: 'Exec-MMU Root (1.00 ref)', value: 'ttbr0_el3 = PA 0x88000000' },
    ],
    summary:
      'Устройство MP4 и структуры шины обнаружены в памяти ядра; локализованы адреса прошивки в GDDR6 (el3.loader @ 0x80000000, controller.dev @ 0x80200000).',
    blockerNote:
      'Узел /dev/mp4/dump возвращает EPERM, а окно GDDR6 со стороны x86 читается как 0xFF — для снятия дампа подготовлен read-only зонд a53_mmu0.elf.',
  },
];

export const A53_MMU0_PROBE_STEPS: readonly A53MmuProbeStep[] = [
  {
    step: 1,
    title: 'DMAP-зонд корня MMU и адресов прошивки',
    addressRange: 'PA 0x88000000, 0x80000000, 0x80200000 (direct + x16, по 64 KiB)',
    method: 'Walk-gated MCE-safe чтение через DMAP',
    expectedOutcome: 'Классификация регионов: NOT-IN-DMAP / ALL-FF / LIVE',
  },
  {
    step: 2,
    title: 'Чтение регистров маршрутизации Syshub TLB',
    addressRange: 'MMIO @ 0x03230000 (перебор mem_types)',
    method: 'Безопасный опрос таблиц маршрутизации Syshub',
    expectedOutcome: 'Определение управляющего регистра для открытия окна GDDR6',
  },
  {
    step: 3,
    title: 'Верификация вектора сброса в SRAM',
    addressRange: 'SRAM 0x2180–0x21e0',
    method: 'Сверка инструкций mov x1,#0x88000000 ; msr ttbr0_el3,x1',
    expectedOutcome: 'Подтверждение кодировки корня таблиц MMU на прошивке 13.60',
  },
  {
    step: 4,
    title: 'Полный базовый дамп SRAM (768 KiB)',
    addressRange: 'SRAM [0x00000, 0xC0000)',
    method: 'Пошаговое чтение через отладочный интерфейс в /data/a53-mmu0-*.bin',
    expectedOutcome: 'Эталонный дамп 768 KiB SRAM (reset stub + данные)',
  },
  {
    step: 5,
    title: 'Зондирование окон GDDR6 DRAM через Debug API',
    addressRange: 'root / el3.loader / ctrl.dev × mem_types (0x020000, 0x020200, 0x020100)',
    method: 'Проверка фильтрации чтения 0xFF по типам памяти',
    expectedOutcome: 'Базовый срез блокировки перед подготовкой модифицирующего теста mmu1',
  },
];

export const A53MmuResearchPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'gates' | 'mmu0'>('gates');

  return (
    <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              R&D Сводка: A53 / MP4 MMU (`a53_mmu0.elf`) и диагностика G0–G4 на FW 13.60
            </h2>
            <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              PPR / FPKG & A53 R&D · 17.11.2026
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Телеметрия `devchmod` (FW 13.60 `0x13600007`) по уровням G0–G4 и архитектура безопасного read-only зонда `a53_mmu0.elf` для исследования MMU сопроцессора A53
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('gates')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'gates'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Статус уровней G0–G4 (devchmod)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mmu0')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'mmu0'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            План зонда a53_mmu0.elf (5 этапов)
          </button>
        </div>
      </div>

      {activeTab === 'gates' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {G0_TO_G4_DIAGNOSTICS_1360.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {item.gate}
                </span>
                <span
                  className={`px-2 py-0.5 text-[11px] font-mono font-semibold rounded border ${
                    item.status === 'PASS'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {item.title}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-[11px] font-mono">
                {item.metrics.map((m) => (
                  <div key={m.label} className="truncate">
                    <span className="text-slate-400 dark:text-slate-500">{m.label}: </span>
                    <span className="text-slate-800 dark:text-slate-200">{m.value}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.summary}
              </p>

              <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/70 text-[11px] font-mono text-amber-700 dark:text-amber-300">
                Статус / Узкое место: {item.blockerNote}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-blue-500/25 bg-blue-500/5 space-y-2">
            <div className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-300">
              Контекст миссии a53_mmu0.elf (Read-Only / Walk-Gated / MCE-Safe)
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              По символьной референс-прошивке 1.00 вектор сброса A53 выполняет{' '}
              <code className="font-mono text-blue-600 dark:text-blue-400">
                mov x1, #0x88000000 ; msr ttbr0_el3, x1
              </code>{' '}
              (корень таблиц MMU на физическом адресе <code className="font-mono">0x88000000</code>).
              Основной код прошивки сопроцессора загружается из GDDR6 DRAM (
              <code className="font-mono">el3.loader @ 0x80000000</code>,{' '}
              <code className="font-mono">controller.dev @ 0x80200000</code>), тогда как 768 КБ SRAM
              содержат лишь стартовый стаб (2 инструкции MSR/MRS из 489). Со стороны x86-ядра это окно
              GDDR6 возвращает <code className="font-mono">0xFF</code>. Зонд{' '}
              <code className="font-mono">a53_mmu0.elf</code> снимает безопасный базовый срез в{' '}
              <code className="font-mono">/data/a53-mmu0-*.bin</code> без единой операции записи.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {A53_MMU0_PROBE_STEPS.map((s) => (
              <div
                key={s.step}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-2"
              >
                <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  Этап 0{s.step}
                </div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {s.title}
                </h4>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {s.addressRange}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {s.method}
                </p>
                <div className="pt-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                  → {s.expectedOutcome}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
