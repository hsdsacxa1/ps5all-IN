import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, FileCode2 } from 'lucide-react';
import { generateDumpModArtifacts } from '../../mods/dumpModRegistry';
import {
  DumpModGeneratedArtifact,
  DumpModRecipeConfig,
} from '../../types/dumpMods';

interface DumpModArtifactsPanelProps {
  config: DumpModRecipeConfig;
}

export const DumpModArtifactsPanel: React.FC<DumpModArtifactsPanelProps> = ({
  config,
}) => {
  const artifacts = useMemo(
    () => generateDumpModArtifacts(config),
    [config]
  );

  const [activeTabId, setActiveTabId] =
    useState<DumpModGeneratedArtifact['id']>('pipeline-sh');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeArtifact =
    artifacts.find((item) => item.id === activeTabId) ?? artifacts[0];

  const handleCopy = async (artifact: DumpModGeneratedArtifact) => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopiedId(artifact.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Fallback ignored in headless environments
    }
  };

  const handleDownload = (artifact: DumpModGeneratedArtifact) => {
    const blob = new Blob([artifact.content], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = artifact.filename.split('/').pop() ?? artifact.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Артефакты модификации для {config.gameTitle} ({config.titleId})
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            04. Сгенерированные скрипты патчинга, манифесты и промпт для ИИ-агента
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
          {artifacts.map((art) => {
            const isActive = art.id === activeArtifact.id;
            return (
              <button
                key={art.id}
                type="button"
                onClick={() => setActiveTabId(art.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {art.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
            <FileCode2 className="h-3.5 w-3.5" />
            <span>{activeArtifact.filename}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {activeArtifact.description}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleCopy(activeArtifact)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {copiedId === activeArtifact.id ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span>Скопировано</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Копировать код</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleDownload(activeArtifact)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Скачать файл</span>
          </button>
        </div>
      </div>

      <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono leading-relaxed overflow-x-auto border border-slate-800 max-h-[420px]">
        <code>{activeArtifact.content}</code>
      </pre>
    </section>
  );
};
