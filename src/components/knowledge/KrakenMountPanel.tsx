import React, { useState } from 'react';
import { ExternalLink, FileCode2, Play, Plus, RefreshCw } from 'lucide-react';
import {
  getMounterStrategy,
  listMounterSpecs,
  MOUNTER_COMPARISON_MATRIX,
} from '../../mounters/mounterRegistry';
import {
  MountableTitleEntry,
  MounterActionId,
  MounterContainerFormat,
  MounterEngineId,
} from '../../types/mounter';
import { KrakenShadowMixBuilder } from './KrakenShadowMixBuilder';
import { KrakenTroubleshooter } from './KrakenTroubleshooter';
import { TitanCoreModPanel } from './TitanCoreModPanel';

export const KrakenMountPanel: React.FC = () => {
  const [activeEngineId, setActiveEngineId] = useState<MounterEngineId>(
    'kraken-shadow-mix'
  );
  const [ps5Ip] = useState<string>('192.168.1.50');
  const [entriesByEngine, setEntriesByEngine] = useState<
    Record<MounterEngineId, MountableTitleEntry[]>
  >(() => ({
    'kraken-shadow-mix': getMounterStrategy('kraken-shadow-mix').spec
      .initialEntries,
    'kraken-mount-0.0.1-beta': getMounterStrategy('kraken-mount-0.0.1-beta').spec
      .initialEntries,
    'shadowmount-1.7': getMounterStrategy('shadowmount-1.7').spec.initialEntries,
  }));

  const currentStrategy = getMounterStrategy(activeEngineId);
  const currentSpec = currentStrategy.spec;
  const currentEntries = entriesByEngine[activeEngineId];

  const [selectedTitleId, setSelectedTitleId] = useState<string>(
    currentEntries[0]?.titleId || 'PPSA99808'
  );
  const [activeActionId, setActiveActionId] = useState<MounterActionId>('config');
  const [newTitleId, setNewTitleId] = useState<string>('PPSA88420');
  const [newTitleName, setNewTitleName] = useState<string>(
    'Stellar Blade Debug Pack'
  );
  const [newFormat, setNewFormat] = useState<MounterContainerFormat>('zstd');

  const [simulationResult, setSimulationResult] = useState(() =>
    currentStrategy.executeAction('config', currentEntries, 'PPSA99808', '192.168.1.50')
      .payload
  );

  const handleSwitchEngine = (engineId: MounterEngineId) => {
    setActiveEngineId(engineId);
    const nextStrategy = getMounterStrategy(engineId);
    const list = entriesByEngine[engineId];
    const firstId = list[0]?.titleId || 'PPSA99808';
    setSelectedTitleId(firstId);
    setNewFormat(nextStrategy.spec.supportedFormats[0]);
    const res = nextStrategy.executeAction('discover', list, firstId, ps5Ip);
    setActiveActionId('discover');
    setSimulationResult(res.payload);
  };

  const handleRunAction = (actionId: MounterActionId) => {
    setActiveActionId(actionId);
    const result = currentStrategy.executeAction(
      actionId,
      currentEntries,
      selectedTitleId,
      ps5Ip
    );
    setEntriesByEngine((prev) => ({
      ...prev,
      [activeEngineId]: result.updatedEntries,
    }));
    setSimulationResult(result.payload);
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newTitleId.trim().toUpperCase();
    const cleanName = newTitleName.trim();
    if (!/^[A-Z]{4}[0-9]{5}$/.test(cleanId) || !cleanName) {
      return;
    }
    const created = currentStrategy.createEntry(cleanId, cleanName, newFormat);
    const nextList = [
      ...currentEntries.filter((item) => item.titleId !== cleanId),
      created,
    ];
    setEntriesByEngine((prev) => ({
      ...prev,
      [activeEngineId]: nextList,
    }));
    setSelectedTitleId(cleanId);
    const res = currentStrategy.executeAction('discover', nextList, cleanId, ps5Ip);
    setSimulationResult(res.payload);
  };

  return (
    <div className="space-y-6">
      {/* Upgraded TITAN-CORE v1.0-refresh + Mod v2 Fork Workbench */}
      <TitanCoreModPanel />

      {/* Unified KrakenShadow-Mix Patch & Build Studio */}
      <KrakenShadowMixBuilder />

      {/* Code-Level Diagnostics for Kraken Mount v0.0.1-beta Detection & Launch Failures */}
      <KrakenTroubleshooter />

      {/* Main Interactive Mounter Workbench */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Интерактивный стенд монтировщиков: Kraken Mount v0.0.1-beta &amp; ShadowMountPlus v1.7
              </h3>
              <a
                href={currentSpec.releaseUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>{currentSpec.repository}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Порт: {currentSpec.defaultPort} · Мост: {currentSpec.backendBridge} · Конфиг: {currentSpec.configPath}
            </p>
          </div>

          {/* Polymorphic Engine Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
            {listMounterSpecs().map((spec) => {
              const active = spec.id === activeEngineId;
              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => handleSwitchEngine(spec.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {spec.name} ({spec.defaultPort})
                </button>
              );
            })}
          </div>
        </div>

        {/* Engine Metadata Banner & Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <div className="space-y-0.5 text-xs">
            <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">
              Деплой пэйлоада: <code className="text-blue-600 dark:text-blue-400">{currentSpec.deployCommand}</code>
            </div>
            <div className="text-slate-500 dark:text-slate-400 font-mono">
              Поддерживаемые контейнеры: {currentSpec.supportedFormats.join(', ').toUpperCase()} · Лог: {currentSpec.logPath}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentSpec.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => handleRunAction(action.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  activeActionId === action.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {action.id === 'rebuild' ? (
                  <RefreshCw className="w-3 h-3" />
                ) : action.id === 'config' ? (
                  <FileCode2 className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Two-column Table + Simulated Output */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 space-y-4">
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Title ID</th>
                    <th className="py-2.5 px-3 font-medium">Название и путь</th>
                    <th className="py-2.5 px-3 font-medium">Формат</th>
                    <th className="py-2.5 px-3 font-medium text-right">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {currentEntries.map((entry) => (
                    <tr
                      key={entry.titleId}
                      onClick={() => setSelectedTitleId(entry.titleId)}
                      className={`cursor-pointer transition-colors ${
                        selectedTitleId === entry.titleId
                          ? 'bg-blue-50/60 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-950/50'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {entry.titleId}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {entry.titleName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {entry.path}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono uppercase text-blue-600 dark:text-blue-400">
                        {entry.containerType}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right">
                        {entry.mounted ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Mounted
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            Unmounted
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Title Form with Polymorphic Container Format Select */}
            <form
              onSubmit={handleAddEntry}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end pt-1"
            >
              <div className="sm:col-span-3">
                <label
                  htmlFor="mounter-title-id"
                  className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Title ID
                </label>
                <input
                  id="mounter-title-id"
                  type="text"
                  maxLength={9}
                  value={newTitleId}
                  onChange={(e) => setNewTitleId(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono tabular-nums"
                />
              </div>
              <div className="sm:col-span-4">
                <label
                  htmlFor="mounter-title-name"
                  className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Название дампа / пакета
                </label>
                <input
                  id="mounter-title-name"
                  type="text"
                  value={newTitleName}
                  onChange={(e) => setNewTitleName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="mounter-format-select"
                  className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Контейнер
                </label>
                <select
                  id="mounter-format-select"
                  value={newFormat}
                  onChange={(e) =>
                    setNewFormat(e.target.value as MounterContainerFormat)
                  }
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono uppercase"
                >
                  {currentSpec.supportedFormats.map((fmt) => (
                    <option key={fmt} value={fmt}>
                      {fmt.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: JSON Response & config.toml Preview */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <span>
                Ответ {currentSpec.name} ({simulationResult.endpoint})
              </span>
              <span>Target: {selectedTitleId}</span>
            </div>
            <pre className="p-3.5 rounded-lg bg-slate-950 text-slate-100 border border-slate-800 text-xs font-mono overflow-x-auto max-h-[240px] leading-relaxed">
              <code>{JSON.stringify(simulationResult, null, 2)}</code>
            </pre>

            {simulationResult.configPreview && (
              <div className="space-y-1.5">
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Конфигурационный файл ({currentSpec.configPath}):
                </div>
                <pre className="p-3 rounded-lg bg-slate-950 text-emerald-300 border border-slate-800 text-[11px] font-mono overflow-x-auto leading-relaxed">
                  <code>{simulationResult.configPreview}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Architectural Comparison Table: ShadowMountPlus v1.7 vs Kraken Mount v0.0.1-beta */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Архитектурное сравнение монтировщиков на PS5 FW 13.60
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Сопоставление проверенного ShadowMountPlus v1.7 и нового минималистичного mounter-а quer3q/kraken-mount v0.0.1-beta на базе ampr-emu-ng v0.4.0
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4 font-semibold w-1/5">Параметр стека</th>
                <th className="py-2.5 px-4 font-semibold w-1/4">
                  drakmor/ShadowMountPlus v1.7
                </th>
                <th className="py-2.5 px-4 font-semibold w-1/4 text-amber-600 dark:text-amber-400">
                  quer3q/kraken-mount v0.0.1-beta (Сток)
                </th>
                <th className="py-2.5 px-4 font-semibold w-3/10 text-emerald-600 dark:text-emerald-400">
                  KrakenShadow-Mix v1.0 (Объединённый микс)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {MOUNTER_COMPARISON_MATRIX.map((row) => (
                <tr key={row.feature} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50">
                  <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                    {row.feature}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {row.shadowMount}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                    {row.krakenMount}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-medium text-emerald-700 dark:text-emerald-300">
                    {row.unifiedMix}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
