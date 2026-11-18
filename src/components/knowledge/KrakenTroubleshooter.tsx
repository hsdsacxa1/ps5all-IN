import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, FileSearch, Terminal } from 'lucide-react';
import {
  diagnoseKrakenIssue,
  KRAKEN_DIAGNOSTIC_RULES,
} from '../../mounters/krakenDiagnostics';

export const KrakenTroubleshooter: React.FC = () => {
  const [filterCategory, setFilterCategory] = useState<
    'all' | 'detection' | 'launch'
  >('all');
  const [diagnosticInput, setDiagnosticInput] = useState<string>('');

  const matchedRules = diagnoseKrakenIssue(diagnosticInput).filter(
    (rule) => filterCategory === 'all' || rule.category === filterCategory
  );

  return (
    <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Анализ исходного кода quer3q/kraken-mount v0.0.1-beta (src/scan.rs, src/storage.rs, src/launch.rs, src/cache.rs)
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Диагностика: почему Kraken Mount v0.0.1-beta не видит или не запускает игры
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Точные причины из Rust-исходников пэйлоада и открытых баг-репортов (#4, #5, #8, #12, #13, #15, #18). Вставьте строку из{' '}
            <code className="font-mono text-slate-800 dark:text-slate-200">
              /data/krakenmount/kraken.log
            </code>{' '}
            или путь к вашей игре для мгновенной проверки.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
          {(
            [
              { id: 'all', label: `Все причины (${KRAKEN_DIAGNOSTIC_RULES.length})` },
              { id: 'detection', label: 'Не видит игры (scan.rs)' },
              { id: 'launch', label: 'Не запускает (launch.rs)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterCategory(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filterCategory === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Log / Path Analyzer Input */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        <div className="lg:col-span-8 relative">
          <label htmlFor="kraken-diag-input" className="sr-only">
            Строка из kraken.log или путь к файлу игры
          </label>
          <input
            id="kraken-diag-input"
            type="text"
            value={diagnosticInput}
            onChange={(e) => setDiagnosticInput(e.target.value)}
            placeholder="Вставьте ошибку из /data/krakenmount/kraken.log (например: sparse extent, occupied by unionfs) или путь (/mnt/usb0/homebrew/Game/test.pkg)..."
            className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          />
          <FileSearch className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="lg:col-span-4 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              setDiagnosticInput(
                'unsupported package: the layout has a sparse extent at mount 0xeb83b4f5; repack with --kraken stored'
              )
            }
            className="px-2.5 py-1.5 text-[11px] font-mono rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Пример: sparse extent
          </button>
          <button
            type="button"
            onClick={() =>
              setDiagnosticInput(
                'PPSA08560 common/lib occupied by unionfs from /data/ShadowMountPlus; not mounting'
              )
            }
            className="px-2.5 py-1.5 text-[11px] font-mono rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Пример: конфликт SMP
          </button>
          {diagnosticInput && (
            <button
              type="button"
              onClick={() => setDiagnosticInput('')}
              className="px-2.5 py-1.5 text-[11px] font-mono rounded text-blue-600 dark:text-blue-400 hover:underline"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matchedRules.map((rule) => (
          <div
            key={rule.id}
            className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 space-y-2.5 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                <span
                  className={
                    rule.category === 'detection'
                      ? 'text-amber-600 dark:text-amber-400 font-semibold'
                      : 'text-red-600 dark:text-red-400 font-semibold'
                  }
                >
                  {rule.category === 'detection'
                    ? 'НЕ ВИДИТ ИГРУ (SCAN / CACHE)'
                    : 'НЕ ЗАПУСКАЕТСЯ (LAUNCH / SANDBOX)'}
                </span>
                <span className="text-slate-500 dark:text-slate-400 truncate">
                  {rule.sourceLocation}
                </span>
              </div>

              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {rule.symptom}
              </h4>

              <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-amber-300 flex items-center gap-2 overflow-x-auto">
                <Terminal className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <code>{rule.logSignature}</code>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong className="text-slate-900 dark:text-slate-100">
                  Причина в коде:
                </strong>{' '}
                {rule.rootCause}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1">
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Как исправить:</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                {rule.fixSteps.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
