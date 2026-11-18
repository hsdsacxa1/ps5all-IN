import React, { useEffect, useState } from 'react';
import { Check, Copy, Cpu, Download, FileCode2, ShieldCheck } from 'lucide-react';
import { BuiltElfDiskInfo, getBuildDownloadUrl } from '../../bridge/builtElfCatalog';
import { fetchBuiltElfCatalog } from '../../bridge/bridgeClient';
import {
  filterTitanCorePatches,
  TITAN_CORE_CATEGORY_TABS,
  TITAN_CORE_MOD_SUMMARY,
  TitanCorePatchCategory,
} from '../../mounters/titanCoreModSpec';
import { TitanCoreDebugMatrixCard } from './TitanCoreDebugMatrixCard';
import { TitanCoreReleaseCard } from './TitanCoreReleaseCard';

export const TitanCoreModPanel: React.FC = () => {
  const [activeCategory, setActiveCategory] =
    useState<TitanCorePatchCategory>('all');
  const filteredPatches = filterTitanCorePatches(activeCategory);
  const [selectedPatchId, setSelectedPatchId] = useState<string>(
    filteredPatches[0]?.id ?? 'debug-memory-vmmap-collector'
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [diskInfo, setDiskInfo] = useState<BuiltElfDiskInfo | null>(null);

  useEffect(() => {
    let active = true;
    fetchBuiltElfCatalog()
      .then((items) => {
        if (!active) return;
        const found = items.find(
          (item) => item.id === TITAN_CORE_MOD_SUMMARY.elfArtifact
        );
        if (found) setDiskInfo(found);
      })
      .catch(() => {
        // Offline/static fallback keeps metadata readable
      });
    return () => {
      active = false;
    };
  }, []);

  const activePatch =
    filteredPatches.find((p) => p.id === selectedPatchId) ??
    filteredPatches[0];

  const handleCategoryChange = (cat: TitanCorePatchCategory) => {
    setActiveCategory(cat);
    const next = filterTitanCorePatches(cat);
    if (next.length > 0 && !next.some((p) => p.id === selectedPatchId)) {
      setSelectedPatchId(next[0].id);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const formattedSize = diskInfo?.exists
    ? `${diskInfo.sizeBytes.toLocaleString('en-US')} байт (${(diskInfo.sizeBytes / (1024 * 1024)).toFixed(2)} MiB)`
    : 'Собранный PS5 ELF64 (2-stage self-copy)';

  return (
    <div className="p-6 rounded-xl border-2 border-emerald-500/40 dark:border-emerald-500/30 bg-white dark:bg-slate-900 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{TITAN_CORE_MOD_SUMMARY.versionLabel}</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Улучшенный форк TITAN-CORE (Собранный ELF Mod v2.2 от 18.11.2026)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Кросс-скомпилированный 2-stage LTO ELF (<code className="font-mono">Mod v2.2</code>) включает в себя: встроенный <strong>сборщик дебаг-бандлов памяти и ошибок</strong> (<code className="font-mono">GET /api/debug/memory</code> с <code className="font-mono">getrusage</code> + <code className="font-mono">KERN_PROC_VMMAP</code>, кольцевой буфер 256 <code className="font-mono">errno</code>, авто-дамп <code className="font-mono">last-crash-bundle.json</code> при панике и детектор коллизий <code className="font-mono">unionfs</code>), поддержку <strong>всех 7 форматов дампов</strong> (<code className="font-mono">folder</code>, <code className="font-mono">lz4</code>, <code className="font-mono">zstd</code>, <code className="font-mono">pkg</code>/split, <code className="font-mono">ffpkg/ffpfsc</code>, <code className="font-mono">zst/lz4</code>-архивы, <code className="font-mono">exfat/img</code>), очистку <code className="font-mono">/data/ampr_cache</code> и реальный порт <code className="font-mono">ps5-dump-forge #62</code> + <code className="font-mono">ampr-emu-ng 3ced5c0</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={getBuildDownloadUrl(TITAN_CORE_MOD_SUMMARY.elfArtifact)}
            download={TITAN_CORE_MOD_SUMMARY.elfArtifact}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Скачать {TITAN_CORE_MOD_SUMMARY.elfArtifact}</span>
          </a>
          <a
            href={getBuildDownloadUrl(TITAN_CORE_MOD_SUMMARY.patchArtifact)}
            download={TITAN_CORE_MOD_SUMMARY.patchArtifact}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 whitespace-nowrap"
          >
            <FileCode2 className="w-4 h-4" />
            <span>Mod v2.2 (.patch)</span>
          </a>
          <a
            href={getBuildDownloadUrl(TITAN_CORE_MOD_SUMMARY.elfReportArtifact)}
            download={TITAN_CORE_MOD_SUMMARY.elfReportArtifact}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>readelf (.txt)</span>
          </a>
        </div>
      </div>

      {/* Live Binary Telemetry Card */}
      <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
            Compiled ELF: public/builds/{TITAN_CORE_MOD_SUMMARY.elfArtifact} · Patch: {TITAN_CORE_MOD_SUMMARY.patchArtifact}
          </span>
          <span className="text-slate-700 dark:text-slate-200 tabular-nums">
            {formattedSize}
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 break-all">
          SHA-256 ELF: {diskInfo?.sha256 ?? 'ffb3f6f60a03a40cd24745e47fd240222241fa48b191f1aeda77d9be423f9333'} · Тесты: {TITAN_CORE_MOD_SUMMARY.rustTestsPassed}
        </div>
      </div>

      {/* GitHub Release Package & README.md */}
      <TitanCoreReleaseCard />

      {/* All 7 Dump Formats & Memory/Error Debug Bundle Matrix */}
      <TitanCoreDebugMatrixCard />

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {TITAN_CORE_CATEGORY_TABS.map((tab) => {
          const active = tab.id === activeCategory;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleCategoryChange(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Patch Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filteredPatches.map((patch) => {
          const active = activePatch?.id === patch.id;
          return (
            <button
              key={patch.id}
              type="button"
              onClick={() => setSelectedPatchId(patch.id)}
              className={`text-left p-3.5 rounded-lg border transition-colors space-y-1 ${
                active
                  ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                <span className="truncate">{patch.categoryLabel}</span>
              </div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                {patch.title}
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                {patch.targetFile}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Patch Details */}
      {activePatch && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="space-y-1 max-w-3xl">
              <div className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
                {activePatch.title}
              </div>
              <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                Основание: {activePatch.sceneBasis} · Файлы: {activePatch.targetFile}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {activePatch.summary}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(activePatch.snippet, activePatch.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              {copiedKey === activePatch.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copiedKey === activePatch.id ? 'Скопировано' : 'Копировать фрагмент'}
              </span>
            </button>
          </div>

          <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 border border-slate-800 text-xs font-mono overflow-x-auto leading-relaxed">
            <code>{activePatch.snippet}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
