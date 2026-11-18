import {
  LiveSceneRadarSyncResult,
  RepoAuditCategory,
  RepoAuditEntry,
  SceneNewsSeverity,
} from '../types/sceneRadar';

export interface RepoCategoryMeta {
  readonly id: RepoAuditCategory;
  readonly label: string;
}

export const REPO_CATEGORY_TABS: RepoCategoryMeta[] = [
  { id: 'all', label: 'Все репозитории' },
  { id: 'mounters-dumps', label: 'Монтировщики и дампы' },
  { id: 'exploits-entrypoints', label: 'Эксплойты и точки входа' },
  { id: 'hen-kernel', label: 'HEN и патчи ядра' },
  { id: 'sdk-daemons', label: 'SDK и демоны' },
  { id: 'graphics-stores', label: 'Графика, Proton и сторы' },
  { id: 'apps-ports', label: 'Приложения и порты 13.60' },
  { id: 'emulators-research', label: 'Эмуляторы, Linux и R&D' },
];

export const SCENE_SEVERITY_META: Record<
  SceneNewsSeverity,
  { readonly label: string; readonly badgeClass: string }
> = {
  breaking: {
    label: 'Критическое обновление',
    badgeClass:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
  },
  release: {
    label: 'Новый релиз',
    badgeClass:
      'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30',
  },
  ecosystem: {
    label: 'SDK и инфраструктура',
    badgeClass:
      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
  },
};

export const REPO_STATUS_META: Record<
  RepoAuditEntry['status1360'],
  { readonly label: string; readonly badgeClass: string }
> = {
  'updated-today': {
    label: 'Обновлено 14–18.11.2026',
    badgeClass:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
  },
  'verified-1360': {
    label: 'Проверено на 13.60',
    badgeClass:
      'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25',
  },
  'active-r-and-d': {
    label: 'R&D / Апстрим',
    badgeClass:
      'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30',
  },
};

export function filterRepoAuditCatalog(
  entries: readonly RepoAuditEntry[],
  category: RepoAuditCategory,
  query: string,
  onlyHotUpdates = false,
  onlyNewDiscoveries = false
): RepoAuditEntry[] {
  const q = query.trim().toLowerCase();
  return entries.filter((item) => {
    const matchesCategory = category === 'all' || item.category === category;
    const matchesHot = !onlyHotUpdates || item.status1360 === 'updated-today';
    const matchesNew = !onlyNewDiscoveries || Boolean(item.isNewDiscovery);
    const matchesQuery =
      !q ||
      item.repo.toLowerCase().includes(q) ||
      item.latestRelease.toLowerCase().includes(q) ||
      item.roleSummary.toLowerCase().includes(q) ||
      item.auditNotes.toLowerCase().includes(q) ||
      item.latestCommitMsg.toLowerCase().includes(q);
    return matchesCategory && matchesHot && matchesNew && matchesQuery;
  });
}

export function parseGithubAtomEntries(
  xmlText: string,
  maxItems = 3
): Array<{ title: string; updated: string }> {
  if (!xmlText || typeof xmlText !== 'string') {
    return [];
  }
  const entryMatches = xmlText.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];
  return entryMatches.slice(0, maxItems).map((block) => {
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const updatedMatch = block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
    const rawTitle = (titleMatch?.[1] ?? '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    const rawUpdated = (updatedMatch?.[1] ?? '').trim();
    return {
      title: rawTitle || 'Untitled entry',
      updated: rawUpdated ? rawUpdated.slice(0, 10) : '',
    };
  });
}

export function summarizeRepoAuditStats(entries: readonly RepoAuditEntry[]): {
  totalRepos: number;
  updatedRecentlyCount: number;
  newDiscoveriesCount: number;
  verified1360Count: number;
  totalStars: number;
} {
  return entries.reduce(
    (acc, item) => ({
      totalRepos: acc.totalRepos + 1,
      updatedRecentlyCount:
        acc.updatedRecentlyCount + (item.status1360 === 'updated-today' ? 1 : 0),
      newDiscoveriesCount:
        acc.newDiscoveriesCount + (item.isNewDiscovery ? 1 : 0),
      verified1360Count:
        acc.verified1360Count + (item.status1360 !== 'active-r-and-d' ? 1 : 0),
      totalStars: acc.totalStars + item.stars,
    }),
    {
      totalRepos: 0,
      updatedRecentlyCount: 0,
      newDiscoveriesCount: 0,
      verified1360Count: 0,
      totalStars: 0,
    }
  );
}

export function mergeLiveSyncDiscoveryRepos(
  existingEntries: readonly RepoAuditEntry[],
  syncResult: LiveSceneRadarSyncResult
): RepoAuditEntry[] {
  const updatesByRepo = new Map(
    syncResult.releaseUpdates.map((u) => [u.repo.toLowerCase(), u])
  );
  const existingRepoSet = new Set(existingEntries.map((e) => e.repo.toLowerCase()));

  const refreshedExisting = existingEntries.map((entry) => {
    const liveUpdate = updatesByRepo.get(entry.repo.toLowerCase());
    if (!liveUpdate) return entry;
    return {
      ...entry,
      latestRelease: liveUpdate.latestRelease || entry.latestRelease,
      releaseDate: liveUpdate.releaseDate || entry.releaseDate,
      latestCommitDate: liveUpdate.latestCommitDate || entry.latestCommitDate,
      latestCommitMsg: liveUpdate.latestCommitMsg || entry.latestCommitMsg,
    };
  });

  const liveDiscovered: RepoAuditEntry[] = syncResult.discoveredRepos
    .filter((item) => !existingRepoSet.has(item.repo.toLowerCase()))
    .map((item) => ({
      id: `live-discovery-${item.repo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      repo: item.repo,
      category: 'apps-ports',
      stars: item.stars,
      latestRelease: 'live (GitHub)',
      releaseDate: item.pushedAt || syncResult.syncedAt.slice(0, 10),
      latestCommitDate: item.pushedAt || syncResult.syncedAt.slice(0, 10),
      latestCommitMsg: `Live GitHub discovery (created ${item.createdAt || 'recently'})`,
      status1360: 'updated-today',
      isNewDiscovery: true,
      discoveredDate: syncResult.syncedAt.slice(0, 10),
      roleSummary: item.description,
      auditNotes: 'Найдено в реальном времени через Live GitHub Radar.',
    }));

  return [...liveDiscovered, ...refreshedExisting];
}
