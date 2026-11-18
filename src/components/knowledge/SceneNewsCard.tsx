import React from 'react';
import { SceneNewsItem } from '../../types/sceneRadar';
import { SCENE_SEVERITY_META } from '../../validators/sceneRadarFilter';

interface SceneNewsCardProps {
  readonly news: SceneNewsItem;
}

export const SceneNewsCard: React.FC<SceneNewsCardProps> = ({ news }) => {
  const sevMeta = SCENE_SEVERITY_META[news.severity];
  const isToday = news.date === '2026-11-16';

  return (
    <article className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col justify-between space-y-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 text-[11px] font-mono rounded ${sevMeta.badgeClass}`}>
              {sevMeta.label}
            </span>
            {isToday && (
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                16.11
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
            {news.date} · {news.versionTag}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
          {news.title}
        </h3>

        <div className="text-xs font-mono text-blue-600 dark:text-blue-400">
          {news.repo}
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {news.summary}
        </p>

        <ul className="space-y-1 pt-1">
          {news.keyChanges.map((change, idx) => (
            <li
              key={idx}
              className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5"
            >
              <span className="text-blue-500 font-mono shrink-0">•</span>
              <span>{change}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/70 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
        Влияние на 13.60: {news.impactOn1360}
      </div>
    </article>
  );
};
