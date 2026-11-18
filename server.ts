import express, { type Request, type Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  BUILT_ELF_ARTIFACTS,
  resolveBuiltElfArtifact,
  resolveDownloadableBuildFile,
} from './src/bridge/builtElfCatalog.ts';
import { fetchLiveSceneRadarSync } from './src/server/sceneRadarSync.ts';
import { DUMP_MODS_CATALOG } from './src/data/dumpModsCatalogData.ts';
import { DUMP_SYMPTOMS_DIAGNOSIS } from './src/data/dumpSymptomsData.ts';
import { DUMP_MOD_STRATEGY_LIST } from './src/mods/dumpModRegistry.ts';
import { createGithubReleaseRouter } from './src/bridge/githubReleaseRouter.ts';

const PORT = Number(process.env.PORT) || 3000;
const REQUEST_TIMEOUT_MS = 15000;
const PAYLOAD_TIMEOUT_MS = 30000;

interface NormalizedTarget {
  ok: true;
  origin: string;
}

interface InvalidTarget {
  ok: false;
  error: string;
}

function normalizeBridgeOrigin(rawUrl: unknown): NormalizedTarget | InvalidTarget {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { ok: false, error: 'Bridge URL is required.' };
  }
  const trimmed = rawUrl.trim().replace(/\/+$/, '').replace(/\/mcp$/i, '');
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, error: 'Only http:// or https:// bridge URLs are supported.' };
    }
    return { ok: true, origin: parsed.origin + parsed.pathname.replace(/\/+$/, '') };
  } catch {
    return { ok: false, error: 'Invalid bridge URL format.' };
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readJsonSafe(resp: globalThis.Response): Promise<unknown> {
  const text = await resp.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { rawText: text };
  }
}

function createBridgeRouter(): express.Router {
  const router = express.Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'prospero-1360-bridge-proxy', port: PORT });
  });

  router.get('/dump-mods-catalog', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      baselineDate: '2026-11-16',
      catalogCount: DUMP_MODS_CATALOG.length,
      symptomsCount: DUMP_SYMPTOMS_DIAGNOSIS.length,
      strategies: DUMP_MOD_STRATEGY_LIST.map((s) => ({
        id: s.id,
        label: s.label,
        shortBadge: s.shortBadge,
        requiredRuntimeStack: s.requiredRuntimeStack,
      })),
      catalog: DUMP_MODS_CATALOG,
      symptoms: DUMP_SYMPTOMS_DIAGNOSIS,
    });
  });

  router.post('/repo-feed', async (req: Request, res: Response) => {
    const repo = typeof req.body?.repo === 'string' ? req.body.repo.trim() : '';
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
      res.status(400).json({ ok: false, error: 'Invalid GitHub repo slug (expected owner/name).' });
      return;
    }

    const parseAtom = (xmlText: string) => {
      const matches = xmlText.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];
      return matches.slice(0, 3).map((block) => {
        const t = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
        const u = block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1] ?? '';
        return {
          title: t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim(),
          updated: u.trim().slice(0, 10),
        };
      });
    };

    try {
      const [relResp, comResp] = await Promise.all([
        fetchWithTimeout(`https://github.com/${repo}/releases.atom`, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 ProsperoStudio/1.0' },
        }),
        fetchWithTimeout(`https://github.com/${repo}/commits.atom`, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 ProsperoStudio/1.0' },
        }),
      ]);

      const relXml = relResp.ok ? await relResp.text() : '';
      const comXml = comResp.ok ? await comResp.text() : '';

      res.json({
        ok: true,
        repo,
        fetchedAt: new Date().toISOString(),
        releases: parseAtom(relXml),
        commits: parseAtom(comXml),
      });
    } catch (err) {
      res.status(502).json({
        ok: false,
        repo,
        fetchedAt: new Date().toISOString(),
        releases: [],
        commits: [],
        error: err instanceof Error ? err.message : 'Failed to fetch GitHub Atom feeds',
      });
    }
  });

  router.post('/scene-radar-sync', async (req: Request, res: Response) => {
    const knownRepos = Array.isArray(req.body?.knownRepos)
      ? req.body.knownRepos.filter((r: unknown): r is string => typeof r === 'string')
      : [];
    try {
      const result = await fetchLiveSceneRadarSync(knownRepos);
      res.json(result);
    } catch (err) {
      res.status(502).json({
        ok: false,
        syncedAt: new Date().toISOString(),
        releaseUpdates: [],
        discoveredRepos: [],
        searchStatus: 'rate-limited-fallback',
        error: err instanceof Error ? err.message : 'Live Scene Radar sync failed',
      });
    }
  });

  router.post('/probe', async (req: Request, res: Response) => {
    const target = normalizeBridgeOrigin(req.body?.bridgeUrl);
    if (!target.ok) {
      res.status(400).json({ ok: false, error: target.error });
      return;
    }

    const startedAt = Date.now();
    try {
      const [versionRes, consolesRes] = await Promise.all([
        fetchWithTimeout(`${target.origin}/api/version`, { method: 'GET' }),
        fetchWithTimeout(`${target.origin}/api/consoles`, { method: 'GET' }),
      ]);

      const latencyMs = Date.now() - startedAt;
      if (!versionRes.ok) {
        const body = await readJsonSafe(versionRes);
        res.status(502).json({
          ok: false,
          bridgeUrl: target.origin,
          status: versionRes.status,
          latencyMs,
          error: `Bridge returned HTTP ${versionRes.status} on /api/version`,
          detail: body,
        });
        return;
      }

      const versionData = await readJsonSafe(versionRes);
      const consolesData = consolesRes.ok ? await readJsonSafe(consolesRes) : { consoles: [] };

      res.json({
        ok: true,
        bridgeUrl: target.origin,
        latencyMs,
        version: versionData,
        consoles: consolesData,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown connection error';
      res.status(502).json({
        ok: false,
        bridgeUrl: target.origin,
        latencyMs: Date.now() - startedAt,
        error: message,
      });
    }
  });

  router.post('/overview', async (req: Request, res: Response) => {
    const target = normalizeBridgeOrigin(req.body?.bridgeUrl);
    if (!target.ok) {
      res.status(400).json({ ok: false, error: target.error });
      return;
    }
    const addr = typeof req.body?.consoleAddr === 'string' ? req.body.consoleAddr.trim() : '';
    if (!addr) {
      res.status(400).json({ ok: false, error: 'consoleAddr is required.' });
      return;
    }

    const qs = `addr=${encodeURIComponent(addr)}`;
    const endpoints: Array<[string, string]> = [
      ['status', `/api/ps5/status?${qs}`],
      ['hwInfo', `/api/ps5/hw/info?${qs}`],
      ['hwTemps', `/api/ps5/hw/temps?${qs}`],
      ['hwStorage', `/api/ps5/hw/storage?${qs}`],
      ['smpStatus', `/api/ps5/smp/status?${qs}`],
      ['games', `/api/games/installed?${qs}`],
      ['processes', `/api/ps5/process/list?${qs}`],
    ];

    const settled = await Promise.all(
      endpoints.map(async ([key, relPath]) => {
        try {
          const resp = await fetchWithTimeout(`${target.origin}${relPath}`, { method: 'GET' });
          const data = await readJsonSafe(resp);
          return [key, { ok: resp.ok, status: resp.status, data }] as const;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Fetch error';
          return [key, { ok: false, status: 0, error: msg, data: null }] as const;
        }
      })
    );

    const sections = Object.fromEntries(settled);
    res.json({
      ok: true,
      bridgeUrl: target.origin,
      consoleAddr: addr,
      fetchedAt: new Date().toISOString(),
      sections,
    });
  });

  router.post('/proxy', async (req: Request, res: Response) => {
    const target = normalizeBridgeOrigin(req.body?.bridgeUrl);
    if (!target.ok) {
      res.status(400).json({ ok: false, error: target.error });
      return;
    }

    const method = typeof req.body?.method === 'string' ? req.body.method.toUpperCase() : 'GET';
    const allowedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    if (!allowedMethods.has(method)) {
      res.status(400).json({ ok: false, error: `Unsupported HTTP method: ${method}` });
      return;
    }

    const rawPath = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
    if (!rawPath.startsWith('/')) {
      res.status(400).json({ ok: false, error: 'path must start with /' });
      return;
    }

    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain, */*',
    };

    const init: RequestInit = { method, headers };
    if (method !== 'GET' && req.body?.body !== undefined && req.body?.body !== null) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(req.body.body);
    }

    const startedAt = Date.now();
    try {
      const resp = await fetchWithTimeout(`${target.origin}${rawPath}`, init);
      const data = await readJsonSafe(resp);
      res.status(resp.ok ? 200 : resp.status).json({
        ok: resp.ok,
        status: resp.status,
        latencyMs: Date.now() - startedAt,
        path: rawPath,
        data,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Proxy request failed';
      res.status(502).json({
        ok: false,
        status: 0,
        latencyMs: Date.now() - startedAt,
        path: rawPath,
        error: message,
      });
    }
  });

  router.post('/mcp', async (req: Request, res: Response) => {
    const target = normalizeBridgeOrigin(req.body?.bridgeUrl);
    if (!target.ok) {
      res.status(400).json({ ok: false, error: target.error });
      return;
    }

    const sessionId =
      typeof req.body?.sessionId === 'string' && req.body.sessionId.trim()
        ? req.body.sessionId.trim()
        : undefined;
    const rpcPayload = req.body?.payload;
    if (!rpcPayload || typeof rpcPayload !== 'object') {
      res.status(400).json({ ok: false, error: 'MCP JSON-RPC payload object is required.' });
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (sessionId) {
      headers['mcp-session-id'] = sessionId;
    }

    try {
      const resp = await fetchWithTimeout(`${target.origin}/mcp`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpcPayload),
      });
      const nextSessionId = resp.headers.get('mcp-session-id') ?? sessionId ?? null;
      const data = await readJsonSafe(resp);
      res.status(resp.ok ? 200 : resp.status).json({
        ok: resp.ok,
        status: resp.status,
        sessionId: nextSessionId,
        data,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MCP proxy failed';
      res.status(502).json({ ok: false, error: message });
    }
  });

  router.post('/agent-bus/snapshot', async (req: Request, res: Response) => {
    const target = normalizeBridgeOrigin(req.body?.bridgeUrl);
    if (!target.ok) {
      res.status(400).json({ ok: false, error: target.error });
      return;
    }
    const addr = typeof req.body?.consoleAddr === 'string' ? req.body.consoleAddr.trim() : '';
    if (!addr) {
      res.status(400).json({ ok: false, error: 'consoleAddr is required.' });
      return;
    }

    const listDirSafe = async (dirPath: string, limit = 100) => {
      try {
        const url = `${target.origin}/api/ps5/list-dir?addr=${encodeURIComponent(addr)}&path=${encodeURIComponent(dirPath)}&offset=0&limit=${limit}`;
        const resp = await fetchWithTimeout(url, { method: 'GET' });
        if (!resp.ok) return { exists: false, entries: [] as Array<{ name: string; kind: string; size?: number; mtime?: number }> };
        const parsed = (await readJsonSafe(resp)) as {
          entries?: Array<{ name?: string; kind?: string; size?: number; mtime?: number }>;
        } | null;
        const entries = Array.isArray(parsed?.entries)
          ? parsed.entries
              .filter((item): item is { name: string; kind: string; size?: number; mtime?: number } => Boolean(item?.name))
          : [];
        return { exists: true, entries };
      } catch {
        return { exists: false, entries: [] as Array<{ name: string; kind: string; size?: number; mtime?: number }> };
      }
    };

    const readPreviewSafe = async (filePath: string, maxBytes = 65536) => {
      try {
        const resp = await fetchWithTimeout(`${target.origin}/api/ps5/fs/read-preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ addr, path: filePath, max_bytes: maxBytes }),
        });
        if (!resp.ok) return { exists: false, data: null };
        return { exists: true, data: await readJsonSafe(resp) };
      } catch {
        return { exists: false, data: null };
      }
    };

    const statSafe = async (filePath: string) => {
      try {
        const resp = await fetchWithTimeout(`${target.origin}/api/ps5/fs/stat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ addr, path: filePath }),
        });
        if (!resp.ok) return null;
        return (await readJsonSafe(resp)) as { mtime?: number; size?: number; kind?: string } | null;
      } catch {
        return null;
      }
    };

    const fetchedAt = new Date().toISOString();
    try {
      const rootDir = await listDirSafe('/data/agent_bus', 100);
      if (!rootDir.exists) {
        res.json({
          ok: true,
          dirExists: false,
          epochData: { exists: false, data: null },
          consoleClockMtime: undefined,
          lockDir: { exists: false, entries: [], meta: null, beatMtime: undefined },
          staleLocks: [],
          segmentedFeedFiles: [],
          inbox: [],
          legacyLock: { exists: false, data: null },
          legacyFeed: { exists: false, data: null },
          fetchedAt,
        });
        return;
      }

      const entryByName = new Map(rootDir.entries.map((entry) => [entry.name, entry]));
      const staleLocks = rootDir.entries
        .filter((entry) => entry.kind === 'dir' && entry.name.startsWith('lock.stale'))
        .map((entry) => entry.name);

      const [
        epochData,
        clockStat,
        lockDirList,
        feedRootList,
        inboxList,
        legacyLock,
        legacyFeed,
      ] = await Promise.all([
        entryByName.has('epoch')
          ? readPreviewSafe('/data/agent_bus/epoch', 1024)
          : Promise.resolve({ exists: false, data: null }),
        entryByName.has('.clock')
          ? statSafe('/data/agent_bus/.clock')
          : Promise.resolve(null),
        entryByName.get('lock.d')?.kind === 'dir'
          ? listDirSafe('/data/agent_bus/lock.d', 20)
          : Promise.resolve({ exists: false, entries: [] }),
        entryByName.get('feed')?.kind === 'dir'
          ? listDirSafe('/data/agent_bus/feed', 50)
          : Promise.resolve({ exists: false, entries: [] }),
        entryByName.get('inbox')?.kind === 'dir'
          ? listDirSafe('/data/agent_bus/inbox', 50)
          : Promise.resolve({ exists: false, entries: [] }),
        entryByName.has('lock.json')
          ? readPreviewSafe('/data/agent_bus/lock.json', 32768)
          : Promise.resolve({ exists: false, data: null }),
        entryByName.has('feed.json')
          ? readPreviewSafe('/data/agent_bus/feed.json', 131072)
          : Promise.resolve({ exists: false, data: null }),
      ]);

      let lockMeta: { exists: boolean; data: unknown } | null = null;
      let beatMtime: number | undefined;
      if (lockDirList.exists) {
        const lockEntryNames = new Set(lockDirList.entries.map((e) => e.name));
        const metaFileName = ['meta.json', 'lock.json', 'owner.json'].find((n) => lockEntryNames.has(n));
        const [metaRes, beatStat] = await Promise.all([
          metaFileName
            ? readPreviewSafe(`/data/agent_bus/lock.d/${metaFileName}`, 16384)
            : Promise.resolve(null),
          lockEntryNames.has('beat')
            ? statSafe('/data/agent_bus/lock.d/beat')
            : Promise.resolve(null),
        ]);
        lockMeta = metaRes;
        beatMtime = typeof beatStat?.mtime === 'number' ? beatStat.mtime : undefined;
      }

      const agentDirs = feedRootList.entries.filter((entry) => entry.kind === 'dir');
      const perAgentListings = await Promise.all(
        agentDirs.map(async (dir) => {
          const listing = await listDirSafe(`/data/agent_bus/feed/${dir.name}`, 80);
          return listing.entries
            .filter((item) => item.kind === 'file' && item.name.endsWith('.json'))
            .sort((a, b) => b.name.localeCompare(a.name))
            .slice(0, 30)
            .map((item) => ({
              agent: dir.name,
              path: `/data/agent_bus/feed/${dir.name}/${item.name}`,
            }));
        })
      );

      const feedTargets = perAgentListings.flat().slice(0, 80);
      const segmentedFeedFiles = await Promise.all(
        feedTargets.map(async (item) => {
          const fileRes = await readPreviewSafe(item.path, 65536);
          return {
            agent: item.agent,
            path: item.path,
            exists: fileRes.exists,
            data: fileRes.data,
          };
        })
      );

      const inbox = inboxList.entries
        .filter((entry) => entry.kind === 'file')
        .map((entry) => ({
          name: entry.name,
          path: `/data/agent_bus/inbox/${entry.name}`,
          size: entry.size ?? 0,
          mtime: entry.mtime,
        }))
        .sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || b.name.localeCompare(a.name));

      res.json({
        ok: true,
        dirExists: true,
        epochData,
        consoleClockMtime: typeof clockStat?.mtime === 'number' ? clockStat.mtime : undefined,
        lockDir: {
          exists: lockDirList.exists,
          entries: lockDirList.entries,
          meta: lockMeta,
          beatMtime,
        },
        staleLocks,
        segmentedFeedFiles: segmentedFeedFiles.filter((f) => f.exists),
        inbox,
        legacyLock,
        legacyFeed,
        fetchedAt,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to inspect agent bus';
      res.status(502).json({ ok: false, error: message });
    }
  });

  router.post('/agent-bus/ensure-dir', async (req: Request, res: Response) => {
    const target = normalizeBridgeOrigin(req.body?.bridgeUrl);
    if (!target.ok) {
      res.status(400).json({ ok: false, error: target.error });
      return;
    }
    const addr = typeof req.body?.consoleAddr === 'string' ? req.body.consoleAddr.trim() : '';
    if (!addr) {
      res.status(400).json({ ok: false, error: 'consoleAddr is required.' });
      return;
    }

    const extraPaths = Array.isArray(req.body?.paths)
      ? req.body.paths.filter((p: unknown): p is string => typeof p === 'string' && p.startsWith('/data/agent_bus'))
      : [];
    const requiredDirs = Array.from(
      new Set(['/data/agent_bus', '/data/agent_bus/feed', '/data/agent_bus/inbox', ...extraPaths])
    );

    try {
      const created: string[] = [];
      for (const dirPath of requiredDirs) {
        const listUrl = `${target.origin}/api/ps5/list-dir?addr=${encodeURIComponent(addr)}&path=${encodeURIComponent(dirPath)}&offset=0&limit=5`;
        const listRes = await fetchWithTimeout(listUrl, { method: 'GET' });
        if (listRes.ok) continue;

        const mkdirRes = await fetchWithTimeout(`${target.origin}/api/ps5/fs/mkdir`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ addr, path: dirPath }),
        });
        if (!mkdirRes.ok) {
          const data = await readJsonSafe(mkdirRes);
          res.status(mkdirRes.status).json({
            ok: false,
            error: `mkdir ${dirPath} failed with HTTP ${mkdirRes.status}`,
            data,
          });
          return;
        }
        created.push(dirPath);
      }
      res.json({ ok: true, created: created.length > 0, createdDirs: created });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create agent_bus directory';
      res.status(502).json({ ok: false, error: message });
    }
  });

  router.get('/built-elfs', async (_req: Request, res: Response) => {
    const buildsDir = path.resolve(process.cwd(), 'public', 'builds');
    const artifacts = await Promise.all(
      BUILT_ELF_ARTIFACTS.map(async (spec) => {
        const elfPath = path.join(buildsDir, spec.id);
        try {
          const bytes = await fs.readFile(elfPath);
          const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
          return {
            ...spec,
            exists: true,
            sizeBytes: bytes.byteLength,
            sha256,
          };
        } catch {
          return {
            ...spec,
            exists: false,
            sizeBytes: 0,
            sha256: null,
          };
        }
      })
    );
    res.json({ ok: true, artifacts });
  });

  router.get('/download-build/:filename', async (req: Request, res: Response) => {
    const safeName = resolveDownloadableBuildFile(req.params.filename);
    if (!safeName) {
      res.status(404).json({ ok: false, error: 'Build artifact not found in allow-list.' });
      return;
    }
    const filePath = path.resolve(process.cwd(), 'public', 'builds', safeName);
    try {
      const stat = await fs.stat(filePath);
      const isText = safeName.endsWith('.patch') || safeName.endsWith('.txt');
      res.setHeader(
        'Content-Type',
        isText ? 'text/plain; charset=utf-8' : 'application/octet-stream'
      );
      res.setHeader('Content-Length', String(stat.size));
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(filePath);
    } catch {
      res.status(404).json({ ok: false, error: `File ${safeName} not found on disk.` });
    }
  });

  router.post('/push-built-elf', async (req: Request, res: Response) => {
    const target = normalizeBridgeOrigin(req.body?.bridgeUrl);
    if (!target.ok) {
      res.status(400).json({ ok: false, error: target.error });
      return;
    }

    const consoleAddr =
      typeof req.body?.consoleAddr === 'string' ? req.body.consoleAddr.trim() : '';
    if (!consoleAddr) {
      res.status(400).json({ ok: false, error: 'consoleAddr is required.' });
      return;
    }

    const spec = resolveBuiltElfArtifact(req.body?.artifact);
    const elfPort = Number(req.body?.port) > 0 ? Number(req.body.port) : spec.defaultPort;
    const artifactName = spec.id;

    const elfPath = path.resolve(process.cwd(), 'public', 'builds', artifactName);

    try {
      const elfBytes = await fs.readFile(elfPath);
      const url = `${target.origin}/api/payload/send?host=${encodeURIComponent(consoleAddr)}&port=${encodeURIComponent(String(elfPort))}`;
      const resp = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: new Uint8Array(elfBytes),
        },
        PAYLOAD_TIMEOUT_MS
      );

      const data = await readJsonSafe(resp);
      res.status(resp.ok ? 200 : resp.status).json({
        ok: resp.ok,
        status: resp.status,
        artifact: artifactName,
        sizeBytes: elfBytes.byteLength,
        consoleAddr,
        port: elfPort,
        data,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to push ELF payload';
      res.status(502).json({ ok: false, error: message });
    }
  });

  return router;
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.use('/api/bridge', createBridgeRouter());
  app.use('/api/github', createGithubReleaseRouter());

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Prospero 13.60 Studio] Express + Vite server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
