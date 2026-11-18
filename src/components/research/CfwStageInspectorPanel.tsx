import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  CfwStageFilter,
  filterCfwStages,
} from '../../research/cfwResearchEngine';
import { CfwResearchStage, CfwStageId } from '../../types/cfwResearch';

interface CfwStageInspectorPanelProps {
  selectedStageId: CfwStageId;
  onSelectStage: (stageId: CfwStageId) => void;
}

const FILTER_OPTIONS: ReadonlyArray<{ id: CfwStageFilter; label: string }> = [
  { id: 'ALL', label: 'Все 8 этапов' },
  { id: 'ACHIEVED', label: 'Пройдено на 13.60 (3)' },
  { id: 'PARTIAL_RND', label: 'Активный R&D (2)' },
  { id: 'LOCKED_TARGET', label: 'Закрытые рубежи (2)' },
  { id: 'ENDGAME_CFW', label: 'Финал: CFW (1)' },
];

const STATUS_LABELS: Readonly<Record<CfwResearchStage['status1360'], string>> = {
  ACHIEVED: 'ДОСТИГНУТО НА 13.60',
  PARTIAL_RND: 'ЧАСТИЧНЫЙ ДОСТУП / R&D',
  LOCKED_TARGET: 'АППАРАТНЫЙ БАРЬЕР',
  ENDGAME_CFW: 'ФИНАЛЬНАЯ ЦЕЛЬ: CFW',
};

export const CfwStageInspectorPanel: React.FC<CfwStageInspectorPanelProps> = ({
  selectedStageId,
  onSelectStage,
}) => {
  const [stageFilter, setStageFilter] = useState<CfwStageFilter>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const visibleStages = filterCfwStages(stageFilter);
  const activeStage =
    visibleStages.find((s) => s.id === selectedStageId) ??
    visibleStages[0] ??
    filterCfwStages('ALL')[0]!;

  const handleFilterChange = (nextFilter: CfwStageFilter) => {
    setStageFilter(nextFilter);
    const nextList = filterCfwStages(nextFilter);
    if (nextList.length > 0 && !nextList.some((s) => s.id === selectedStageId)) {
      onSelectStage(nextList[0]!.id);
    }
  };

  const handleCopySnippet = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Анатомия полного взлома консоли · От Userland RCE до Untethered Custom Firmware
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            Поэтапная декомпозиция цепочки эксплойтов и реверс-инжиниринга (8 ступеней)
          </h2>
        </div>

        {/* Interactive Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
          {FILTER_OPTIONS.map((tab) => {
            const active = tab.id === stageFilter;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleFilterChange(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 8-Stage Pipeline Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {visibleStages.map((stage) => {
          const isSelected = stage.id === activeStage.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelectStage(stage.id)}
              className={`text-left p-3.5 rounded-xl border transition-colors space-y-1.5 ${
                isSelected
                  ? 'border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                <span>Этап 0{stage.stageNumber}</span>
                <span>
                  {stage.completionPercent1360}% · Сложность {stage.difficultyScore}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                {stage.title}
              </div>
              <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 truncate">
                {STATUS_LABELS[stage.status1360]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Stage Deep-Dive Inspector */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400">
              <span>{activeStage.codeName}</span>
              <span>·</span>
              <span>{activeStage.privilegeRing}</span>
              <span>·</span>
              <span>Постоянство: {activeStage.persistenceTier}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Этап 0{activeStage.stageNumber}. {activeStage.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeStage.summary}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono tabular-nums shrink-0 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-slate-400 dark:text-slate-500">Готовность 13.60</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {activeStage.completionPercent1360}%
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <div className="text-slate-400 dark:text-slate-500">Сложность RE</div>
              <div className="text-base font-bold text-rose-600 dark:text-rose-400">
                {activeStage.difficultyScore}/100
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Attack Vectors vs Hardware Mitigations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <h4 className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
              Векторы атаки и эксплойты на 13.60
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4">
              {activeStage.attackVectors.map((vec) => (
                <li key={vec} className="leading-relaxed">
                  {vec}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <h4 className="text-xs font-mono font-semibold text-rose-700 dark:text-rose-400">
              Аппаратные и криптографические защиты Sony (Mitigations)
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4">
              {activeStage.hardwareMitigations.map((mit) => (
                <li key={mit} className="leading-relaxed">
                  {mit}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Reverse Engineering Artifacts & Memory Map Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
            Ключевые артефакты реверс-инжиниринга, адреса памяти и смещения (FW 13.60)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeStage.reverseEngineeringArtifacts.map((art) => (
              <div
                key={art.name}
                className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1"
              >
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {art.name}
                </div>
                <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 break-all">
                  {art.addressOrOffset}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {art.role}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Obtained Primitives & Blockers to Next Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-400">
              Получаемые примитивы (Primitives Unlocked)
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4">
              {activeStage.keyPrimitives.map((prim) => (
                <li key={prim} className="leading-relaxed">
                  {prim}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-400">
              Узкое место / Блокер перехода к следующему этапу
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4">
              {activeStage.blockersToNextStage.map((blk) => (
                <li key={blk} className="leading-relaxed">
                  {blk}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Code / ASM Reverse-Engineering Snippet */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
              Низкоуровневый фрагмент реализации / патча ({activeStage.codeName})
            </span>
            <button
              type="button"
              onClick={() =>
                handleCopySnippet(activeStage.technicalSnippet, activeStage.id)
              }
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              {copiedId === activeStage.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copiedId === activeStage.id ? 'Скопировано' : 'Копировать код'}
              </span>
            </button>
          </div>
          <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 border border-slate-800 text-xs font-mono overflow-x-auto leading-relaxed">
            <code>{activeStage.technicalSnippet}</code>
          </pre>
        </div>

        {/* Cross-Generation Evolution Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="font-mono text-slate-400 dark:text-slate-500 mb-0.5">
              PS3 (Cell / lv0 / CFW 3.55)
            </div>
            <div className="text-slate-700 dark:text-slate-300">
              {activeStage.crossGenComparison.ps3Lv0}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="font-mono text-slate-400 dark:text-slate-500 mb-0.5">
              PS4 (OrbisOS / GoldHEN)
            </div>
            <div className="text-slate-700 dark:text-slate-300">
              {activeStage.crossGenComparison.ps4Orbis}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">
              PS5 (Prospero FW 13.60)
            </div>
            <div className="text-slate-800 dark:text-slate-200">
              {activeStage.crossGenComparison.ps5Prospero1360}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
