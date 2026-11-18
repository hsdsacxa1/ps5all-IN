import {
  LiveSceneRadarSyncResult,
  LiveSceneSyncDiscoveredRepo,
  LiveSceneSyncReleaseUpdate,
} from '../types/sceneRadar';
import { parseGithubAtomEntries } from '../validators/sceneRadarFilter';

const DEFAULT_WATCHLIST_REPOS = [
  'phantomptr/ps5upload',
  'quer3q/kraken-mount',
  'quer3q/ampr-emu-ng',
  'leolobato/playden-ps5',
  'mihawk-99/PS5_Mesa',
  'Press5elect/Crux2',
  'bornaradusin/PC5',
  'nankhor/kite-pack',
  'darkxex/ProsperoStore',
  'darkxex/SwanStationPS5',
  'earthonion/garlic-worker',
  'earthonion/GarlicTransfer',
  'Loopayeh/pkg-viewer',
  'abrocoma/PS5-CachyOS',
  'ufm42/wobkot',
  'geodox/ps5-wh-widgets',
  'xXBneutzerNameXx/PS5-Cleanup',
  'Darkatek7/PS5SD',
  'cedsaill3/Launcher5',
  'strongt1me/PS5-Dump-Image-Converter',
  'quer3q/ps5-dump-forge',
  'aydencharles/onionHEN',
  'drakmor/ShadowMountPlus',
  'itsPLK/ps5-webkit-autoloader',
  'devchmod/TITAN-CORE',
  'ramalhoboss/PlayBridge',
  'KPKev/WinBrew-11',
  'ps5-linux/ps5-linux-patches',
  'cybervisi0n/ps5-app-sdk',
  'itsRealZhi/ZhiThemes',
  'heydemoura/EglantinePS5',
  'itsPLK/ps5-payloads-mirror',
  'Dinos17/FPKGi-Catalog-Hub',
  'realLesiedd/FileDen',
  'Daaboulex/playstation-tools',
  'boykopovar/AnyPS5',
  'boykopovar/AnyDevKit',
  'KytyPS5/KytyPS5',
  'sharpemu/sharpemu',
  'mattias800/prosper',
  'keklick1337/rps5e',
  'mpereiraesaa/opengnm-psbc',
];

async function fetchTextTimeout(url: string, headers: Record<string, string>, timeoutMs = 8000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRepoAtomSummary(repo: string): Promise<LiveSceneSyncReleaseUpdate | null> {
  const headers = { 'User-Agent': 'Mozilla/5.0 ProsperoStudio/1.0' };
  const [relXml, comXml] = await Promise.all([
    fetchTextTimeout(`https://github.com/${repo}/releases.atom`, headers),
    fetchTextTimeout(`https://github.com/${repo}/commits.atom`, headers),
  ]);
  const releases = relXml ? parseGithubAtomEntries(relXml, 1) : [];
  const commits = comXml ? parseGithubAtomEntries(comXml, 1) : [];
  if (releases.length === 0 && commits.length === 0) {
    return null;
  }
  return {
    repo,
    latestRelease: releases[0]?.title ?? 'source',
    releaseDate: releases[0]?.updated ?? commits[0]?.updated ?? '',
    latestCommitDate: commits[0]?.updated ?? '',
    latestCommitMsg: commits[0]?.title ?? '',
  };
}

interface GithubSearchItem {
  full_name?: string;
  stargazers_count?: number;
  pushed_at?: string;
  created_at?: string;
  description?: string | null;
}

async function searchGithubDiscovery(knownRepos: Set<string>): Promise<{
  status: 'ok' | 'rate-limited-fallback';
  repos: LiveSceneSyncDiscoveredRepo[];
}> {
  const headers = {
    'User-Agent': 'ProsperoStudio-SceneRadar/1.0',
    Accept: 'application/vnd.github+json',
  };
  const queries = [
    'ps5 pushed:>2026-11-14 stars:>10',
    'prospero ps5 pushed:>2026-11-10',
  ];

  const found = new Map<string, LiveSceneSyncDiscoveredRepo>();
  let anySuccess = false;

  for (const q of queries) {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=20`;
    const raw = await fetchTextTimeout(url, headers, 8000);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as { items?: GithubSearchItem[] };
      if (!Array.isArray(parsed.items)) continue;
      anySuccess = true;
      for (const item of parsed.items) {
        const slug = item.full_name?.trim();
        if (!slug || knownRepos.has(slug.toLowerCase()) || found.has(slug.toLowerCase())) {
          continue;
        }
        found.set(slug.toLowerCase(), {
          repo: slug,
          stars: typeof item.stargazers_count === 'number' ? item.stargazers_count : 0,
          pushedAt: (item.pushed_at ?? '').slice(0, 10),
          createdAt: (item.created_at ?? '').slice(0, 10),
          description: (item.description ?? '').trim() || 'PS5 scene repository',
        });
      }
    } catch {
      // Ignore malformed JSON chunk and keep fallback behavior
    }
  }

  return {
    status: anySuccess ? 'ok' : 'rate-limited-fallback',
    repos: Array.from(found.values()).sort((a, b) => b.stars - a.stars).slice(0, 18),
  };
}

export async function fetchLiveSceneRadarSync(
  knownRepoSlugs: string[] = []
): Promise<LiveSceneRadarSyncResult> {
  const knownSet = new Set(knownRepoSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean));

  const [atomResults, discovery] = await Promise.all([
    Promise.all(DEFAULT_WATCHLIST_REPOS.map((repo) => fetchRepoAtomSummary(repo))),
    searchGithubDiscovery(knownSet),
  ]);

  const releaseUpdates = atomResults.filter(
    (item): item is LiveSceneSyncReleaseUpdate => item !== null
  );

  return {
    ok: releaseUpdates.length > 0 || discovery.repos.length > 0,
    syncedAt: new Date().toISOString(),
    releaseUpdates,
    discoveredRepos: discovery.repos,
    searchStatus: discovery.status,
  };
}
