import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENE_NEWS_16112026 } from '../data/sceneNews16112026';
import {
  NEW_DISCOVERED_REPOS_17112026,
  SCENE_NEWS_17112026,
} from '../data/sceneNews17112026';
import {
  NEW_DISCOVERED_REPOS_18112026,
  SCENE_NEWS_18112026,
} from '../data/sceneNews18112026';
import {
  FULL_REPO_AUDIT_15112026,
  FULL_REPO_AUDIT_LATEST,
  SCENE_NEWS_15112026,
  SCENE_NEWS_LATEST,
} from '../data/sceneNewsData';
import {
  filterRepoAuditCatalog,
  mergeLiveSyncDiscoveryRepos,
  parseGithubAtomEntries,
  summarizeRepoAuditStats,
} from './sceneRadarFilter';

test('SCENE_NEWS_LATEST contains 18.11.2026 breaking AnyPS5/AnyDevKit, HW/OS RE ecosystem, ps5upload v12.6.7, GarlicTransfer v0.3.1, WH Widgets 26.11.17beta and PS5SD 1.3.1 plus archives', () => {
  assert.equal(SCENE_NEWS_18112026.length, 8);
  assert.equal(SCENE_NEWS_17112026.length, 10);
  assert.ok(SCENE_NEWS_16112026.length >= 7);
  assert.ok(SCENE_NEWS_LATEST.length >= 33);
  assert.ok(SCENE_NEWS_15112026.some((n) => n.id === 'news-kraken-020'));

  const anyps5News = SCENE_NEWS_18112026.find((n) => n.id === 'news-anyps5-anydevkit-ecosystem');
  assert.ok(anyps5News);
  assert.equal(anyps5News.severity, 'breaking');
  assert.ok(anyps5News.repo.includes('boykopovar/AnyPS5'));
  assert.ok(anyps5News.repo.includes('boykopovar/AnyDevKit'));

  const ps5upload1267 = SCENE_NEWS_18112026.find((n) => n.id === 'news-ps5upload-1267');
  assert.ok(ps5upload1267);
  assert.equal(ps5upload1267.severity, 'breaking');
  assert.equal(ps5upload1267.repo, 'phantomptr/ps5upload');
  assert.ok(ps5upload1267.versionTag.includes('v12.6.7'));

  const garlic1811 = SCENE_NEWS_18112026.find((n) => n.id === 'news-garlic-031-worker-165');
  assert.ok(garlic1811);
  assert.ok(garlic1811.versionTag.includes('v0.3.1'));

  const whWidgets1811 = SCENE_NEWS_18112026.find((n) => n.id === 'news-wh-widgets-1360-beta-cleanup');
  assert.ok(whWidgets1811);
  assert.equal(whWidgets1811.severity, 'breaking');

  const ps5upload1264 = SCENE_NEWS_17112026.find((n) => n.id === 'news-ps5upload-1261');
  assert.ok(ps5upload1264);
  assert.ok(ps5upload1264.versionTag.includes('v12.6.4'));

  const crux2News = SCENE_NEWS_17112026.find((n) => n.id === 'news-crux2-1022');
  assert.ok(crux2News);
  assert.equal(crux2News.versionTag, 'v1.0.22');

  const kraken021 = SCENE_NEWS_16112026.find((n) => n.id === 'news-kraken-021');
  assert.ok(kraken021);
  assert.equal(kraken021.versionTag, 'v0.2.1');
});

test('FULL_REPO_AUDIT_LATEST covers 109 audited PS5 repositories including 66 new discoveries', () => {
  const legacyStats = summarizeRepoAuditStats(FULL_REPO_AUDIT_15112026);
  assert.ok(legacyStats.totalRepos >= 40);
  assert.equal(NEW_DISCOVERED_REPOS_17112026.length, 18);
  assert.equal(NEW_DISCOVERED_REPOS_18112026.length, 18);

  const stats = summarizeRepoAuditStats(FULL_REPO_AUDIT_LATEST);
  assert.equal(stats.totalRepos, 109);
  assert.equal(stats.newDiscoveriesCount, 66);
  assert.ok(stats.updatedRecentlyCount >= 52);
  assert.ok(stats.totalStars > 85000);

  const mounters = filterRepoAuditCatalog(FULL_REPO_AUDIT_LATEST, 'mounters-dumps', '');
  assert.ok(mounters.some((r) => r.repo === 'quer3q/kraken-mount' && r.latestRelease === 'v0.2.1'));
  assert.ok(mounters.some((r) => r.repo === 'phantomptr/ps5upload' && r.latestRelease === 'v12.6.7'));
  assert.ok(mounters.some((r) => r.repo === 'earthonion/GarlicTransfer' && r.latestRelease === 'v0.3.1'));
  assert.ok(mounters.some((r) => r.repo === 'earthonion/garlic-worker' && r.latestRelease === 'v1.6.5'));
  assert.ok(mounters.some((r) => r.repo === 'nankhor/kite-pack' && r.latestRelease === 'v0.2.0'));
  assert.ok(mounters.some((r) => r.repo === 'strongt1me/PS5-Dump-Image-Converter' && r.latestRelease === 'v1.9.99'));
  assert.ok(mounters.some((r) => r.repo === 'Loopayeh/pkg-viewer' && r.latestRelease === 'v1.20.1'));

  const research = filterRepoAuditCatalog(FULL_REPO_AUDIT_LATEST, 'emulators-research', '');
  assert.ok(research.some((r) => r.repo === 'boykopovar/AnyPS5'));
  assert.ok(research.some((r) => r.repo === 'KytyPS5/KytyPS5'));
  assert.ok(research.some((r) => r.repo === 'sharpemu/sharpemu'));
  assert.ok(research.some((r) => r.repo === 'mattias800/prosper'));
  assert.ok(research.some((r) => r.repo === 'keklick1337/rps5e'));
  assert.ok(research.some((r) => r.repo === 'Press5elect/Crux2' && r.latestRelease === 'v1.0.22'));
  assert.ok(research.some((r) => r.repo === 'darkxex/SwanStationPS5' && r.latestRelease === '1.6.6'));
  assert.ok(research.some((r) => r.repo === 'abrocoma/PS5-CachyOS'));
  assert.ok(research.some((r) => r.repo === 'ps5-linux/ps5-linux-patches' && r.latestRelease === 'kernel-7.3.3-c8fe83a'));
  assert.ok(research.some((r) => r.repo === 'ZiZc3/XPSemu' && r.latestRelease === 'Alpha 3.6'));

  const sdk = filterRepoAuditCatalog(FULL_REPO_AUDIT_LATEST, 'sdk-daemons', '');
  assert.ok(sdk.some((r) => r.repo === 'boykopovar/AnyDevKit' && r.latestRelease === 'v0.1.7'));
  assert.ok(sdk.some((r) => r.repo === 'claimore22/ps5rs'));
});

test('filterRepoAuditCatalog filters by query, hot updates, and new discoveries accurately', () => {
  const hotOnly = filterRepoAuditCatalog(FULL_REPO_AUDIT_LATEST, 'all', '', true, false);
  assert.ok(hotOnly.length >= 52);
  assert.ok(hotOnly.every((item) => item.status1360 === 'updated-today'));

  const newOnly = filterRepoAuditCatalog(FULL_REPO_AUDIT_LATEST, 'all', '', false, true);
  assert.equal(newOnly.length, 66);
  assert.ok(newOnly.every((item) => Boolean(item.isNewDiscovery)));

  const sunshine = filterRepoAuditCatalog(FULL_REPO_AUDIT_LATEST, 'all', 'tailscale');
  assert.ok(sunshine.some((r) => r.repo === 'Darkatek7/ProsperoSunshine'));
  assert.ok(sunshine.some((r) => r.repo === 'ramalhoboss/PlayBridge'));

  const controllers = filterRepoAuditCatalog(FULL_REPO_AUDIT_LATEST, 'hen-kernel', 'dualsense');
  assert.ok(controllers.some((r) => r.repo === 'sub0x00001/octet'));
  assert.ok(controllers.some((r) => r.repo === 'blitzaceking-ux/AnyACE-PS5'));
});

test('mergeLiveSyncDiscoveryRepos refreshes existing release versions and prepends unique discoveries', () => {
  const merged = mergeLiveSyncDiscoveryRepos(FULL_REPO_AUDIT_LATEST, {
    ok: true,
    syncedAt: '2026-11-16T18:30:00.000Z',
    searchStatus: 'ok',
    releaseUpdates: [
      {
        repo: 'quer3q/kraken-mount',
        latestRelease: 'v0.2.2',
        releaseDate: '2026-11-16',
        latestCommitDate: '2026-11-16',
        latestCommitMsg: 'Hotfix release',
      },
    ],
    discoveredRepos: [
      {
        repo: 'phantomptr/ps5upload',
        stars: 1266,
        pushedAt: '2026-11-16',
        createdAt: '2024-01-01',
        description: 'Duplicate should be skipped',
      },
      {
        repo: 'example/new-ps5-tool',
        stars: 42,
        pushedAt: '2026-11-16',
        createdAt: '2026-11-15',
        description: 'Brand new PS5 utility',
      },
    ],
  });

  assert.equal(merged.length, FULL_REPO_AUDIT_LATEST.length + 1);
  assert.equal(merged[0]?.repo, 'example/new-ps5-tool');
  assert.equal(merged[0]?.isNewDiscovery, true);
  const kraken = merged.find((item) => item.repo === 'quer3q/kraken-mount');
  assert.equal(kraken?.latestRelease, 'v0.2.2');
});

test('parseGithubAtomEntries extracts release/commit titles and dates from GitHub Atom XML', () => {
  const sampleAtom = `<?xml version="1.0" encoding="UTF-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <entry>
      <title>v0.2.1: Trophies, saves and file access</title>
      <updated>2026-11-16T12:15:00Z</updated>
    </entry>
    <entry>
      <title>v0.2.0: Now that&#39;s a proper release version</title>
      <updated>2026-11-15T18:32:37Z</updated>
    </entry>
  </feed>`;

  const parsed = parseGithubAtomEntries(sampleAtom, 2);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0]?.title, 'v0.2.1: Trophies, saves and file access');
  assert.equal(parsed[0]?.updated, '2026-11-16');
  assert.equal(parsed[1]?.title, "v0.2.0: Now that's a proper release version");
});
