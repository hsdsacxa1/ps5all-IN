import React, { useState } from 'react';
import { Check, Copy, Download, FileCode, Terminal } from 'lucide-react';
import { GeneratedFileArtifact, ProjectScaffoldConfig } from '../../types/ps5';

interface CodeArtifactViewerProps {
  config: ProjectScaffoldConfig;
  artifacts: GeneratedFileArtifact[];
  deployCommands: string;
}

export const CodeArtifactViewer: React.FC<CodeArtifactViewerProps> = ({
  config,
  artifacts,
  deployCommands,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const safeIndex = selectedIndex < artifacts.length ? selectedIndex : 0;
  const currentArtifact = artifacts[safeIndex];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedPath(key);
    setTimeout(() => setCopiedPath(null), 1800);
  };

  const handleDownloadFile = (artifact: GeneratedFileArtifact) => {
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.path.replace(/\//g, '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  const isNative =
    config.architecture === 'native-app' || config.architecture === 'hybrid-app';

  return (
    <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            02. Сгенерированный скелет проекта и команды деплоя
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
            <span>{isNative ? `/data/homebrew/${config.titleId}/` : `build/${config.projectName}.elf`}</span>
            <span aria-hidden="true">·</span>
            <span>{artifacts.length} файлов</span>
            <span aria-hidden="true">·</span>
            <span>FW 13.60 Ready</span>
          </div>
        </div>

        {currentArtifact && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(currentArtifact.content, currentArtifact.path)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {copiedPath === currentArtifact.path ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedPath === currentArtifact.path ? 'Скопировано' : 'Копировать файл'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadFile(currentArtifact)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать {currentArtifact.path.split('/').pop()}</span>
            </button>
          </div>
        )}
      </div>

      {/* File Tabs */}
      <div
        role="tablist"
        aria-label="Сгенерированные файлы проекта"
        className="flex flex-wrap items-center gap-1.5"
      >
        {artifacts.map((file, idx) => {
          const active = idx === safeIndex;
          return (
            <button
              key={file.path}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{file.path}</span>
            </button>
          );
        })}
      </div>

      {/* Active File Code Box */}
      {currentArtifact && (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {currentArtifact.description}
          </p>
          <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 border border-slate-800 text-xs font-mono overflow-x-auto max-h-[380px] leading-relaxed">
            <code>{currentArtifact.content}</code>
          </pre>
        </div>
      )}

      {/* Deploy Pipeline Box */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <Terminal className="w-4 h-4 text-blue-500" />
            <span>Команды сборки и деплоя на консоль ({config.ps5Ip})</span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(deployCommands, 'deploy-cmd')}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
          >
            {copiedPath === 'deploy-cmd' ? 'Команды скопированы' : 'Копировать команды'}
          </button>
        </div>
        <pre className="p-3.5 rounded-lg bg-slate-950 text-emerald-300 border border-slate-800 text-xs font-mono overflow-x-auto leading-relaxed">
          <code>{deployCommands}</code>
        </pre>
      </div>
    </div>
  );
};
