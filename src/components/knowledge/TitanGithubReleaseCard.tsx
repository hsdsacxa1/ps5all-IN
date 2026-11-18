import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  GitBranch,
  Loader2,
  Rocket,
  Terminal,
} from 'lucide-react';
import { getBuildDownloadUrl } from '../../bridge/builtElfCatalog';
import { TITAN_CORE_RELEASE_TAG } from '../../mounters/titanCoreReleaseData';
import {
  DEFAULT_GITHUB_RELEASE_TITLE,
  generateGithubPublishCommands,
  GithubPublishResult,
  GithubServerStatusResponse,
  validateGithubRepoSlug,
  validateReleaseTag,
} from '../../services/githubReleaseBuilder';

export const TitanGithubReleaseCard: React.FC = () => {
  const [serverStatus, setServerStatus] = useState<GithubServerStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [repoSlug, setRepoSlug] = useState('your-user/TITAN-CORE-Mod');
  const [tag, setTag] = useState(TITAN_CORE_RELEASE_TAG);
  const [title, setTitle] = useState(DEFAULT_GITHUB_RELEASE_TITLE);
  const [draft, setDraft] = useState(false);
  const [prerelease, setPrerelease] = useState(false);
  const [includePreservedV22, setIncludePreservedV22] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<GithubPublishResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/github/status')
      .then((res) => res.json())
      .then((data: GithubServerStatusResponse) => {
        if (!active || !data?.ok) return;
        setServerStatus(data);
        if (data.defaultRepo) {
          setRepoSlug(data.defaultRepo);
        }
      })
      .catch(() => {
        // Offline fallback keeps CLI script generator usable
      })
      .finally(() => {
        if (active) setStatusLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const repoValidation = useMemo(() => validateGithubRepoSlug(repoSlug), [repoSlug]);
  const tagValidation = useMemo(() => validateReleaseTag(tag), [tag]);

  const publishCommands = useMemo(
    () =>
      generateGithubPublishCommands({
        repoSlug,
        tag,
        draft,
        prerelease,
        includePreservedV22,
      }),
    [repoSlug, tag, draft, prerelease, includePreservedV22]
  );

  const visibleAssets = useMemo(() => {
    const all = serverStatus?.assets ?? [];
    if (includePreservedV22) return all;
    return all.filter((a) => a.versionGroup === 'v2.3' || a.versionGroup === 'shared');
  }, [serverStatus, includePreservedV22]);

  const onDiskCount = visibleAssets.filter((a) => a.exists).length;

  const handleCopy = (value: string, key: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handlePublishViaApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoValidation.ok || !tagValidation.ok) return;
    setPublishing(true);
    setPublishResult(null);

    try {
      const res = await fetch('/api/github/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoSlug: repoValidation.normalized,
          tag: tagValidation.normalized,
          title,
          draft,
          prerelease,
          includePreservedV22,
        }),
      });
      const data = (await res.json()) as GithubPublishResult;
      setPublishResult(data);
    } catch (err) {
      setPublishResult({
        ok: false,
        error: err instanceof Error ? err.message : 'Сетевая ошибка при обращении к /api/github/publish.',
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <section
      aria-label="Публикация релиза на GitHub"
      className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <GitBranch className="w-4 h-4 text-slate-800 dark:text-slate-200 shrink-0" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              GitHub Release Publisher (Mod v2.3 + GitHub Actions Docker ELF64 + Preserved v2.2)
            </h4>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
            Архив <code className="font-mono">TITAN-CORE-v1.0.3-mod-20261118-src.tar.gz</code> уже содержит{' '}
            <code className="font-mono">.github/workflows/build.yml</code>: при пуше тега{' '}
            <code className="font-mono">{tagValidation.normalized ?? TITAN_CORE_RELEASE_TAG}</code> GitHub Actions
            автоматически скомпилирует нативный <code className="font-mono">TITAN-CORE-v1.0-mod-20261118-v2.3.elf</code>{' '}
            в Docker (<code className="font-mono">ps5/build.sh</code>) и прикрепит его к релизу.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border ${
              statusLoading
                ? 'border-slate-300 dark:border-slate-700 text-slate-500'
                : serverStatus?.tokenConfigured
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
            }`}
          >
            {statusLoading
              ? 'Проверка /api/github/status…'
              : serverStatus?.tokenConfigured
                ? 'Server GITHUB_TOKEN: подключён'
                : 'Server GITHUB_TOKEN: не задан (используйте Secrets или CLI)'}
          </span>

          <a
            href={getBuildDownloadUrl('publish-github-release.sh')}
            download="publish-github-release.sh"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать publish-github-release.sh</span>
          </a>
        </div>
      </div>

      {/* Form Controls */}
      <form onSubmit={handlePublishViaApi} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="github-release-repo"
              className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300"
            >
              GitHub репозиторий (owner/repo)
            </label>
            <input
              id="github-release-repo"
              type="text"
              value={repoSlug}
              onChange={(e) => setRepoSlug(e.target.value)}
              placeholder="username/TITAN-CORE-Mod"
              className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {!repoValidation.ok && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400">{repoValidation.error}</p>
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="github-release-tag"
              className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300"
            >
              Git Tag (запускает Actions)
            </label>
            <input
              id="github-release-tag"
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="v1.0.3-mod-20261118"
              className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {!tagValidation.ok && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400">{tagValidation.error}</p>
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="github-release-title"
              className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300"
            >
              Заголовок релиза
            </label>
            <input
              id="github-release-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includePreservedV22}
                onChange={(e) => setIncludePreservedV22(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Включить сохранённый Mod v2.2</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={draft}
                onChange={(e) => setDraft(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Создать как Draft</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={prerelease}
                onChange={(e) => setPrerelease(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Prerelease</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={publishing || !repoValidation.ok || !tagValidation.ok}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {publishing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Rocket className="w-3.5 h-3.5" />
              )}
              <span>Опубликовать через GitHub API</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopy(publishCommands, 'publish-script')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {copiedKey === 'publish-script' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copiedKey === 'publish-script' ? 'Команды скопированы' : 'Копировать команды (Git + gh)'}
              </span>
            </button>
          </div>
        </div>
      </form>

      {/* API Publish Response Banner */}
      {publishResult && (
        <div
          role="status"
          className={`p-3 rounded-lg border text-xs space-y-1.5 ${
            publishResult.ok
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2 font-semibold">
            <span className="inline-flex items-center gap-1.5">
              {publishResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <span>
                {publishResult.ok
                  ? `Релиз ${publishResult.tag} опубликован в ${publishResult.repo}`
                  : 'Публикация через серверный API ожидает настройки GITHUB_TOKEN'}
              </span>
            </span>
            {publishResult.releaseUrl && (
              <a
                href={publishResult.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline font-mono text-[11px]"
              >
                <span>Открыть на GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          {publishResult.error && <p className="text-[11px] leading-relaxed">{publishResult.error}</p>}
          {publishResult.uploadedAssets && publishResult.uploadedAssets.length > 0 && (
            <p className="text-[11px] font-mono">
              Загружено файлов ({publishResult.uploadedAssets.length}): {publishResult.uploadedAssets.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Live On-Disk Asset Verification Summary */}
      {visibleAssets.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
            <span>
              Готово на диске в public/builds/: {onDiskCount} из {visibleAssets.length} файлов
            </span>
            <span>.elf компилируется в GitHub Actions (.github/workflows/build.yml)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {visibleAssets.map((asset) => (
              <div
                key={asset.filename}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono flex items-center justify-between gap-2 ${
                  asset.exists
                    ? 'border-emerald-500/30 bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-200'
                    : 'border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300'
                }`}
              >
                <span className="truncate">{asset.filename}</span>
                <span className="shrink-0 text-[10px]">
                  {asset.exists
                    ? `${(asset.sizeBytes / 1024).toFixed(1)} KiB`
                    : 'Docker CI'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* One-shot Local Terminal Commands */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          <Terminal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Готовый скрипт публикации с вашего ПК (git push --tags + GitHub Actions + gh release)</span>
        </div>
        <pre className="p-3 rounded-lg bg-slate-950 text-slate-100 border border-slate-800 text-[11px] font-mono overflow-x-auto leading-relaxed">
          <code>{publishCommands}</code>
        </pre>
      </div>
    </section>
  );
};
