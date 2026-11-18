export type SceneNewsSeverity = 'breaking' | 'release' | 'ecosystem';

export type RepoAuditCategory =
  | 'all'
  | 'exploits-entrypoints'
  | 'hen-kernel'
  | 'mounters-dumps'
  | 'sdk-daemons'
  | 'graphics-stores'
  | 'apps-ports'
  | 'emulators-research';

export interface SceneNewsItem {
  readonly id: string;
  readonly date: string;
  readonly severity: SceneNewsSeverity;
  readonly title: string;
  readonly repo: string;
  readonly versionTag: string;
  readonly summary: string;
  readonly keyChanges: string[];
  readonly impactOn1360: string;
}

export interface RepoAuditEntry {
  readonly id: string;
  readonly repo: string;
  readonly category: Exclude<RepoAuditCategory, 'all'>;
  readonly stars: number;
  readonly latestRelease: string;
  readonly releaseDate: string;
  readonly latestCommitDate: string;
  readonly latestCommitMsg: string;
  readonly status1360: 'verified-1360' | 'updated-today' | 'active-r-and-d';
  readonly isNewDiscovery?: boolean;
  readonly discoveredDate?: string;
  readonly roleSummary: string;
  readonly auditNotes: string;
}

export interface LiveRepoFeedCheckResult {
  readonly ok: boolean;
  readonly repo: string;
  readonly fetchedAt: string;
  readonly releases: Array<{ title: string; updated: string }>;
  readonly commits: Array<{ title: string; updated: string }>;
  readonly error?: string;
}

export interface LiveSceneSyncReleaseUpdate {
  readonly repo: string;
  readonly latestRelease: string;
  readonly releaseDate: string;
  readonly latestCommitDate: string;
  readonly latestCommitMsg: string;
}

export interface LiveSceneSyncDiscoveredRepo {
  readonly repo: string;
  readonly stars: number;
  readonly pushedAt: string;
  readonly createdAt: string;
  readonly description: string;
}

export interface LiveSceneRadarSyncResult {
  readonly ok: boolean;
  readonly syncedAt: string;
  readonly releaseUpdates: LiveSceneSyncReleaseUpdate[];
  readonly discoveredRepos: LiveSceneSyncDiscoveredRepo[];
  readonly searchStatus: 'ok' | 'rate-limited-fallback';
  readonly error?: string;
}
