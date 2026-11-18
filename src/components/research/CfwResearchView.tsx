import React, { useState } from 'react';
import {
  calculateBaselineReadiness,
  RND_BREAKTHROUGH_TOGGLES,
  simulateCfwBreakthroughs,
} from '../../research/cfwResearchEngine';
import { CfwStageId } from '../../types/cfwResearch';
import { CfwArchitectureBlueprintPanel } from './CfwArchitectureBlueprintPanel';
import { CfwChartsPanel } from './CfwChartsPanel';
import { CfwStageInspectorPanel } from './CfwStageInspectorPanel';

export const CfwResearchView: React.FC = () => {
  const [selectedStageId, setSelectedStageId] =
    useState<CfwStageId>('stage-1-entry');
  const [unlockedStageIds, setUnlockedStageIds] = useState<CfwStageId[]>([]);

  const baselineReadiness = calculateBaselineReadiness();
  const simResult = simulateCfwBreakthroughs(unlockedStageIds);

  const handleToggleBreakthrough = (stageId: CfwStageId) => {
    setUnlockedStageIds((prev) =>
      prev.includes(stageId)
        ? prev.filter((id) => id !== stageId)
        : [...prev, stageId]
    );
    setSelectedStageId(stageId);
  };

  const handleUnlockAll = () => {
    setUnlockedStageIds(RND_BREAKTHROUGH_TOGGLES.map((t) => t.id));
    setSelectedStageId('stage-8-untethered-cfw');
  };

  const handleResetBaseline = () => {
    setUnlockedStageIds([]);
    setSelectedStageId('stage-1-entry');
  };

  return (
    <div className="space-y-8">
      {/* Executive Reverse-Engineering Summary Header */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1.5 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
              <span>Exploit Dev &amp; Reverse Engineering Roadmap</span>
              <span>·</span>
              <span>Target: PS5 Prospero FW 13.60 (0x13600007)</span>
              <span>·</span>
              <span>Ring 3 → Ring 0 → Ring -1 → EL3 → AMD-SP → Coldboot CFW</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Исследование полного цикла взлома консоли: 8 этапов до создания Кастомной Прошивки (CFW)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Системная декомпозиция архитектуры безопасности PlayStation 5 глазами реверс-инженера: от первичного захвата управления в пользовательской песочнице (Y2JB / WebKit) и перехвата структур ядра FreeBSD (<code className="font-mono">Relapse-Exploit</code> + <code className="font-mono">kstuff-lite</code>) до снятия <code className="font-mono">XOM</code> в гипервизоре AMD SVM (<code className="font-mono">Byepervisor-Reborn</code>), штурма MMU сопроцессора ARM Cortex-A53 (<code className="font-mono">a53_mmu0.elf</code>), криптопроцессора AMD-SP (PSP/CCP) и финальной сборки постоянной кастомной прошивки (<code className="font-mono">Prospero-CFW</code>).
            </p>
          </div>
        </div>

        {/* 4-Column Quantitative KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono tabular-nums">
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-1">
            <div className="text-slate-500 dark:text-slate-400">
              Базовая готовность цепочки 13.60
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {baselineReadiness}% (Симуляция: {simResult.simulatedReadinessPercent}%)
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Пройдены Ring 3, Ring 0 Data R/W и Ring 0+ kstuff
            </div>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-1">
            <div className="text-slate-500 dark:text-slate-400">
              Статус Гипервизора (Ring -1 SVM)
            </div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              S3 XOM Bypass (58%)
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Byepervisor-Reborn снимает XOM после Rest Mode
            </div>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-1">
            <div className="text-slate-500 dark:text-slate-400">
              Рубеж Сопроцессора (A53 MP4 EL3)
            </div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              SRAM 768K / G1 PASS (44%)
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Зонд a53_mmu0.elf + userland ampr-emu-ng 256M
            </div>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-1">
            <div className="text-slate-500 dark:text-slate-400">
              Финальная Точка (Coldboot CFW)
            </div>
            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {simResult.achievedPersistence.split('(')[0]?.trim()}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Время от старта до полного HEN: ~{simResult.estimatedBootToHenSeconds} с
            </div>
          </div>
        </div>
      </section>

      {/* 3 Analytical SVG & Matrix Charts */}
      <CfwChartsPanel
        selectedStageId={selectedStageId}
        unlockedStageIds={unlockedStageIds}
        onSelectStage={setSelectedStageId}
      />

      {/* 8-Stage Reverse-Engineering Pipeline & Deep-Dive Inspector */}
      <CfwStageInspectorPanel
        selectedStageId={selectedStageId}
        onSelectStage={setSelectedStageId}
      />

      {/* Endgame CFW Architecture Blueprint & R&D Simulator */}
      <CfwArchitectureBlueprintPanel
        unlockedStageIds={unlockedStageIds}
        onToggleBreakthrough={handleToggleBreakthrough}
        onUnlockAll={handleUnlockAll}
        onResetBaseline={handleResetBaseline}
      />
    </div>
  );
};
