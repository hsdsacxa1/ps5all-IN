import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, FileCode2 } from 'lucide-react';
import { generateNativePortArtifacts } from '../../ports/portStrategyRegistry';
import { NativePortConfig } from '../../types/nativePorts';

interface PortArtifactsPanelProps {
  config: NativePortConfig;
}

export const PortArtifactsPanel: React.FC<PortArtifactsPanelProps> = ({
  config,
}) => {
  const artifacts = useMemo(
    () => generateNativePortArtifacts(config),
    [config]
  );
  const [activeTabId, setActiveTabId] = useState<string>('cmake');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currentArtifact =
    artifacts.find((item) => item.id === activeTabId) ?? artifacts[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentArtifact.content);
      setCopiedId(currentArtifact.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  const handleDownload = () => {
    const cleanName = currentArtifact.filename.split('/').pop() || 'artifact.txt';
    const blob = new Blob([currentArtifact.content], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <FileCode2 className="h-3.5 w-3.5 text-sky-500" />
            <span>Сгенерированный комплект файлов для порта {config.titleId}</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Заготовка сборки, адаптер 13.60 и промпт портирования
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            {copiedId === currentArtifact.id ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Скопировано
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Копировать файл
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Скачать {currentArtifact.filename.split('/').pop()}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
        {artifacts.map((artifact) => {
          const active = artifact.id === currentArtifact.id;
          return (
            <button
              key={artifact.id}
              type="button"
              onClick={() => setActiveTabId(artifact.id)}
              className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {artifact.filename}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400">
        {currentArtifact.description}
      </p>

      <pre className="max-h-[420px] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200">
        <code>{currentArtifact.content}</code>
      </pre>
    </section>
  );
};
