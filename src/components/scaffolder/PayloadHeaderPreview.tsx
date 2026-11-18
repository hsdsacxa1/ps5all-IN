import React, { useState } from 'react';
import { AlertTriangle, Check, Copy, Download, FileCode2 } from 'lucide-react';
import { GeneratedHeaderResult } from '../../types/payloadHeader';

interface PayloadHeaderPreviewProps {
  result: GeneratedHeaderResult;
}

export const PayloadHeaderPreview: React.FC<PayloadHeaderPreviewProps> = ({
  result,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleDownloadHeader = () => {
    const blob = new Blob([result.content], {
      type: 'text/x-c;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const includeSnippet = `#include "${result.fileName}"

int main(void) {
    /* Target: ${result.firmware.fwLabel} */
    uint64_t kdata_base = ${result.firmware.offsets.kernelDataBaseHint};
    (void)kdata_base;
    return 0;
}`;

  return (
    <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-mono">
              {result.fileName}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
            <span>FW {result.firmware.fwNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{result.macroCount} #define</span>
            <span aria-hidden="true">·</span>
            <span>{result.lineCount} строк</span>
            <span aria-hidden="true">·</span>
            <span>{result.loaderLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleCopy(result.content, 'c-header')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {copiedKey === 'c-header' ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>
              {copiedKey === 'c-header' ? 'Скопировано' : 'Копировать .h'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadHeader}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать {result.fileName}</span>
          </button>
        </div>
      </div>

      {result.validationWarnings.length > 0 && (
        <div
          role="alert"
          className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs space-y-1"
        >
          {result.validationWarnings.map((warning) => (
            <div key={warning} className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      <pre
        data-testid="payload-header-code"
        className="p-4 rounded-lg bg-slate-950 text-slate-100 border border-slate-800 text-xs font-mono overflow-x-auto max-h-[430px] leading-relaxed"
      >
        <code>{result.content}</code>
      </pre>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Быстрое подключение в src/main.c ELF-пэйлоада
          </span>
          <button
            type="button"
            onClick={() => handleCopy(includeSnippet, 'include-snippet')}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
          >
            {copiedKey === 'include-snippet'
              ? 'Сниппет скопирован'
              : 'Копировать #include'}
          </button>
        </div>
        <pre className="p-3.5 rounded-lg bg-slate-950 text-emerald-300 border border-slate-800 text-xs font-mono overflow-x-auto leading-relaxed">
          <code>{includeSnippet}</code>
        </pre>
      </div>
    </div>
  );
};
