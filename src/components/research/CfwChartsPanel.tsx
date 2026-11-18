import React, { useState } from 'react';
import {
  FIRMWARE_MITIGATION_TIMELINE,
  SECURITY_LAYER_COMPARISON_MATRIX,
} from '../../data/cfwChartsData';
import { CFW_RESEARCH_STAGES_1360 } from '../../data/cfwStagesData';
import { CfwStageId } from '../../types/cfwResearch';

interface CfwChartsPanelProps {
  selectedStageId: CfwStageId;
  unlockedStageIds: readonly CfwStageId[];
  onSelectStage: (stageId: CfwStageId) => void;
}

export const CfwChartsPanel: React.FC<CfwChartsPanelProps> = ({
  selectedStageId,
  unlockedStageIds,
  onSelectStage,
}) => {
  const [selectedFwIndex, setSelectedFwIndex] = useState<number>(5); // FW 11.00-13.60 default
  const unlockedSet = new Set<CfwStageId>(unlockedStageIds);
  const selectedFwPoint =
    FIRMWARE_MITIGATION_TIMELINE[selectedFwIndex] ??
    FIRMWARE_MITIGATION_TIMELINE[5];

  // SVG Geometry for Chart 2 (Firmware Evolution Line Chart)
  const svgWidth = 760;
  const svgHeight = 250;
  const padLeft = 44;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 42;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const getX = (idx: number) =>
    padLeft +
    (idx / Math.max(1, FIRMWARE_MITIGATION_TIMELINE.length - 1)) * plotWidth;
  const getY = (val: number) => padTop + ((100 - val) / 100) * plotHeight;

  const buildPolyline = (
    selector: (pt: (typeof FIRMWARE_MITIGATION_TIMELINE)[number]) => number
  ) =>
    FIRMWARE_MITIGATION_TIMELINE.map(
      (pt, i) => `${getX(i).toFixed(1)},${getY(selector(pt)).toFixed(1)}`
    ).join(' ');

  return (
    <div className="space-y-6">
      {/* Top Row: Chart 1 (8 Stages Readiness vs Complexity) & Chart 2 (Firmware Timeline SVG) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* CHART 1: 8-Stage Readiness vs Reverse-Engineering Complexity */}
        <div className="xl:col-span-6 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-4">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
              <span>График 01 · Поэтапная готовность взлома PS5 13.60</span>
              <span>Клик по этапу открывает разбор</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              Готовность на FW 13.60 (%) vs Сложность реверс-инжиниринга
            </h3>
          </div>

          <div className="space-y-2.5">
            {CFW_RESEARCH_STAGES_1360.map((stage) => {
              const isSelected = stage.id === selectedStageId;
              const isSimulatedUnlock = unlockedSet.has(stage.id);
              const effectiveCompletion = isSimulatedUnlock
                ? 100
                : stage.completionPercent1360;

              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => onSelectStage(stage.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-mono mb-1.5">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {stage.shortLabel}{' '}
                      <span className="text-slate-500 dark:text-slate-400 font-normal">
                        ({stage.privilegeRing.split('(')[0]?.trim()})
                      </span>
                    </span>
                    <div className="flex items-center gap-3 shrink-0 tabular-nums">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Готовность: {effectiveCompletion}%
                        {isSimulatedUnlock &&
                          stage.completionPercent1360 < 100 &&
                          ' (R&D Sim)'}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400">
                        Сложность: {stage.difficultyScore}/100
                      </span>
                    </div>
                  </div>

                  {/* Dual Horizontal Bars */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-sm overflow-hidden flex">
                      <div
                        style={{ width: `${effectiveCompletion}%` }}
                        className={`h-full transition-all ${
                          isSimulatedUnlock
                            ? 'bg-blue-500'
                            : effectiveCompletion >= 80
                              ? 'bg-emerald-500'
                              : effectiveCompletion >= 40
                                ? 'bg-amber-500'
                                : 'bg-indigo-500'
                        }`}
                      />
                    </div>
                    <div className="w-full h-1 bg-slate-200/70 dark:bg-slate-800/70 rounded-sm overflow-hidden">
                      <div
                        style={{ width: `${stage.difficultyScore}%` }}
                        className="h-full bg-rose-500/75"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>Верхняя полоса: Прогресс взлома на FW 13.60 (%)</span>
            <span>Нижняя тонкая полоса: Индекс крипто/аппаратной сложности</span>
          </div>
        </div>

        {/* CHART 2: Multi-Line SVG Evolution Chart across Firmware Generations */}
        <div className="xl:col-span-6 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-4">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
              <span>График 02 · Эволюция прошивок PS5 (FW 1.00 → 14.22)</span>
              <span>Нажмите на узел эпохи для деталей</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              Доступность эксплойтов vs Аппаратная изоляция Sony
            </h3>
          </div>

          {/* Interactive SVG Multi-Line Chart */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto select-none"
              role="img"
              aria-label="График эволюции поверхности атаки и защит PS5 от FW 1.00 до FW 14.22"
            >
              {/* Horizontal Grid Lines */}
              {[0, 25, 50, 75, 100].map((tick) => {
                const y = getY(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={svgWidth - padRight}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                      strokeDasharray={tick === 0 || tick === 100 ? undefined : '4 4'}
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
                    >
                      {tick}%
                    </text>
                  </g>
                );
              })}

              {/* Highlight active firmware column */}
              <line
                x1={getX(selectedFwIndex)}
                y1={padTop}
                x2={getX(selectedFwIndex)}
                y2={svgHeight - padBottom}
                stroke="currentColor"
                className="text-blue-500/40"
                strokeWidth="2"
                strokeDasharray="3 3"
              />

              {/* Line 1: Hardware Lockdown Index (Rose) */}
              <polyline
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                points={buildPolyline((p) => p.hardwareLockdownIndex)}
              />

              {/* Line 2: Entrypoint RCE Score (Emerald) */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                points={buildPolyline((p) => p.entryVectorScore)}
              />

              {/* Line 3: Kernel Data R/W Score (Blue) */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                points={buildPolyline((p) => p.kernelRwScore)}
              />

              {/* Line 4: Hypervisor Ring -1 Bypass Score (Amber) */}
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                points={buildPolyline((p) => p.hvBypassScore)}
              />

              {/* Interactive Data Nodes & X-Axis Labels */}
              {FIRMWARE_MITIGATION_TIMELINE.map((pt, idx) => {
                const x = getX(idx);
                const isSelected = idx === selectedFwIndex;
                return (
                  <g
                    key={pt.fwRange}
                    className="cursor-pointer"
                    onClick={() => setSelectedFwIndex(idx)}
                  >
                    <circle
                      cx={x}
                      cy={getY(pt.hardwareLockdownIndex)}
                      r={isSelected ? 5.5 : 3.5}
                      fill="#f43f5e"
                    />
                    <circle
                      cx={x}
                      cy={getY(pt.entryVectorScore)}
                      r={isSelected ? 5.5 : 3.5}
                      fill="#10b981"
                    />
                    <circle
                      cx={x}
                      cy={getY(pt.kernelRwScore)}
                      r={isSelected ? 5.5 : 3.5}
                      fill="#3b82f6"
                    />
                    <circle
                      cx={x}
                      cy={getY(pt.hvBypassScore)}
                      r={isSelected ? 5.5 : 3.5}
                      fill="#f59e0b"
                    />
                    <text
                      x={x}
                      y={svgHeight - 16}
                      textAnchor="middle"
                      className={`text-[10px] font-mono ${
                        isSelected
                          ? 'fill-blue-600 dark:fill-blue-400 font-bold'
                          : 'fill-slate-500 dark:fill-slate-400'
                      }`}
                    >
                      {pt.fwRange.replace('FW ', '')}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-300">
            <span>Зелёная: Userland Entry (Y2JB/WebKit)</span>
            <span>·</span>
            <span>Синяя: Kernel R/W (Relapse/UMTX)</span>
            <span>·</span>
            <span>Янтарная: Ring -1 HV Bypass</span>
            <span>·</span>
            <span>Красная: Изоляция Sony</span>
          </div>

          {/* Selected Firmware Era Telemetry Box */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {selectedFwPoint.fwRange} · {selectedFwPoint.releaseEra}
              </span>
              <span className="text-slate-600 dark:text-slate-400 tabular-nums">
                Entry: {selectedFwPoint.entryVectorScore}% · Kernel:{' '}
                {selectedFwPoint.kernelRwScore}% · HV:{' '}
                {selectedFwPoint.hvBypassScore}% · Lock:{' '}
                {selectedFwPoint.hardwareLockdownIndex}%
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedFwPoint.keyVectorsAndPatches}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Row: Chart 3 (Cross-Generation Security Barrier Comparison PS3 vs PS4 vs PS5 13.60 vs PS5 Target CFW) */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              График 03 · Сравнительная матрица пробития защитных колец (PS3 → PS4 → PS5 13.60 → Target CFW)
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              Почему PS3 получила полный Coldboot CFW, а на PS5 13.60 ключевой рубеж — Ring -1, A53 и AMD-SP
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-400">
            <span>PS3 CFW 3.55</span>
            <span>·</span>
            <span>PS4 GoldHEN 9.00</span>
            <span>·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              PS5 13.60 (Сейчас)
            </span>
            <span>·</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              PS5 Target CFW
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECURITY_LAYER_COMPARISON_MATRIX.map((layer) => (
            <div
              key={layer.layerId}
              className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3"
            >
              <div className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
                {layer.layerName}
              </div>

              <div className="space-y-2 text-[11px] font-mono tabular-nums">
                <div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                    <span>PS3 CFW (lv0 keys)</span>
                    <span>{layer.ps3Cfw355}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-sm overflow-hidden">
                    <div
                      style={{ width: `${layer.ps3Cfw355}%` }}
                      className="h-full bg-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                    <span>PS4 Orbis (GoldHEN)</span>
                    <span>{layer.ps4GoldHen900}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-sm overflow-hidden">
                    <div
                      style={{ width: `${layer.ps4GoldHen900}%` }}
                      className="h-full bg-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-semibold mb-0.5">
                    <span>PS5 FW 13.60 (Current)</span>
                    <span>{layer.ps5Fw1360Current}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-sm overflow-hidden">
                    <div
                      style={{ width: `${layer.ps5Fw1360Current}%` }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-blue-600 dark:text-blue-400 mb-0.5">
                    <span>PS5 Target CFW</span>
                    <span>{layer.ps5CfwTarget}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-sm overflow-hidden">
                    <div
                      style={{ width: `${layer.ps5CfwTarget}%` }}
                      className="h-full bg-blue-500"
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1 border-t border-slate-200/70 dark:border-slate-800/70">
                {layer.technicalNote}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
