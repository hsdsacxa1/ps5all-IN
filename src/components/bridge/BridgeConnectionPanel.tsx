import React from 'react';
import { Link2, RefreshCw, Terminal } from 'lucide-react';
import {
  BridgeConnectionStatus,
  BridgeEngineVersion,
  Ps5ConsoleEntry,
} from '../../types/bridge';
import {
  DEFAULT_TUNNEL_PRESET_URL,
} from '../../bridge/bridgeCatalog';
import { ParsedBridgeInput } from '../../bridge/bridgeUrlValidator';

interface BridgeConnectionPanelProps {
  rawInput: string;
  parsedInput: ParsedBridgeInput;
  status: BridgeConnectionStatus;
  errorMessage: string | null;
  latencyMs: number | null;
  engineVersion: BridgeEngineVersion | null;
  consoles: Ps5ConsoleEntry[];
  selectedConsoleHost: string;
  elfldrPort: number;
  onChangeRawInput: (value: string) => void;
  onSelectConsoleHost: (host: string) => void;
  onChangeElfldrPort: (port: number) => void;
  onConnect: () => void;
  onRefreshOverview: () => void;
}

const STATUS_BADGE_MAP: Record<
  BridgeConnectionStatus,
  { label: string; textClass: string }
> = {
  disconnected: { label: 'Не подключено', textClass: 'text-slate-400' },
  connecting: { label: 'Подключение...', textClass: 'text-sky-400' },
  connected: { label: 'Мост активен', textClass: 'text-emerald-400' },
  error: { label: 'Ошибка связи', textClass: 'text-rose-400' },
};

export const BridgeConnectionPanel: React.FC<BridgeConnectionPanelProps> = ({
  rawInput,
  parsedInput,
  status,
  errorMessage,
  latencyMs,
  engineVersion,
  consoles,
  selectedConsoleHost,
  elfldrPort,
  onChangeRawInput,
  onSelectConsoleHost,
  onChangeElfldrPort,
  onConnect,
  onRefreshOverview,
}) => {
  const statusMeta = STATUS_BADGE_MAP[status];

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
            <span className={statusMeta.textClass}>{statusMeta.label}</span>
            {engineVersion?.version && (
              <>
                <span aria-hidden="true">·</span>
                <span>ps5upload v{engineVersion.version}</span>
              </>
            )}
            {latencyMs !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{latencyMs} ms</span>
              </>
            )}
            {parsedInput.valid && parsedInput.extractedFromLog && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-sky-400">URL извлечён из лога cloudflared</span>
              </>
            )}
          </div>
          <h2 className="text-lg font-semibold text-white">
            Подключение к PS5 через PS5Upload Bridge
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onChangeRawInput(DEFAULT_TUNNEL_PRESET_URL)}
            className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            Туннель из сессии
          </button>
          <button
            type="button"
            onClick={() => onChangeRawInput('http://127.0.0.1:19113')}
            className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            Локальный 19113
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-6 space-y-1.5">
          <label
            htmlFor="bridge-url-input"
            className="block text-xs font-medium text-slate-300"
          >
            URL моста или полный вывод команды cloudflared
          </label>
          <div className="relative">
            <Terminal className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <textarea
              id="bridge-url-input"
              rows={2}
              value={rawInput}
              onChange={(e) => onChangeRawInput(e.target.value)}
              placeholder="https://....trycloudflare.com или вставьте весь лог cloudflared tunnel --url http://127.0.0.1:19113"
              className="w-full h-[52px] rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none resize-y"
            />
          </div>
        </div>

        <div className="lg:col-span-3 space-y-1.5">
          <label
            htmlFor="console-host-select"
            className="block text-xs font-medium text-slate-300"
          >
            Целевая PS5 (addr / host)
          </label>
          {consoles.length > 0 ? (
            <select
              id="console-host-select"
              value={selectedConsoleHost}
              onChange={(e) => onSelectConsoleHost(e.target.value)}
              className="w-full h-[52px] rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              {consoles.map((c) => {
                const displayName = c.name.includes(c.host)
                  ? c.name
                  : `${c.name} (${c.host})`;
                return (
                  <option key={c.id || c.host} value={c.host}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              id="console-host-select"
              type="text"
              value={selectedConsoleHost}
              onChange={(e) => onSelectConsoleHost(e.target.value)}
              placeholder="192.168.50.14"
              className="w-full h-[52px] rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          )}
        </div>

        <div className="lg:col-span-1 space-y-1.5">
          <label
            htmlFor="elfldr-port-input"
            className="block text-xs font-medium text-slate-300"
          >
            elfldr
          </label>
          <input
            id="elfldr-port-input"
            type="number"
            value={elfldrPort}
            onChange={(e) => onChangeElfldrPort(Number(e.target.value) || 9021)}
            className="w-full h-[52px] rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-xs tabular-nums text-slate-100 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="lg:col-span-2 space-y-1.5">
          <span className="hidden lg:block text-xs font-medium text-transparent select-none">
            Действие
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onConnect}
              disabled={!parsedInput.valid || status === 'connecting'}
              className="flex-1 inline-flex items-center justify-center gap-2 h-[52px] px-4 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Link2 className="h-4 w-4" />
              {status === 'connecting' ? 'Связь...' : 'Подключить'}
            </button>
            <button
              type="button"
              onClick={onRefreshOverview}
              disabled={status !== 'connected'}
              title="Обновить телеметрию PS5"
              aria-label="Обновить телеметрию PS5"
              className="inline-flex items-center justify-center h-[52px] w-[52px] rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 transition-colors shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {parsedInput.valid ? (
        <p className="font-mono text-xs text-slate-400 truncate">
          Цель прокси: {parsedInput.normalizedUrl}
        </p>
      ) : (
        <p className="text-xs text-amber-400">{parsedInput.reason}</p>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200"
        >
          {errorMessage}
        </div>
      )}
    </section>
  );
};
