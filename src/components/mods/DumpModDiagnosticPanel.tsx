import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { DUMP_SYMPTOMS_DIAGNOSIS } from '../../data/dumpSymptomsData';
import { getDumpSymptomById } from '../../mods/dumpModRegistry';
import {
  DumpModRecipePreset,
  DumpSymptomId,
} from '../../types/dumpMods';

interface DumpModDiagnosticPanelProps {
  onApplyPreset: (preset: DumpModRecipePreset) => void;
}

const SEVERITY_STYLES: Record<'critical' | 'high' | 'medium', string> = {
  critical:
    'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70',
  high:
    'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/70',
  medium:
    'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/70',
};

export const DumpModDiagnosticPanel: React.FC<DumpModDiagnosticPanelProps> = ({
  onApplyPreset,
}) => {
  const [selectedSymptomId, setSelectedSymptomId] =
    useState<DumpSymptomId>('ce-108255-1-ampr');

  const activeSymptom = getDumpSymptomById(selectedSymptomId);

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 space-y-5">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 space-y-1">
        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
          Интерактивный траблшутер дампов PS5 (Symptom-to-Fix Resolver)
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          02. Диагностика ошибок запуска дампов и проблем с DLC / Модами на 13.60
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Выберите симптом или код ошибки PS5 (CE-108255-1, CE-107112-2, CE-100008-9, вечный вход в PSN, закрытые DLC), чтобы увидеть точную причину и загрузить готовый рецепт исправления.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Symptom Selector List */}
        <div className="lg:col-span-5 space-y-2">
          {DUMP_SYMPTOMS_DIAGNOSIS.map((symptom) => {
            const isSelected = symptom.id === selectedSymptomId;
            return (
              <button
                key={symptom.id}
                type="button"
                onClick={() => setSelectedSymptomId(symptom.id)}
                className={`w-full text-left p-3.5 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-blue-600 dark:border-blue-400 bg-blue-50/60 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    {symptom.errorCodeOrSymptom}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded border ${
                      SEVERITY_STYLES[symptom.severity]
                    }`}
                  >
                    {symptom.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {symptom.shortTitle}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right: Detailed Diagnosis & Remediation */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs font-mono text-blue-600 dark:text-blue-400">
                {activeSymptom.errorCodeOrSymptom}
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">
                {activeSymptom.shortTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Типичные игры: <span className="font-medium text-slate-700 dark:text-slate-300">{activeSymptom.affectedExamples}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => onApplyPreset(activeSymptom.preset)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Загрузить фикс в генератор ({activeSymptom.preset.titleId})
            </button>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Корневая причина (Root Cause на FW 13.60):</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {activeSymptom.rootCause}
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-900 dark:text-white">
              Пошаговый план устранения:
            </div>
            <ol className="space-y-2">
              {activeSymptom.remediationSteps.map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-mono text-slate-900 dark:text-white mr-1">
                      Шаг {idx + 1}:
                    </strong>
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>Необходимый стек:</span>
            {activeSymptom.recommendedTools.map((tool) => (
              <span
                key={tool}
                className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
