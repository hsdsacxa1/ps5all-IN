import {
  TITAN_CORE_RELEASE_FILES,
  TITAN_CORE_RELEASE_TAG,
  TitanCoreReleaseFile,
} from '../mounters/titanCoreReleaseData';

export interface GithubRepoValidation {
  ok: boolean;
  owner?: string;
  repo?: string;
  normalized?: string;
  error?: string;
}

export interface GithubTagValidation {
  ok: boolean;
  normalized?: string;
  error?: string;
}

export interface GithubReleaseRequestOptions {
  repoSlug: string;
  tag: string;
  title: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  includePreservedV22: boolean;
}

export interface GithubReleaseApiPayload {
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  generate_release_notes: boolean;
}

export interface DiskReleaseAssetStatus {
  filename: string;
  role: string;
  versionGroup: TitanCoreReleaseFile['versionGroup'];
  exists: boolean;
  sizeBytes: number;
  sha256: string | null;
  builtInActionsOnly: boolean;
}

export interface GithubServerStatusResponse {
  ok: boolean;
  tokenConfigured: boolean;
  defaultRepo: string;
  defaultTag: string;
  defaultTitle: string;
  assets: DiskReleaseAssetStatus[];
}

export interface GithubPublishResult {
  ok: boolean;
  releaseUrl?: string;
  releaseId?: number;
  tag?: string;
  repo?: string;
  draft?: boolean;
  uploadedAssets?: string[];
  skippedMissingAssets?: string[];
  error?: string;
  code?: string;
}

const REPO_SEGMENT_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,98}[A-Za-z0-9])?$/;
const TAG_RE = /^v[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9._-]+)?$/;

export const DEFAULT_GITHUB_RELEASE_TITLE =
  'TITAN-CORE v1.0.3 Mod v2.3 (Google Drive Telemetry + grimmtroll/TITAN FIX7 Port + Preserved v2.2)';

export function validateGithubRepoSlug(raw: string): GithubRepoValidation {
  const trimmed = raw
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '');
  if (!trimmed) {
    return { ok: false, error: 'Укажите репозиторий в формате owner/repo (например, IchooziI/TITAN-CORE-Mod).' };
  }
  const parts = trimmed.split('/');
  if (parts.length !== 2) {
    return { ok: false, error: 'Ожидается ровно один слэш: owner/repo.' };
  }
  const [owner, repo] = parts;
  if (!REPO_SEGMENT_RE.test(owner) || !REPO_SEGMENT_RE.test(repo)) {
    return { ok: false, error: 'Недопустимые символы в имени владельца или репозитория GitHub.' };
  }
  return {
    ok: true,
    owner,
    repo,
    normalized: `${owner}/${repo}`,
  };
}

export function validateReleaseTag(raw: string): GithubTagValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Укажите тег релиза (например, v1.0.3-mod-20261118).' };
  }
  if (!TAG_RE.test(trimmed)) {
    return {
      ok: false,
      error: 'Тег должен начинаться с "v" и соответствовать semver (например, v1.0.3-mod-20261118), чтобы сработал GitHub Actions workflow.',
    };
  }
  return { ok: true, normalized: trimmed };
}

export function selectReleaseFilenames(includePreservedV22: boolean): string[] {
  return TITAN_CORE_RELEASE_FILES.filter((item) => {
    if (includePreservedV22) return true;
    return item.versionGroup === 'v2.3' || item.versionGroup === 'shared';
  }).map((item) => item.filename);
}

export function buildGithubReleasePayload(
  options: Pick<GithubReleaseRequestOptions, 'tag' | 'title' | 'body' | 'draft' | 'prerelease'>
): GithubReleaseApiPayload {
  return {
    tag_name: options.tag.trim() || TITAN_CORE_RELEASE_TAG,
    name: options.title.trim() || DEFAULT_GITHUB_RELEASE_TITLE,
    body: options.body,
    draft: Boolean(options.draft),
    prerelease: Boolean(options.prerelease),
    generate_release_notes: false,
  };
}

export function generateGithubPublishCommands(options: {
  repoSlug: string;
  tag: string;
  draft: boolean;
  prerelease: boolean;
  includePreservedV22: boolean;
}): string {
  const repoCheck = validateGithubRepoSlug(options.repoSlug);
  const repo = repoCheck.ok && repoCheck.normalized ? repoCheck.normalized : 'YOUR_USER/TITAN-CORE-Mod';
  const tagCheck = validateReleaseTag(options.tag);
  const tag = tagCheck.ok && tagCheck.normalized ? tagCheck.normalized : TITAN_CORE_RELEASE_TAG;

  const extraFlags: string[] = [];
  if (options.draft) extraFlags.push('--draft');
  if (options.prerelease) extraFlags.push('--prerelease');

  const files = selectReleaseFilenames(options.includePreservedV22).filter(
    (name) => !name.endsWith('.elf')
  );
  const assetLines = files.map((file) => `  "public/builds/${file}" \\`).join('\n');

  return [
    `# 1) Отправка исходников Mod v2.3 и тега ${tag} -> GitHub Actions соберёт .elf в Docker`,
    `chmod +x public/builds/publish-github-release.sh`,
    `./public/builds/publish-github-release.sh "${repo}" "${tag}"${options.draft ? ' --draft' : ''}`,
    ``,
    `# 2) Или ручное создание релиза через GitHub CLI (gh):`,
    `gh release create "${tag}" \\`,
    assetLines,
    `  --repo "${repo}" \\`,
    `  --title "${DEFAULT_GITHUB_RELEASE_TITLE}" \\`,
    `  --notes-file "public/builds/RELEASE-v1.0.3-mod-v2.3.md"${extraFlags.length > 0 ? ` \\\n  ${extraFlags.join(' ')}` : ''}`,
  ].join('\n');
}
