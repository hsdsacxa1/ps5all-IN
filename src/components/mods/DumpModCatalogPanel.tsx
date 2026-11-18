import React, { useMemo, useState } from 'react';
import { Search, Sparkles, Wrench } from 'lucide-react';
import {
  DUMP_MOD_CATEGORIES,
  DUMP_MODS_CATALOG,
} from '../../data/dumpModsCatalogData';
import { filterDumpModsCatalog } from '../../mods/dumpModRegistry';
import {
  DumpModCategoryId,
  DumpModRecipePreset,
} from '../../types/dumpMods';

interface DumpModCatalogPanelProps {
  onApplyPreset: (preset: DumpModRecipePreset) => void;
}

const PURPOSE_BADGE_STYLES: Record<
  'Запуск дампа' | 'Добавление контента' | 'Запуск + Контент',
  string
> = {
  'Запуск дампа':
    'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70',
  'Добавление контента':
    'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/70',
  'Запуск + Контент':
    'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/70',
};

export const DumpModCatalogPanel: React.FC<DumpModCatalogPanelProps> = ({
  onApplyPreset,
}) => {
  const [category, setCategory] = useState<DumpModCategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(
    () => filterDumpModsCatalog(DUMP_MODS_CATALOG, category, searchQuery),
    [category, searchQuery]
  );

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 space-y-5">
      <div className="flex flex-col gap-3.5 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>Ресеарч сцены PS5 FW 13.60</span>
            <span aria-hidden="true">·</span>
            <span>Актуально на 16.11.2026</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Показано {filteredItems.length} из {DUMP_MODS_CATALOG.length} решений
            </span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            01. База неофициальных патчей запуска дампов, бэкпортов, анлокеров DLC и модов контента
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Полный срез инструментов, которые исправляют краши дампов при старте/сохранении (ampr-emu-ng v0.4.1, 16 CNT Fallbacks, libSceNp стабы, BackPork fakelib) и добавляют новый контент (DLC анлокеры, 60/120 FPS XML патчи, Stacked UnionFS русификаторы и моды UE5).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
          {DUMP_MOD_CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
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
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по инструменту, коду ошибки или файлу (ampr-emu-ng, CE-107112-2, BackPork, fakelib, DLC, 60 FPS, unionfs, PPSA)..."
          aria-label="Поиск по базе патчей и модов дампов PS5"
          className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {filteredItems.length === 0 ? (
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
            className="px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {item.categoryLabel} · {item.supportedFw}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded border whitespace-nowrap shrink-0 ${
                      PURPOSE_BADGE_STYLES[item.purposeBadge]
                    }`}
                  >
                    {item.purposeBadge}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                  {item.name}
                </h3>

                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono">
                  <span className="text-blue-600 dark:text-blue-400">
                    {item.repoOrAuthor}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {item.version2026}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {item.summary}
                </p>

                <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Механизм работы под капотом:
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    {item.technicalMechanism}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Что лечит / добавляет:
                  </div>
                  <ul className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                    {item.solvedErrors.map((err, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <Wrench className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {item.targetFilesOrPaths[0]}
                </span>
                <button
                  type="button"
                  onClick={() => onApplyPreset(item.preset)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
                >
                  <Sparkles className="h-3 w-3" />
                  Применить рецепт ({item.preset.titleId})
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
