import React, { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, FileArchive, Terminal } from 'lucide-react';
import { PS5_DUMP_FORMATS } from '../../mounters/titanCoreDumpFormats';
import {
  analyzeTitanDebugBundle,
  DebugBundleFinding,
  DebugFindingSeverity,
  SAMPLE_TITAN_DEBUG_BUNDLE,
  TITAN_CORE_DEBUG_ENDPOINTS,
  TitanCoreDebugBundle,
} from '../../mounters/titanCoreDebugCollector';

const SEVERITY_STYLE_MAP: Record<DebugFindingSeverity, string> = {
  critical: 'border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  warning: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

const SEVERITY_ICON_MAP: Record<DebugFindingSeverity, React.ReactNode> = {
  critical: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
  ok: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
};

export const TitanCoreDebugMatrixCard: React.FC = () => {
  const [subTab, setSubTab] = useState<'formats' | 'debug'>('formats');
  const [bundleText, setBundleText] = useState<string>(
    JSON.stringify(SAMPLE_TITAN_DEBUG_BUNDLE, null, 2)
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [findings, setFindings] = useState<DebugBundleFinding[]>(() =>
    analyzeTitanDebugBundle(SAMPLE_TITAN_DEBUG_BUNDLE)
  );

  const handleAnalyzeBundle = (raw: string) => {
    setBundleText(raw);
    try {
      const parsed = JSON.parse(raw) as TitanCoreDebugBundle;
      if (!parsed || !parsed.memory || !Array.isArray(parsed.mounts) || !Array.isArray(parsed.errors)) {
        setParseError('Ожидается JSON с полями memory, mounts[] и errors[] из GET /api/debug/bundle');
        return;
      }
      setParseError(null);
      setFindings(analyzeTitanDebugBundle(parsed));
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Ошибка разбора JSON');
    }
  };

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Mod v2.2: Все 7 форматов дампов и сборщик отладки (память + errno + unionfs)
          </h4>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setSubTab('formats')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              subTab === 'formats'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileArchive className="w-3.5 h-3.5" />
            <span>Все форматы дампов (7)</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('debug')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              subTab === 'debug'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Дебаг-API и Анализатор бандла</span>
          </button>
        </div>
      </div>

      {subTab === 'formats' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {PS5_DUMP_FORMATS.map((fmt) => (
            <div
              key={fmt.id}
              className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {fmt.name}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                  {fmt.handler}
                </span>
              </div>
              <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 break-all">
                {fmt.extensionsOrMarker}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {fmt.amprIndexRule}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {fmt.notes}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {TITAN_CORE_DEBUG_ENDPOINTS.map((ep) => (
              <div
                key={ep.path}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1"
              >
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {ep.method} {ep.path}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                  {ep.title}
                </div>
                <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                  {ep.outputArtifact}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {ep.description}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            <div className="lg:col-span-6 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="titan-debug-bundle-json"
                  className="font-medium text-slate-700 dark:text-slate-300"
                >
                  JSON-снимок GET /api/debug/bundle (вставьте дамп с PS5 :8097)
                </label>
                <button
                  type="button"
                  onClick={() => handleAnalyzeBundle(JSON.stringify(SAMPLE_TITAN_DEBUG_BUNDLE, null, 2))}
                  className="text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Сбросить пример
                </button>
              </div>
              <textarea
                id="titan-debug-bundle-json"
                rows={9}
                value={bundleText}
                onChange={(e) => handleAnalyzeBundle(e.target.value)}
                className="w-full p-2.5 text-[11px] font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              {parseError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                  {parseError}
                </p>
              )}
            </div>

            <div className="lg:col-span-6 space-y-2">
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Автоматический разбор памяти, ошибок и unionfs-графа:
              </div>
              {findings.map((item) => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-lg border space-y-1 ${SEVERITY_STYLE_MAP[item.severity]}`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {SEVERITY_ICON_MAP[item.severity]}
                    <span>
                      {item.area}: {item.summary}
                    </span>
                  </div>
                  <div className="text-[11px] opacity-90">{item.recommendation}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
