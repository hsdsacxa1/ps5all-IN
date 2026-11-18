import React, { useState } from 'react';
import { SCENE_NEWS_16112026 } from '../../data/sceneNews16112026';
import { SCENE_NEWS_17112026 } from '../../data/sceneNews17112026';
import { SCENE_NEWS_18112026 } from '../../data/sceneNews18112026';
import {
  FULL_REPO_AUDIT_LATEST,
  SCENE_NEWS_LATEST,
} from '../../data/sceneNewsData';
import {
  LiveRepoFeedCheckResult,
  LiveSceneRadarSyncResult,
  RepoAuditCategory,
  RepoAuditEntry,
  SceneNewsItem,
} from '../../types/sceneRadar';
import {
  filterRepoAuditCatalog,
  mergeLiveSyncDiscoveryRepos,
  REPO_CATEGORY_TABS,
  summarizeRepoAuditStats,
} from '../../validators/sceneRadarFilter';
import { LiveRadarSyncBar } from './LiveRadarSyncBar';
import { RepoAuditCard } from './RepoAuditCard';
import { SceneNewsCard } from './SceneNewsCard';

type NewsScopeId = '1811' | '1711' | '1611' | 'all';

interface NewsScopeConfig {
  readonly id: NewsScopeId;
  readonly label: string;
  readonly items: readonly SceneNewsItem[];
}

const NEWS_SCOPE_CONFIGS: readonly NewsScopeConfig[] = [
  { id: '1811', label: 'Свежие 18.11', items: SCENE_NEWS_18112026 },
  { id: '1711', label: 'За 17.11', items: SCENE_NEWS_17112026 },
  { id: '1611', label: 'За 16.11', items: SCENE_NEWS_16112026 },
  { id: 'all', label: 'Архив 15–18.11', items: SCENE_NEWS_LATEST },
];

const NEWS_SCOPE_MAP: Record<NewsScopeId, readonly SceneNewsItem[]> = {
  '1811': SCENE_NEWS_18112026,
  '1711': SCENE_NEWS_17112026,
  '1611': SCENE_NEWS_16112026,
  all: SCENE_NEWS_LATEST,
};

export const SceneRadarPanel: React.FC = () => {
  const [newsScope, setNewsScope] = useState<NewsScopeId>('1811');
  const [selectedCategory, setSelectedCategory] = useState<RepoAuditCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyHotUpdates, setOnlyHotUpdates] = useState<boolean>(false);
  const [onlyNewDiscoveries, setOnlyNewDiscoveries] = useState<boolean>(false);
  const [repoCatalog, setRepoCatalog] = useState<RepoAuditEntry[]>(FULL_REPO_AUDIT_LATEST);
  const [liveCheckMap, setLiveCheckMap] = useState<Record<string, LiveRepoFeedCheckResult>>({});
  const [loadingRepo, setLoadingRepo] = useState<string | null>(null);
  const [isSyncingRadar, setIsSyncingRadar] = useState<boolean>(false);
  const [radarSyncResult, setRadarSyncResult] = useState<LiveSceneRadarSyncResult | null>(null);

  const visibleNews = NEWS_SCOPE_MAP[newsScope];
  const stats = summarizeRepoAuditStats(repoCatalog);
  const filteredRepos = filterRepoAuditCatalog(
    repoCatalog,
    selectedCategory,
    searchQuery,
    onlyHotUpdates,
    onlyNewDiscoveries
  );

  const handleLiveRepoCheck = async (repoSlug: string) => {
    setLoadingRepo(repoSlug);
    try {
      const resp = await fetch('/api/bridge/repo-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: repoSlug }),
      });
      const data = (await resp.json()) as LiveRepoFeedCheckResult;
      setLiveCheckMap((prev) => ({ ...prev, [repoSlug]: data }));
    } catch (err) {
      setLiveCheckMap((prev) => ({
        ...prev,
        [repoSlug]: {
          ok: false,
          repo: repoSlug,
          fetchedAt: new Date().toISOString(),
          releases: [],
          commits: [],
          error: err instanceof Error ? err.message : 'Ошибка запроса Atom-ленты',
        },
      }));
    } finally {
      setLoadingRepo(null);
    }
  };

  const handleTriggerLiveRadarSync = async () => {
    setIsSyncingRadar(true);
    try {
      const resp = await fetch('/api/bridge/scene-radar-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knownRepos: repoCatalog.map((item) => item.repo),
        }),
      });
      const data = (await resp.json()) as LiveSceneRadarSyncResult;
      setRadarSyncResult(data);
      if (data.ok) {
        setRepoCatalog((prev) => mergeLiveSyncDiscoveryRepos(prev, data));
      }
    } catch (err) {
      setRadarSyncResult({
        ok: false,
        syncedAt: new Date().toISOString(),
        releaseUpdates: [],
        discoveredRepos: [],
        searchStatus: 'rate-limited-fallback',
        error: err instanceof Error ? err.message : 'Ошибка синхронизации с GitHub',
      });
    } finally {
      setIsSyncingRadar(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live GitHub Discovery Sync Bar */}
      <LiveRadarSyncBar
        isSyncing={isSyncingRadar}
        syncResult={radarSyncResult}
        onTriggerSync={handleTriggerLiveRadarSync}
      />

      {/* Part 1: Breaking PS5 13.60 Scene News (18.11.2026) */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Сводка новостей сцены PS5 FW 13.60 (Актуально на 18.11.2026)
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                LIVE RADAR · 18.11.2026 (УТРЕННИЙ СБОР UTC)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Свежие релизы 18.11.2026: boykopovar/AnyPS5 + AnyDevKit v0.1.7 (релинкер PS5→PC + кросс-SDK .ffpfsc), ps5upload v12.6.5–12.6.7 (отправка .pkg под Kraken Mount, 50 Мбит/с Play и бэкапы на M.2/USB), GarlicTransfer v0.3.1 + garlic-worker v1.6.5, Welcome Hub Widgets 26.11.17 beta (FW 13.60), PS5 Cleanup wegdiagnose-13x, PS5SD 1.3.1 (128x128 тайлы) и Linux Kernel 7.3.3-c8fe83a
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              {NEWS_SCOPE_CONFIGS.map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => setNewsScope(scope.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    newsScope === scope.id
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {scope.label} ({scope.items.length})
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleNews.map((news) => (
            <SceneNewsCard key={news.id} news={news} />
          ))}
        </div>
      </section>

      {/* Part 2: Complete Repository Audit & New Discoveries Table */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Каталог и аудит {stats.totalRepos} репозиториев экосистемы PS5 13.60
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Реальные релизы, {stats.newDiscoveriesCount} новых репозиториев (ноябрь 2026) и прямая проверка GitHub Atom-ленты
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25">
              <span className="text-indigo-700 dark:text-indigo-300">Новые репозитории: </span>
              <span className="font-semibold text-indigo-800 dark:text-indigo-200 tabular-nums">
                {stats.newDiscoveriesCount}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
              <span className="text-emerald-700 dark:text-emerald-300">Обновлено 14–18.11: </span>
              <span className="font-semibold text-emerald-800 dark:text-emerald-200 tabular-nums">
                {stats.updatedRecentlyCount}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyNewDiscoveries}
                onChange={(e) => setOnlyNewDiscoveries(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700"
              />
              <span>Только новые (Ноябрь 2026)</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyHotUpdates}
                onChange={(e) => setOnlyHotUpdates(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700"
              />
              <span>Только обновлённые 14–18.11.2026</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              Показано: {filteredRepos.length} из {stats.totalRepos}
            </span>
            <input
              type="search"
              aria-label="Фильтр по всем репозиториям"
              placeholder="Поиск (ps5upload, crux2, pc5, octet...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-w-64"
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
          {REPO_CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedCategory === tab.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Repository Audit Cards Grid */}
        {filteredRepos.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            Нет репозиториев, соответствующих выбранным фильтрам и поисковому запросу.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRepos.map((item) => (
              <RepoAuditCard
                key={item.id}
                item={item}
                liveData={liveCheckMap[item.repo]}
                isChecking={loadingRepo === item.repo}
                onCheckLiveAtom={handleLiveRepoCheck}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
