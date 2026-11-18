import React, { useState } from 'react';
import { EXPLOIT_CHAIN_1360, RUNTIME_STACK_1360 } from '../../data/exploitStackData';
import { REFERENCE_REPOSITORIES_1360 } from '../../data/repositoriesData';
import { ArchitecturePatternId } from '../../types/ps5';
import { A53MmuResearchPanel } from './A53MmuResearchPanel';
import { KrakenMountPanel } from './KrakenMountPanel';
import { SceneRadarPanel } from './SceneRadarPanel';
import { ShadowMountSimulator } from './ShadowMountSimulator';

export const KnowledgeBaseView: React.FC = () => {
  const [repoFilter, setRepoFilter] = useState<'all' | ArchitecturePatternId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredRepos = REFERENCE_REPOSITORIES_1360.filter((item) => {
    const matchesArch = repoFilter === 'all' || item.architecture === repoFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      item.repo.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.stackHighlights.some((s) => s.toLowerCase().includes(q));
    return matchesArch && matchesQuery;
  });

  return (
    <div className="space-y-8">
      {/* Live Scene News & 109-Repository Audit Radar (18.11.2026) */}
      <SceneRadarPanel />

      {/* A53 / MP4 MMU Recon & G0-G4 Kernel Telemetry Panel */}
      <A53MmuResearchPanel />

      {/* Section 1 & 2: Exploit Chain & Runtime Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              01. Цепочка эксплойтов PS5 FW 13.60 (Tethered)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Актуально на 16.11.2026 · Версии 14.00–14.22 закрыли уязвимость браузера
            </p>
          </div>

          <div className="space-y-3">
            {EXPLOIT_CHAIN_1360.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <span>
                    {item.layer} · {item.supportedFw}
                  </span>
                  <span>{item.recommended ? 'Рекомендуется' : 'Опционально'}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {item.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {item.notes}
                </p>
                <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 pt-1">
                  Триггер / DNS: {item.dnsOrTrigger}
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Репозитории: {item.repositories.join(' · ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              02. Базовый Runtime-стек на консоли (13.60)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Обязательные сервисы и сетевые порты для отладки и запуска приложений
            </p>
          </div>

          <div className="space-y-3">
            {RUNTIME_STACK_1360.map((daemon) => (
              <div
                key={daemon.id}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {daemon.name}
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                      {daemon.version}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                    {daemon.portOrPath}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  {daemon.role}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {daemon.criticalNotes}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Kraken Mount v0.0.1-beta & Polymorphic Mounter Comparison Workbench */}
      <KrakenMountPanel />

      {/* ShadowMountPlus Interactive Simulator */}
      <ShadowMountSimulator />

      {/* Section 7: Reference Open-Source Repositories */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              03. Эталонные Open-Source репозитории (Раздел 7)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Проверенные на прошивке 13.60 проекты, шаблоны и SDK для изучения кода агентом
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              aria-label="Поиск по репозиториям и стеку"
              placeholder="Поиск (Vulkan, 9021, SQLite...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              {(
                [
                  { id: 'all', label: 'Все' },
                  { id: 'payload', label: 'Payload' },
                  { id: 'payload-webui', label: 'WebUI' },
                  { id: 'native-app', label: 'Native App' },
                  { id: 'hybrid-app', label: 'Hybrid' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRepoFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    repoFilter === tab.id
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRepos.map((repo) => (
            <div
              key={repo.id}
              className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span>{repo.category}</span>
                <span>FW {repo.verifiedFw}</span>
              </div>
              <div className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                {repo.repo}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {repo.description}
              </p>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                Стек: {repo.stackHighlights.join(' · ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
