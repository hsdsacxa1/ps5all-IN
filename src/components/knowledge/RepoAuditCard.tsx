import React from 'react';
import { LiveRepoFeedCheckResult, RepoAuditEntry } from '../../types/sceneRadar';
import { REPO_STATUS_META } from '../../validators/sceneRadarFilter';

interface RepoAuditCardProps {
  readonly item: RepoAuditEntry;
  readonly liveData?: LiveRepoFeedCheckResult;
  readonly isChecking: boolean;
  readonly onCheckLiveAtom: (repoSlug: string) => void;
}

export const RepoAuditCard: React.FC<RepoAuditCardProps> = ({
  item,
  liveData,
  isChecking,
  onCheckLiveAtom,
}) => {
  const statusMeta = REPO_STATUS_META[item.status1360];

  return (
    <article className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 space-y-2.5 flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://github.com/${item.repo}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {item.repo}
            </a>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              ★ {item.stars}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {item.isNewDiscovery && (
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                НОВЫЙ
              </span>
            )}
            <span className={`px-2 py-0.5 text-[11px] font-mono rounded ${statusMeta.badgeClass}`}>
              {statusMeta.label}
            </span>
          </div>
        </div>

        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
          {item.roleSummary}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80">
          <div>
            <span className="text-slate-400 block">Последний релиз:</span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">
              {item.latestRelease}
            </span>{' '}
            <span className="text-slate-500">({item.releaseDate})</span>
          </div>
          <div>
            <span className="text-slate-400 block">
              Последний коммит ({item.latestCommitDate}):
            </span>
            <span
              className="text-slate-700 dark:text-slate-300 line-clamp-1"
              title={item.latestCommitMsg}
            >
              {item.latestCommitMsg}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {item.auditNotes}
        </p>

        {liveData && (
          <div className="p-2.5 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono space-y-1 border border-slate-700">
            <div className="flex items-center justify-between text-emerald-400">
              <span>GitHub Live Atom ({liveData.repo})</span>
              <span>{liveData.ok ? 'OK' : 'ERR'}</span>
            </div>
            {liveData.error ? (
              <div className="text-rose-400">{liveData.error}</div>
            ) : (
              <>
                {liveData.releases.length > 0 && (
                  <div className="text-slate-300">
                    Релизы:{' '}
                    {liveData.releases.map((r) => `${r.title} [${r.updated}]`).join(' · ')}
                  </div>
                )}
                {liveData.commits.length > 0 && (
                  <div className="text-slate-400">
                    Коммиты:{' '}
                    {liveData.commits.map((c) => `${c.updated}: ${c.title}`).join(' | ')}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-800/60">
        <span className="text-[11px] font-mono text-slate-400">
          Категория: {item.category}
        </span>
        <button
          type="button"
          disabled={isChecking}
          aria-label={`Проверить Live Atom для ${item.repo}`}
          onClick={() => onCheckLiveAtom(item.repo)}
          className="px-2.5 py-1 text-[11px] font-mono font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {isChecking ? 'Проверка GitHub...' : 'Проверить Live Atom'}
        </button>
      </div>
    </article>
  );
};
