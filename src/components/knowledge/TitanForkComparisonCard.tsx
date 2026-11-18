import React, { useState } from 'react';
import { CheckCircle2, GitCompare, Layers, ShieldCheck, XCircle } from 'lucide-react';
import {
  matchBackportCatalogEntry,
  PROTECTED_Y2JB_TITLE_IDS,
  SAMPLE_BACKPORT_CATALOG_V1,
  TITAN_FORK_COMPARISON_MATRIX,
} from '../../mounters/titanForkComparison';

export const TitanForkComparisonCard: React.FC = () => {
  const [testTitleId, setTestTitleId] = useState<string>('PPSA08560');
  const [testGameVersion, setTestGameVersion] = useState<string>('1.8.0');
  const [testFirmware, setTestFirmware] = useState<string>('13.60');
  const [testModel, setTestModel] = useState<'base' | 'pro'>('base');

  const matchResult = matchBackportCatalogEntry(SAMPLE_BACKPORT_CATALOG_V1, {
    titleId: testTitleId,
    gameVersion: testGameVersion,
    firmware: testFirmware,
    consoleModel: testModel,
    sourceKind: 'pkg',
  });

  return (
    <div className="p-4 rounded-xl border border-purple-500/35 bg-purple-500/5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-purple-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-purple-600 dark:text-purple-400">
            <GitCompare className="w-4 h-4 shrink-0" />
            <span>СРАВНЕНИЕ ФОРКОВ: grimmtroll2285-dot/TITAN (FIX7 v1.0.5) vs НАШ TITAN-CORE Mod v2.2 / v2.3</span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Матрица различий и портированных функций в Mod v2.3 (PlayGo Stub 0.6 + SMP isolated4 + Y2JB 3-Region + Backports Schema v1)
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
          {PROTECTED_Y2JB_TITLE_IDS.map((tid) => (
            <span
              key={tid}
              className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
            >
              Y2JB Guard: {tid}
            </span>
          ))}
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500">
              <th className="py-2 pr-3">Подсистема</th>
              <th className="py-2 px-3">grimmtroll2285-dot/TITAN (FIX7 v1.0.5)</th>
              <th className="py-2 px-3">Наш Mod v2.2 (Preserved)</th>
              <th className="py-2 pl-3 text-emerald-700 dark:text-emerald-300">
                Наш Mod v2.3 (Объединённый)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
            {TITAN_FORK_COMPARISON_MATRIX.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="py-2.5 pr-3 font-semibold text-slate-900 dark:text-slate-100">
                  {row.featureArea}
                </td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                  {row.grimmtrollTitanFix7}
                </td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                  {row.ourModV22}
                </td>
                <td className="py-2.5 pl-3 font-medium text-emerald-700 dark:text-emerald-300">
                  {row.ourModV23Merged}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interactive Schema v1 Backport & Y2JB Matcher Sandbox */}
      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
            <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Интерактивный валидатор Backports Catalog Schema v1 и фильтра Y2JB (порт из FIX7):</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setTestTitleId('PPSA08560');
                setTestGameVersion('1.8.0');
                setTestFirmware('13.60');
              }}
              className="px-2 py-1 text-[11px] font-mono rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Тест: PPSA08560 (01.008.000 == 1.8.0)
            </button>
            <button
              type="button"
              onClick={() => {
                setTestTitleId('PPSA01651');
                setTestGameVersion('01.009.253');
                setTestFirmware('13.60');
              }}
              className="px-2 py-1 text-[11px] font-mono rounded border border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
            >
              Тест: Y2JB EU (PPSA01651)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div>
            <label
              htmlFor="bp-test-tid"
              className="block text-[10px] font-mono text-slate-500 uppercase"
            >
              Title ID
            </label>
            <input
              id="bp-test-tid"
              type="text"
              value={testTitleId}
              onChange={(e) => setTestTitleId(e.target.value)}
              className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="bp-test-ver"
              className="block text-[10px] font-mono text-slate-500 uppercase"
            >
              Версия игры (3-part)
            </label>
            <input
              id="bp-test-ver"
              type="text"
              value={testGameVersion}
              onChange={(e) => setTestGameVersion(e.target.value)}
              className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="bp-test-fw"
              className="block text-[10px] font-mono text-slate-500 uppercase"
            >
              Прошивка PS5
            </label>
            <input
              id="bp-test-fw"
              type="text"
              value={testFirmware}
              onChange={(e) => setTestFirmware(e.target.value)}
              className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="bp-test-model"
              className="block text-[10px] font-mono text-slate-500 uppercase"
            >
              Модель консоли
            </label>
            <select
              id="bp-test-model"
              value={testModel}
              onChange={(e) => setTestModel(e.target.value as 'base' | 'pro')}
              className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="base">PS5 Fat / Slim (base)</option>
              <option value="pro">PS5 Pro (pro)</option>
            </select>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-mono ${
            matchResult.matched
              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
              : 'border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-200'
          }`}
        >
          {matchResult.matched ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          ) : (
            <ShieldCheck className="w-4 h-4 shrink-0 text-amber-500" />
          )}
          <span>{matchResult.reason}</span>
        </div>
      </div>
    </div>
  );
};
