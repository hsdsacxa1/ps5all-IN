import React, { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { CFW_COREOS_PARTITIONS } from '../../data/cfwStagesData';
import {
  generateCfwManifestToml,
  RND_BREAKTHROUGH_TOGGLES,
  simulateCfwBreakthroughs,
} from '../../research/cfwResearchEngine';
import { CfwStageId } from '../../types/cfwResearch';

interface CfwArchitectureBlueprintPanelProps {
  unlockedStageIds: readonly CfwStageId[];
  onToggleBreakthrough: (stageId: CfwStageId) => void;
  onUnlockAll: () => void;
  onResetBaseline: () => void;
}

export const CfwArchitectureBlueprintPanel: React.FC<
  CfwArchitectureBlueprintPanelProps
> = ({
  unlockedStageIds,
  onToggleBreakthrough,
  onUnlockAll,
  onResetBaseline,
}) => {
  const [copiedManifest, setCopiedManifest] = useState(false);
  const unlockedSet = new Set<CfwStageId>(unlockedStageIds);
  const simulation = simulateCfwBreakthroughs(unlockedStageIds);
  const manifestToml = generateCfwManifestToml(unlockedStageIds);

  const handleCopyManifest = () => {
    navigator.clipboard?.writeText(manifestToml);
    setCopiedManifest(true);
    setTimeout(() => setCopiedManifest(false), 1800);
  };

  const handleDownloadManifest = () => {
    const blob = new Blob([manifestToml], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prospero-1360-cfw-blueprint.toml';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-mono text-blue-600 dark:text-blue-400">
            Финальная Точка (Endgame Milestone) · Архитектура Кастомной Прошивки (Prospero-CFW 13.60)
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            Интерактивный симулятор прорывов R&amp;D и чертёж патчей разделов CoreOS / SPI NOR
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onResetBaseline}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            Сбросить к текущему 13.60
          </button>
          <button
            type="button"
            onClick={onUnlockAll}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap"
          >
            Смоделировать полный взлом (100% CFW)
          </button>
        </div>
      </div>

      {/* Interactive R&D Breakthrough Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-3">
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Переключайте недостающие рубежи реверс-инжиниринга, чтобы увидеть, как меняется готовность CFW:
          </div>

          <div className="space-y-2.5">
            {RND_BREAKTHROUGH_TOGGLES.map((item) => {
              const isUnlocked = unlockedSet.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggleBreakthrough(item.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors flex items-start justify-between gap-4 ${
                    isUnlocked
                      ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span
                        className={`font-semibold ${
                          isUnlocked
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        [{isUnlocked ? 'UNLOCKED' : 'LOCKED'}] {item.shortBadge}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-blue-600 dark:text-blue-400 tabular-nums">
                        +{item.readinessBoost}% к CFW
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {item.label}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.unlockedCapability}
                    </p>
                  </div>

                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
                    {item.bootSecondsDelta} с старта
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Simulation Outcome Summary & Manifest Preview */}
        <div className="lg:col-span-5 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-4">
          <div className="grid grid-cols-3 gap-3 pb-4 border-b border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums">
            <div>
              <div className="text-slate-500 dark:text-slate-400">Индекс CFW</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {simulation.simulatedReadinessPercent}%
                {simulation.deltaPercent > 0 && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">
                    (+{simulation.deltaPercent}%)
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Старт до HEN</div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {simulation.estimatedBootToHenSeconds} с
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Режим</div>
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1 leading-tight">
                {simulation.achievedPersistence}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
                Манифест сборки кастомной прошивки (manifest.cfw.toml)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyManifest}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {copiedManifest ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedManifest ? 'Скопировано' : 'Копировать'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadManifest}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.toml</span>
                </button>
              </div>
            </div>

            <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 border border-slate-800 text-[11px] font-mono overflow-x-auto max-h-64 leading-relaxed">
              <code>{manifestToml}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* CoreOS & Flash Partition Patch Layout Table */}
      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
          Карта модификации системных разделов для создания полноценной Prospero-CFW 13.60
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3.5">Системный раздел / Чип</th>
                <th className="py-2.5 px-3.5">Адрес / Смещение</th>
                <th className="py-2.5 px-3.5">Крипто-слой Sony</th>
                <th className="py-2.5 px-3.5">Поведение в стоковой OFW 13.60</th>
                <th className="py-2.5 px-3.5">Патч в целевой Prospero-CFW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {CFW_COREOS_PARTITIONS.map((part) => (
                <tr
                  key={part.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-950/50"
                >
                  <td className="py-3 px-3.5 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {part.partitionName}
                  </td>
                  <td className="py-3 px-3.5 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap tabular-nums">
                    {part.targetPathOrOffset}
                  </td>
                  <td className="py-3 px-3.5 font-mono text-slate-600 dark:text-slate-400">
                    {part.cryptoLayer}
                  </td>
                  <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300">
                    {part.stockBehavior}
                  </td>
                  <td className="py-3 px-3.5 text-emerald-700 dark:text-emerald-300 font-medium">
                    {part.cfwPatchAction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
