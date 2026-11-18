import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Search, Sparkles } from 'lucide-react';
import {
  NATIVE_PORT_CATALOG,
  PORT_CATALOG_CATEGORIES,
} from '../../data/nativePortsCatalog';
import { filterNativePortsCatalog } from '../../ports/portStrategyRegistry';
import {
  PortCatalogCategory,
  PortCatalogPreset,
} from '../../types/nativePorts';

interface PortCatalogPanelProps {
  onApplyPreset: (preset: PortCatalogPreset) => void;
}

export const PortCatalogPanel: React.FC<PortCatalogPanelProps> = ({
  onApplyPreset,
}) => {
  const [category, setCategory] = useState<PortCatalogCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = useMemo(
    () => filterNativePortsCatalog(NATIVE_PORT_CATALOG, category, searchQuery),
    [category, searchQuery]
  );

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>Срез экосистемы PS5 13.60</span>
            <span aria-hidden="true">·</span>
            <span>Актуально на 14.11.2026</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{filteredEntries.length} из {NATIVE_PORT_CATALOG.length}</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Актуальные стеки, рекомпиляции и нативные порты PS5
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
          {PORT_CATALOG_CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по названию, репозиторию или технологии (Vulkan, OpenGL, Recomp, Proton, Ghostship)..."
          aria-label="Поиск по каталогу нативных портов PS5"
          className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {filteredEntries.length === 0 ? (
        <div className="py-10 text-center space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            По запросу «{searchQuery}» ничего не найдено в выбранной категории.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategory('all');
              setSearchQuery('');
            }}
            className="px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEntries.map((entry) => (
            <article
              key={entry.id}
              className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {entry.name}
                  </h4>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>{entry.stackLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {entry.status2026}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-sky-600 dark:text-sky-400 break-all">
                  {entry.repo}
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {entry.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {entry.keyTech.join(' · ')}
                </span>
                {entry.preset ? (
                  <button
                    type="button"
                    onClick={() => onApplyPreset(entry.preset!)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="h-3 w-3" />
                    Взять за основу
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 whitespace-nowrap shrink-0">
                    <ArrowUpRight className="h-3 w-3" />
                    Справочно
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
