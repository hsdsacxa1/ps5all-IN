import React, { useState } from 'react';
import { Check, Copy, Download, Layers, Sparkles } from 'lucide-react';
import { KRAKEN_SHADOW_MIX_PATCHES } from '../../mounters/krakenShadowMixPatches';

export const KrakenShadowMixBuilder: React.FC = () => {
  const [selectedPatchId, setSelectedPatchId] = useState<string>(
    KRAKEN_SHADOW_MIX_PATCHES[0].id
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activePatch =
    KRAKEN_SHADOW_MIX_PATCHES.find((p) => p.id === selectedPatchId) ||
    KRAKEN_SHADOW_MIX_PATCHES[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDownloadSingle = (filename: string, content: string) => {
    const cleanName = filename.split('/').pop() || 'patch.txt';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [isDownloadingElf, setIsDownloadingElf] = useState(false);

  const handleDownloadCompiledElf = async () => {
    try {
      setIsDownloadingElf(true);
      const res = await fetch('/builds/kraken-shadow-mix.elf?v=3f25bef2', {
        cache: 'no-store',
      });
      const buf = await res.arrayBuffer();
      const blob = new Blob([buf], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kraken-shadow-mix.elf';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloadingElf(false);
    }
  };

  const handleDownloadFullBundle = () => {
    const bundleContent = KRAKEN_SHADOW_MIX_PATCHES.map(
      (p) =>
        `# ============================================================================\n# FILE: ${p.filename}\n# TARGET: ${p.targetFileInRepo}\n# FIX: ${p.title}\n# ============================================================================\n\n${p.content}\n`
    ).join('\n\n');
    handleDownloadSingle('kraken-shadow-mix-complete.bundle.txt', bundleContent);
  };

  return (
    <div className="p-6 rounded-xl border-2 border-blue-500/40 dark:border-blue-500/30 bg-white dark:bg-slate-900 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              UNIFIED KRAKEN-SHADOW-MIX BUILDER · СВЕЖИЙ БИЛД С КОММИТА 801b98e (14.11.2026)
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Готовый патч-комплект KrakenShadow-Mix (ShadowMountPlus v1.7 + Kraken Mount 801b98e)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Собран из свежего коммита <code className="font-mono">801b98e</code> (zero-copy{' '}
            <code className="font-mono">kraken_zero.dat</code> для sparse <code className="font-mono">.pkg</code>,
            перелинковка перемещённых игр, 11 языков включая русский, <code className="font-mono">KEKCALL_CHECK</code>{' '}
            для <code className="font-mono">kstuff</code>) + наши патчи: <strong>(1)</strong> снята блокировка{' '}
            <code className="font-mono">shadowmountplus.elf</code> в <code className="font-mono">wait_ready()</code> и включён{' '}
            <code className="font-mono">Stacked UnionFS</code> в <code className="font-mono">src/launch.rs</code>;{' '}
            <strong>(2)</strong> двухуровневый сканер вложенных <code className="font-mono">.pkg</code> и{' '}
            <code className="font-mono">/data/games</code>; <strong>(3)</strong> мост{' '}
            <code className="font-mono">127.0.0.1:10101</code> для <code className="font-mono">.ffpkg</code> /{' '}
            <code className="font-mono">.ffpfsc</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadCompiledElf}
            disabled={isDownloadingElf}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 shadow-xs whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>
              {isDownloadingElf
                ? 'Загрузка 4.49 MB...'
                : 'Скачать готовый kraken-shadow-mix.elf (4.49 MB)'}
            </span>
          </button>
          <button
            type="button"
            onClick={handleDownloadFullBundle}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-xs whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Скачать патч-бандл (5 файлов)</span>
          </button>
        </div>
      </div>

      {/* Compiled Real ELF64 Binary Status Card */}
      <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-300">
            <span>Скомпилированный бинарник (база 801b98e): kraken-shadow-mix.elf</span>
            <span>·</span>
            <span>4,491,376 байт (4.49 MB / 4.28 MiB)</span>
            <span>·</span>
            <span>Оригинал v0.0.1-beta: 4,327,528 байт (+163,848 байт)</span>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
            SHA-256: 3f25bef2b155fb2ec99a2e883e2763501f583f42726b5153d4b379d885d56fb4 · Включает kraken_zero.dat + 11 языков + Stacked UnionFS без конфликта с ShadowMountPlus
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCompiledElf}
            disabled={isDownloadingElf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать .elf (4,491,376 байт)</span>
          </button>
          <a
            href="/builds/kraken-shadow-mix.patch?v=3f25bef2"
            download="kraken-shadow-mix.patch"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>git diff (.patch)</span>
          </a>
        </div>
      </div>

      {/* Patch Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {KRAKEN_SHADOW_MIX_PATCHES.map((patch) => {
          const active = patch.id === activePatch.id;
          return (
            <button
              key={patch.id}
              type="button"
              onClick={() => setSelectedPatchId(patch.id)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                active
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/40'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 truncate">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{patch.filename}</span>
              </div>
              <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 mt-1 line-clamp-2">
                {patch.title}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Patch Detail & Code Viewer */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <div className="space-y-1 max-w-3xl">
            <div className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
              {activePatch.title} · <span className="text-blue-600 dark:text-blue-400">{activePatch.targetFileInRepo}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {activePatch.problemSolved}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(activePatch.content, activePatch.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              {copiedId === activePatch.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copiedId === activePatch.id ? 'Скопировано' : 'Копировать код'}
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleDownloadSingle(activePatch.filename, activePatch.content)
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать {activePatch.filename.split('/').pop()}</span>
            </button>
          </div>
        </div>

        <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 border border-slate-800 text-xs font-mono overflow-x-auto max-h-[380px] leading-relaxed">
          <code>{activePatch.content}</code>
        </pre>
      </div>
    </div>
  );
};
