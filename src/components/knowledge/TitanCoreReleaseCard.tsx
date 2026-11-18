import React, { useState } from 'react';
import { Check, Copy, Download, FileText, PackageCheck, Terminal } from 'lucide-react';
import { getBuildDownloadUrl } from '../../bridge/builtElfCatalog';
import {
  TITAN_CORE_GH_RELEASE_CMD,
  TITAN_CORE_GITHUB_README_PREVIEW,
  TITAN_CORE_PRESERVED_V22_TAG,
  TITAN_CORE_RELEASE_FILES,
  TITAN_CORE_RELEASE_TAG,
} from '../../mounters/titanCoreReleaseData';

export const TitanCoreReleaseCard: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showReadme, setShowReadme] = useState(false);
  const [versionFilter, setVersionFilter] = useState<'all' | 'v2.3' | 'v2.2-preserved'>('all');

  const handleCopy = (value: string, key: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const visibleFiles = TITAN_CORE_RELEASE_FILES.filter((f) => {
    if (versionFilter === 'all') return true;
    return f.versionGroup === versionFilter || f.versionGroup === 'shared';
  });

  return (
    <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PackageCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Релиз форка TITAN-CORE ({TITAN_CORE_RELEASE_TAG} + сохранённый {TITAN_CORE_PRESERVED_V22_TAG})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setVersionFilter('all')}
              className={`px-2 py-0.5 rounded font-medium ${
                versionFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Все (v2.3 + v2.2)
            </button>
            <button
              type="button"
              onClick={() => setVersionFilter('v2.3')}
              className={`px-2 py-0.5 rounded font-medium ${
                versionFilter === 'v2.3'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Mod v2.3 (NEW)
            </button>
            <button
              type="button"
              onClick={() => setVersionFilter('v2.2-preserved')}
              className={`px-2 py-0.5 rounded font-medium ${
                versionFilter === 'v2.2-preserved'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Mod v2.2 (Preserved)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowReadme((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-indigo-500/30 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{showReadme ? 'Скрыть README.md' : 'Просмотр GitHub README.md'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopy(TITAN_CORE_GH_RELEASE_CMD, 'gh-cli')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {copiedId === 'gh-cli' ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Terminal className="w-3.5 h-3.5" />
            )}
            <span>{copiedId === 'gh-cli' ? 'CLI скопирован' : 'Копировать gh release'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {visibleFiles.map((item) => {
          const badge =
            item.versionGroup === 'v2.3'
              ? 'NEW v2.3'
              : item.versionGroup === 'v2.2-preserved'
                ? 'Preserved v2.2'
                : 'Shared';
          return (
            <a
              key={item.filename}
              href={getBuildDownloadUrl(item.filename)}
              download={item.filename}
              className={`flex items-start justify-between gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                item.primary
                  ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15'
                  : item.versionGroup === 'v2.2-preserved'
                    ? 'border-amber-500/35 bg-amber-500/5 hover:border-amber-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 hover:border-indigo-400'
              }`}
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                    {badge}
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {item.filename}
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-1">
                  {item.role}
                </div>
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {item.sizeLabel} · {item.sha256.slice(0, 16)}…
                </div>
              </div>
              <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            </a>
          );
        })}
      </div>

      {showReadme && (
        <div className="space-y-2 pt-2 border-t border-indigo-500/20">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
              public/builds/TITAN-CORE-README.md (полный файл доступен для скачивания выше)
            </span>
            <button
              type="button"
              onClick={() => handleCopy(TITAN_CORE_GITHUB_README_PREVIEW, 'readme-preview')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {copiedId === 'readme-preview' ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>{copiedId === 'readme-preview' ? 'Скопировано' : 'Копировать сводку'}</span>
            </button>
          </div>
          <pre className="p-3 rounded-lg bg-slate-950 text-slate-100 border border-slate-800 text-[11px] font-mono overflow-x-auto leading-relaxed">
            <code>{TITAN_CORE_GITHUB_README_PREVIEW}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
