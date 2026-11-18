import React, { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { ProjectScaffoldConfig } from '../../types/ps5';

interface AgentHandoffViewProps {
  config: ProjectScaffoldConfig;
  fullAgentsMarkdown: string;
  onDownloadAgentsMd: (filename: string, content: string) => void;
}

type TargetAgentFileFormat = 'AGENTS.md' | 'CLAUDE.md' | '.cursor/rules/ps5-1360.mdc';

export const AgentHandoffView: React.FC<AgentHandoffViewProps> = ({
  config,
  fullAgentsMarkdown,
  onDownloadAgentsMd,
}) => {
  const [targetFileFormat, setTargetFileFormat] =
    useState<TargetAgentFileFormat>('AGENTS.md');
  const [taskDescription, setTaskDescription] = useState<string>(
    'гибридную утилиту синхронизации сохранений и монтирования сетевых папок с локальным helper.elf (9021) и интеграцией ShadowMountPlus API (10101)'
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const formattedRuleFileContent =
    targetFileFormat === '.cursor/rules/ps5-1360.mdc'
      ? `---\ndescription: PS5 Firmware 13.60 Development Handoff & Architecture Rules (14.11.2026)\nglobs: ["**/*.c", "**/*.cpp", "**/*.h", "**/Makefile", "**/CMakeLists.txt", "**/param.json"]\nalwaysApply: true\n---\n\n${fullAgentsMarkdown}`
      : fullAgentsMarkdown;

  const kickoffPrompt = `Изучи ${targetFileFormat}. Мы разрабатываем ${taskDescription} под PS5 FW 13.60 (архитектура: ${config.architecture}, Title ID: ${config.titleId}, графический стек: ${config.graphicsBackend}). Предложи структуру проекта, Makefile/CMakeLists.txt и реализуй минимальный рабочий скелет (MVP) с проверкой запрещённых импортов (check-title-imports.py), fallback-путём в /download0/ и инструкцией деплоя на $PS5_HOST (${config.ps5Ip}).`;

  const copyText = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Kickoff Prompt Constructor */}
      <div className="lg:col-span-5 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            01. Генератор стартового промпта для ИИ-агента
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Формирует точное техническое задание со ссылкой на спецификацию 14.11.2026
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Формат файла контекста в корне репозитория
            </label>
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              {(
                ['AGENTS.md', 'CLAUDE.md', '.cursor/rules/ps5-1360.mdc'] as const
              ).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setTargetFileFormat(fmt)}
                  className={`px-2.5 py-1.5 text-xs font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                    targetFileFormat === fmt
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="handoff-task-textarea"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Описание разрабатываемого приложения
            </label>
            <textarea
              id="handoff-task-textarea"
              rows={4}
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 leading-relaxed"
            />
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Готовый первый промпт агенту:
              </span>
              <button
                type="button"
                onClick={() => copyText(kickoffPrompt, 'prompt')}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {copiedKey === 'prompt' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>
                  {copiedKey === 'prompt' ? 'Промпт скопирован' : 'Копировать промпт'}
                </span>
              </button>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-950 text-slate-100 border border-slate-800 text-xs font-mono leading-relaxed">
              {kickoffPrompt}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Full Specification File Preview & Export */}
      <div className="lg:col-span-7 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              02. Полный файл контекста ({targetFileFormat})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              Все 7 разделов базы знаний PS5 FW 13.60 (редакция от 14.11.2026)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyText(formattedRuleFileContent, 'spec')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              {copiedKey === 'spec' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === 'spec' ? 'Скопировано' : 'Копировать весь текст'}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onDownloadAgentsMd(
                  targetFileFormat.replace(/\//g, '_'),
                  formattedRuleFileContent
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать {targetFileFormat.split('/').pop()}</span>
            </button>
          </div>
        </div>

        <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 border border-slate-800 text-xs font-mono overflow-x-auto max-h-[520px] leading-relaxed whitespace-pre-wrap">
          <code>{formattedRuleFileContent}</code>
        </pre>
      </div>
    </div>
  );
};
