import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import {
  DEFAULT_GATE_STATE_BY_TIER,
  GTA6_BACKPORT_LAB_PRESET,
  HIGH_FW_TIER_LIST,
  VERDICT_META,
} from '../../mods/highFwFeasibilityData';
import { evaluateHighFwFeasibility } from '../../mods/highFwFeasibilityEvaluator';
import { DumpModRecipePreset } from '../../types/dumpMods';
import { HighFwTierId, TechnicalGateId } from '../../types/highFwFeasibility';

interface HighFwFeasibilityPanelProps {
  onApplyPreset: (preset: DumpModRecipePreset) => void;
}

export const HighFwFeasibilityPanel: React.FC<HighFwFeasibilityPanelProps> = ({
  onApplyPreset,
}) => {
  const [selectedTierId, setSelectedTierId] =
    useState<HighFwTierId>('14.22-private');
  const [satisfiedGates, setSatisfiedGates] = useState<
    readonly TechnicalGateId[]
  >(DEFAULT_GATE_STATE_BY_TIER['14.22-private']);

  const handleSelectTier = (tierId: HighFwTierId) => {
    setSelectedTierId(tierId);
    setSatisfiedGates(DEFAULT_GATE_STATE_BY_TIER[tierId]);
  };

  const handleToggleGate = (gateId: TechnicalGateId) => {
    setSatisfiedGates((prev) =>
      prev.includes(gateId)
        ? prev.filter((id) => id !== gateId)
        : [...prev, gateId]
    );
  };

  const report = useMemo(
    () => evaluateHighFwFeasibility(selectedTierId, satisfiedGates),
    [selectedTierId, satisfiedGates]
  );

  const verdictStyle = VERDICT_META[report.verdictLevel].badgeClass;

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>Мониторинг r/ps5homebrew (1xzfh2m)</span>
            <span aria-hidden="true">·</span>
            <span>18.11.2026</span>
            <span aria-hidden="true">·</span>
            <span>FW 13.60 vs 14.22 / 14.23 (GTA VI)</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            00. Оценка совместимости High-FW дампов (FW 14.22 / GTA VI → 13.60)
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Разбор реальных технических барьеров на фоне обсуждения «GTA 6 dump soon?» (приватный PoC-дамп Gezine на 14.22, экстренный патч Sony 14.23 и предупреждение Echo Stretch): что отделяет игры под FW 14.22 от запуска на взломанной PS5 FW 13.60.
          </p>
        </div>

        <div
          className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium shrink-0 ${verdictStyle}`}
        >
          {report.verdictLabel} · {report.readinessPercent}%
        </div>
      </div>

      {/* Firmware Tier Selector */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Целевой профиль прошивки игры / консоли:
        </div>
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
          {HIGH_FW_TIER_LIST.map((tier) => {
            const active = selectedTierId === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => handleSelectTier(tier.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tier.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Interactive 4-Gate Technical Checklist */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              4 технических условия запуска на FW 13.60 (симулятор гипотез)
            </h3>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              {report.gateEvaluations.filter((g) => g.satisfied).length} /{' '}
              {report.gateEvaluations.length} пройдено
            </span>
          </div>

          <div className="space-y-2.5">
            {report.gateEvaluations.map(({ gate, satisfied }) => (
              <label
                key={gate.id}
                className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                  satisfied
                    ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={satisfied}
                  onChange={() => handleToggleGate(gate.id)}
                  className="mt-0.5 rounded border-slate-300 dark:border-slate-700"
                />
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {gate.title}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                      +{gate.weight}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {gate.technicalDetail}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Right: Verdict, Blockers & Console Safety Advice */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400">
                {report.tier.fwBadge}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                Индекс готовности: {report.readinessPercent}%
              </span>
            </div>

            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-sm overflow-hidden">
              <div
                style={{ width: `${report.readinessPercent}%` }}
                className={`h-full transition-all ${
                  report.verdictLevel === 'ready-1360'
                    ? 'bg-emerald-500'
                    : report.verdictLevel === 'conditional-backport'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
              />
            </div>

            <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
              {report.verdictSummary}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {report.tier.statusSummary}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {report.tier.sceneRealityNote}
            </p>
          </div>

          <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Политика обновления консоли 13.60</span>
            </div>
            <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
              {report.tier.upgradeAdvice}
            </p>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-2">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Активные блокеры ({report.activeBlockers.length})
            </div>
            {report.activeBlockers.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Технические блокеры отсутствуют — стек 13.60 готов.</span>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {report.activeBlockers.map((blocker, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{blocker}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => onApplyPreset(GTA6_BACKPORT_LAB_PRESET)}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-lg border border-blue-500/30 bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 dark:text-blue-300 transition-colors"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Применить шаблон BackPork (14.22 → 13.60) в конфигуратор</span>
          </button>
        </div>
      </div>
    </section>
  );
};
