import React from 'react';
import { LiveSceneRadarSyncResult } from '../../types/sceneRadar';

interface LiveRadarSyncBarProps {
  readonly isSyncing: boolean;
  readonly syncResult: LiveSceneRadarSyncResult | null;
  readonly onTriggerSync: () => void;
}

export const LiveRadarSyncBar: React.FC<LiveRadarSyncBarProps> = ({
  isSyncing,
  syncResult,
  onTriggerSync,
}) => {
  return (
    <div className="p-4 rounded-xl border border-blue-200/70 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Живой сбор релизов и новых репозиториев с GitHub
          </span>
          {syncResult && (
            <span
              className={`px-2 py-0.5 text-[11px] font-mono rounded ${
                syncResult.ok
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
              }`}
            >
              {syncResult.ok ? 'СИНХРОНИЗИРОВАНО' : 'ОШИБКА'}
            </span>
          )}
        </div>

        {syncResult ? (
          <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
            {syncResult.error
              ? syncResult.error
              : `Обновлено релизов (Atom): ${syncResult.releaseUpdates.length} · Новых репозиториев найдено: ${syncResult.discoveredRepos.length} · Поиск GitHub: ${
                  syncResult.searchStatus === 'ok' ? 'активен' : 'Atom-резерв'
                } (${syncResult.syncedAt.slice(11, 19)} UTC)`}
          </p>
        ) : (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Опрашивает releases.atom / commits.atom ключевых проектов и ищет свежие PS5-репозитории напрямую через /api/bridge/scene-radar-sync.
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={isSyncing}
        onClick={onTriggerSync}
        className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
      >
        {isSyncing ? 'Сбор данных с GitHub...' : 'Собрать свежие с GitHub (Live)'}
      </button>
    </div>
  );
};
