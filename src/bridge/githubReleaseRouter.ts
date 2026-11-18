import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express, { Request, Response } from 'express';
import {
  TITAN_CORE_RELEASE_FILES,
  TITAN_CORE_RELEASE_TAG,
} from '../mounters/titanCoreReleaseData';
import {
  buildGithubReleasePayload,
  DEFAULT_GITHUB_RELEASE_TITLE,
  DiskReleaseAssetStatus,
  selectReleaseFilenames,
  validateGithubRepoSlug,
  validateReleaseTag,
} from '../services/githubReleaseBuilder';

const GITHUB_API_TIMEOUT_MS = 25000;

async function inspectDiskReleaseAssets(): Promise<DiskReleaseAssetStatus[]> {
  const buildsDir = path.resolve(process.cwd(), 'public', 'builds');
  return Promise.all(
    TITAN_CORE_RELEASE_FILES.map(async (item) => {
      const filePath = path.join(buildsDir, item.filename);
      try {
        const bytes = await fs.readFile(filePath);
        const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
        return {
          filename: item.filename,
          role: item.role,
          versionGroup: item.versionGroup,
          exists: true,
          sizeBytes: bytes.byteLength,
          sha256,
          builtInActionsOnly: false,
        };
      } catch {
        return {
          filename: item.filename,
          role: item.role,
          versionGroup: item.versionGroup,
          exists: false,
          sizeBytes: 0,
          sha256: null,
          builtInActionsOnly: item.filename.endsWith('.elf'),
        };
      }
    })
  );
}

function resolveMimeType(filename: string): string {
  if (filename.endsWith('.tar.gz')) return 'application/gzip';
  if (filename.endsWith('.md')) return 'text/markdown; charset=utf-8';
  if (filename.endsWith('.sh')) return 'text/x-shellscript; charset=utf-8';
  if (filename.endsWith('.patch') || filename.endsWith('.txt') || filename === 'SHA256SUMS') {
    return 'text/plain; charset=utf-8';
  }
  return 'application/octet-stream';
}

export function createGithubReleaseRouter(): express.Router {
  const router = express.Router();

  router.get('/status', async (_req: Request, res: Response) => {
    const assets = await inspectDiskReleaseAssets();
    res.json({
      ok: true,
      tokenConfigured: Boolean(process.env.GITHUB_TOKEN?.trim()),
      defaultRepo: process.env.GITHUB_REPO?.trim() || '',
      defaultTag: TITAN_CORE_RELEASE_TAG,
      defaultTitle: DEFAULT_GITHUB_RELEASE_TITLE,
      assets,
    });
  });

  router.post('/publish', async (req: Request, res: Response) => {
    const repoValidation = validateGithubRepoSlug(
      typeof req.body?.repoSlug === 'string' ? req.body.repoSlug : ''
    );
    if (!repoValidation.ok || !repoValidation.owner || !repoValidation.repo) {
      res.status(400).json({ ok: false, error: repoValidation.error });
      return;
    }

    const tagValidation = validateReleaseTag(
      typeof req.body?.tag === 'string' ? req.body.tag : TITAN_CORE_RELEASE_TAG
    );
    if (!tagValidation.ok || !tagValidation.normalized) {
      res.status(400).json({ ok: false, error: tagValidation.error });
      return;
    }

    const token = process.env.GITHUB_TOKEN?.trim();
    if (!token) {
      res.status(503).json({
        ok: false,
        code: 'GITHUB_TOKEN_NOT_CONFIGURED',
        error:
          'Серверная переменная GITHUB_TOKEN не задана в окружении AI Studio. Добавьте GITHUB_TOKEN (Fine-grained PAT с правом Contents: Read & Write) в Secrets или опубликуйте релиз с локального ПК через скрипт publish-github-release.sh.',
      });
      return;
    }

    const title =
      typeof req.body?.title === 'string' && req.body.title.trim()
        ? req.body.title.trim()
        : DEFAULT_GITHUB_RELEASE_TITLE;
    const draft = Boolean(req.body?.draft);
    const prerelease = Boolean(req.body?.prerelease);
    const includePreservedV22 = req.body?.includePreservedV22 !== false;

    const buildsDir = path.resolve(process.cwd(), 'public', 'builds');
    let notesBody = '';
    try {
      notesBody = await fs.readFile(path.join(buildsDir, 'RELEASE-v1.0.3-mod-v2.3.md'), 'utf-8');
    } catch {
      notesBody = `# TITAN-CORE Mod v2.3 (${tagValidation.normalized})`;
    }

    const payload = buildGithubReleasePayload({
      tag: tagValidation.normalized,
      title,
      body: notesBody,
      draft,
      prerelease,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GITHUB_API_TIMEOUT_MS);

    try {
      const createRes = await fetch(
        `https://api.github.com/repos/${repoValidation.owner}/${repoValidation.repo}/releases`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Prospero-1360-Studio-Release-Publisher',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      const releaseData = (await createRes.json()) as {
        id?: number;
        html_url?: string;
        upload_url?: string;
        message?: string;
      };

      if (!createRes.ok || !releaseData.upload_url) {
        res.status(createRes.status).json({
          ok: false,
          error: releaseData.message || `GitHub API returned HTTP ${createRes.status}`,
        });
        return;
      }

      const uploadBase = releaseData.upload_url.replace(/\{[^}]+\}$/, '');
      const requestedFiles = selectReleaseFilenames(includePreservedV22);
      const uploadedAssets: string[] = [];
      const skippedMissingAssets: string[] = [];

      for (const filename of requestedFiles) {
        const filePath = path.join(buildsDir, filename);
        let bytes: Buffer;
        try {
          bytes = await fs.readFile(filePath);
        } catch {
          skippedMissingAssets.push(filename);
          continue;
        }

        const uploadRes = await fetch(`${uploadBase}?name=${encodeURIComponent(filename)}`, {
          method: 'POST',
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'Content-Type': resolveMimeType(filename),
            'Content-Length': String(bytes.byteLength),
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Prospero-1360-Studio-Release-Publisher',
          },
          body: new Uint8Array(bytes),
        });

        if (uploadRes.ok) {
          uploadedAssets.push(filename);
        } else {
          skippedMissingAssets.push(`${filename} (HTTP ${uploadRes.status})`);
        }
      }

      res.json({
        ok: true,
        releaseId: releaseData.id,
        releaseUrl: releaseData.html_url,
        tag: tagValidation.normalized,
        repo: repoValidation.normalized,
        draft,
        uploadedAssets,
        skippedMissingAssets,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'GitHub Release request failed';
      res.status(502).json({ ok: false, error: message });
    } finally {
      clearTimeout(timer);
    }
  });

  return router;
}
