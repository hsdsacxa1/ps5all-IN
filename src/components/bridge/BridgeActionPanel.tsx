import React, { useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw, Send, Terminal } from 'lucide-react';
import {
  BridgeActionLogEntry,
  BridgeEndpointSpec,
  Ps5ProcessEntry,
} from '../../types/bridge';
import {
  ACTION_CATEGORY_META,
  BRIDGE_ENDPOINT_CATALOG,
} from '../../bridge/bridgeCatalog';
import {
  BUILT_ELF_ARTIFACTS,
  BuiltElfArtifactId,
  BuiltElfDiskInfo,
  DEFAULT_BUILT_ELF_ID,
  resolveBuiltElfArtifact,
} from '../../bridge/builtElfCatalog';
import { fetchBuiltElfCatalog } from '../../bridge/bridgeClient';
import {
  substituteBodyTemplate,
  substituteConsolePath,
} from '../../bridge/bridgeRegistry';

interface BridgeActionPanelProps {
  connected: boolean;
  consoleHost: string;
  elfldrPort: number;
  processes: Ps5ProcessEntry[];
  actionLogs: BridgeActionLogEntry[];
  onPushBuiltElf: (artifactId: BuiltElfArtifactId) => void;
  onRescanSmp: () => void;
  onRunEndpoint: (
    spec: BridgeEndpointSpec,
    resolvedPath: string,
    parsedBody: unknown
  ) => void;
  lastResponseJson: string | null;
}

export const BridgeActionPanel: React.FC<BridgeActionPanelProps> = ({
  connected,
  consoleHost,
  elfldrPort,
  processes,
  actionLogs,
  onPushBuiltElf,
  onRescanSmp,
  onRunEndpoint,
  lastResponseJson,
}) => {
  const [selectedArtifactId, setSelectedArtifactId] =
    useState<BuiltElfArtifactId>(DEFAULT_BUILT_ELF_ID);
  const [diskArtifacts, setDiskArtifacts] = useState<BuiltElfDiskInfo[]>([]);

  useEffect(() => {
    let active = true;
    fetchBuiltElfCatalog()
      .then((items) => {
        if (active) setDiskArtifacts(items);
      })
      .catch(() => {
        // Fallback to static spec metadata if offline
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedElfSpec = resolveBuiltElfArtifact(selectedArtifactId);
  const selectedElfDisk = diskArtifacts.find((d) => d.id === selectedArtifactId);

  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(
    BRIDGE_ENDPOINT_CATALOG[0].id
  );
  const selectedSpec = useMemo(
    () =>
      BRIDGE_ENDPOINT_CATALOG.find((e) => e.id === selectedEndpointId) ??
      BRIDGE_ENDPOINT_CATALOG[0],
    [selectedEndpointId]
  );

  const [bodyDraft, setBodyDraft] = useState<string>(() =>
    selectedSpec.defaultBody
      ? JSON.stringify(
          substituteBodyTemplate(selectedSpec.defaultBody, consoleHost),
          null,
          2
        )
      : ''
  );
  const [bodyError, setBodyError] = useState<string | null>(null);

  const handleSelectEndpoint = (spec: BridgeEndpointSpec) => {
    setSelectedEndpointId(spec.id);
    setBodyError(null);
    setBodyDraft(
      spec.defaultBody
        ? JSON.stringify(
            substituteBodyTemplate(spec.defaultBody, consoleHost),
            null,
            2
          )
        : ''
    );
  };

  const handleTriggerEndpoint = () => {
    setBodyError(null);
    let parsedBody: unknown = undefined;
    if (selectedSpec.method !== 'GET' && bodyDraft.trim()) {
      try {
        parsedBody = JSON.parse(bodyDraft);
      } catch {
        setBodyError('Некорректный JSON в теле запроса.');
        return;
      }
    }
    const resolvedPath = substituteConsolePath(
      selectedSpec.pathTemplate,
      consoleHost
    );
    onRunEndpoint(selectedSpec, resolvedPath, parsedBody);
  };

  const categoryMeta = ACTION_CATEGORY_META[selectedSpec.category];

  return (
    <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Payload Deployment & Live Processes */}
      <div className="xl:col-span-5 space-y-5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">
              Отправка собранного ELF на PS5
            </h3>
            <p className="text-xs text-slate-400">
              Передача локально скомпилированного <span className="font-mono text-slate-200">{selectedElfSpec.id}</span> на порт <span className="font-mono text-slate-200">{elfldrPort}</span> через мост ps5upload (с подтверждением).
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="bridge-built-elf-select"
              className="block text-xs font-medium text-slate-300"
            >
              Выбор ELF-артефакта из public/builds/
            </label>
            <select
              id="bridge-built-elf-select"
              value={selectedArtifactId}
              onChange={(e) =>
                setSelectedArtifactId(e.target.value as BuiltElfArtifactId)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
            >
              {BUILT_ELF_ARTIFACTS.map((item) => {
                const disk = diskArtifacts.find((d) => d.id === item.id);
                const sizeHint = disk?.exists
                  ? ` (${(disk.sizeBytes / (1024 * 1024)).toFixed(2)} MiB)`
                  : '';
                return (
                  <option key={item.id} value={item.id}>
                    {item.id}
                    {sizeHint} — {item.shortTag}
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {selectedElfSpec.summary}
              {selectedElfDisk?.sha256
                ? ` · SHA-256: ${selectedElfDisk.sha256.slice(0, 16)}…`
                : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!connected}
              onClick={() => onPushBuiltElf(selectedArtifactId)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="h-4 w-4" />
              Отправить {selectedElfSpec.shortTag}
            </button>

            <button
              type="button"
              disabled={!connected}
              onClick={onRescanSmp}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
              Rescan ShadowMountPlus
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Активные процессы PS5 ({processes.length})
            </h3>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <div className="max-h-56 overflow-auto rounded-lg border border-slate-800 bg-slate-950/60 divide-y divide-slate-800/70">
            {processes.length === 0 ? (
              <div className="p-3 text-xs text-slate-500">
                Список процессов не загружен или консоль недоступна.
              </div>
            ) : (
              processes.slice(0, 40).map((proc) => (
                <div
                  key={`${proc.pid}-${proc.name}`}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-mono"
                >
                  <span className="text-slate-200 truncate">{proc.name}</span>
                  <span className="text-slate-500 tabular-nums shrink-0">
                    PID {proc.pid}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right: Curated PS5Upload API Console & Action History */}
      <div className="xl:col-span-7 rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-blue-400" />
            <h3 className="text-base font-semibold text-white">
              Диагностический вызов API моста
            </h3>
          </div>
          <span className={`text-xs font-medium ${categoryMeta.textClass}`}>
            {categoryMeta.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {BRIDGE_ENDPOINT_CATALOG.map((spec) => (
            <button
              key={spec.id}
              type="button"
              onClick={() => handleSelectEndpoint(spec)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedSpec.id === spec.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {spec.label}
            </button>
          ))}
        </div>

        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            <span className="text-sky-400">
              {selectedSpec.method}{' '}
              {substituteConsolePath(selectedSpec.pathTemplate, consoleHost)}
            </span>
          </div>
          <p className="text-xs text-slate-400">{selectedSpec.description}</p>
        </div>

        {selectedSpec.method !== 'GET' && (
          <div className="space-y-1.5">
            <label
              htmlFor="bridge-json-body"
              className="block text-xs font-medium text-slate-300"
            >
              JSON тело запроса
            </label>
            <textarea
              id="bridge-json-body"
              rows={4}
              value={bodyDraft}
              onChange={(e) => setBodyDraft(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
            />
            {bodyError && <p className="text-xs text-rose-400">{bodyError}</p>}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={!connected}
            onClick={handleTriggerEndpoint}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            {categoryMeta.requiresConfirm
              ? 'Подготовить и подтвердить'
              : 'Выполнить запрос'}
          </button>
          <span className="text-xs text-slate-500 font-mono">
            Проксирование без CORS через /api/bridge/proxy
          </span>
        </div>

        {lastResponseJson && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-300">
              Ответ моста
            </div>
            <pre className="max-h-56 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200 whitespace-pre-wrap break-all">
              {lastResponseJson}
            </pre>
          </div>
        )}

        {actionLogs.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-medium text-slate-400">
              Журнал операций сессии
            </div>
            <div className="max-h-36 overflow-auto space-y-1 font-mono text-xs">
              {actionLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 text-slate-400"
                >
                  <span className="truncate">
                    [{entry.timestamp}] {entry.action} — {entry.summary}
                  </span>
                  <span
                    className={`shrink-0 ${entry.ok ? 'text-emerald-400' : 'text-rose-400'}`}
                  >
                    HTTP {entry.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
