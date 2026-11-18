import React, { useEffect, useMemo, useState } from 'react';
import {
  BridgeActionLogEntry,
  BridgeConnectionStatus,
  BridgeConsoleOverview,
  BridgeEndpointSpec,
  BridgeEngineVersion,
  Ps5ConsoleEntry,
  Ps5DirEntry,
  Ps5InstalledGame,
} from '../../types/bridge';
import { DEFAULT_TUNNEL_PRESET_URL } from '../../bridge/bridgeCatalog';
import {
  BuiltElfArtifactId,
  resolveBuiltElfArtifact,
} from '../../bridge/builtElfCatalog';
import { extractBridgeUrlFromText } from '../../bridge/bridgeUrlValidator';
import {
  executeBridgeProxyRequest,
  fetchConsoleOverview,
  listPs5Directory,
  probeBridge,
  pushBuiltElfToConsole,
  readPs5FilePreview,
} from '../../bridge/bridgeClient';
import {
  extractPreviewText,
  normalizeInstalledGames,
  normalizeProcessList,
} from '../../bridge/bridgeRegistry';
import { BridgeConnectionPanel } from './BridgeConnectionPanel';
import { ConsoleTelemetryGrid } from './ConsoleTelemetryGrid';
import { BridgeFileExplorerPanel } from './BridgeFileExplorerPanel';
import { BridgeActionPanel } from './BridgeActionPanel';
import { BridgeConfirmModal, PendingBridgeAction } from './BridgeConfirmModal';
import { AgentBusPanel } from './AgentBusPanel';
import {
  AgentBusInboxEntry,
  AgentBusMessageDraft,
  AgentBusSnapshot,
} from '../../types/agentBus';
import {
  acquireAgentBusLock,
  fetchAgentBusSnapshot,
  probeConsoleClock,
  publishAgentBusMessage,
  readAgentBusInboxDoc,
  reclaimStaleAgentBusLock,
  releaseAgentBusLock,
  renewAgentBusLock,
} from '../../bridge/agentBusClient';
import {
  AGENT_BUS_FEED_DIR,
  AGENT_BUS_LOCK_DIR,
} from '../../bridge/agentBusProtocol';

const STORAGE_BRIDGE_URL_KEY = 'prospero_ps5_bridge_url';
const STORAGE_CONSOLE_HOST_KEY = 'prospero_ps5_console_host';

export const Ps5BridgeView: React.FC = () => {
  const [rawInput, setRawInput] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_BRIDGE_URL_KEY) || DEFAULT_TUNNEL_PRESET_URL;
    } catch {
      return DEFAULT_TUNNEL_PRESET_URL;
    }
  });

  const parsedInput = useMemo(() => extractBridgeUrlFromText(rawInput), [rawInput]);

  const [status, setStatus] = useState<BridgeConnectionStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [engineVersion, setEngineVersion] = useState<BridgeEngineVersion | null>(null);
  const [consoles, setConsoles] = useState<Ps5ConsoleEntry[]>([]);

  const [selectedConsoleHost, setSelectedConsoleHost] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_CONSOLE_HOST_KEY) || '192.168.50.14';
    } catch {
      return '192.168.50.14';
    }
  });
  const [elfldrPort, setElfldrPort] = useState<number>(9021);

  const [overview, setOverview] = useState<BridgeConsoleOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState<boolean>(false);

  const [currentPath, setCurrentPath] = useState<string>('/data');
  const [dirEntries, setDirEntries] = useState<Ps5DirEntry[]>([]);
  const [dirLoading, setDirLoading] = useState<boolean>(false);
  const [dirError, setDirError] = useState<string | null>(null);

  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  const [lastResponseJson, setLastResponseJson] = useState<string | null>(null);
  const [actionLogs, setActionLogs] = useState<BridgeActionLogEntry[]>([]);

  const [pendingAction, setPendingAction] = useState<PendingBridgeAction | null>(null);
  const [actionBusy, setActionBusy] = useState<boolean>(false);

  const [agentBusSnapshot, setAgentBusSnapshot] = useState<AgentBusSnapshot | null>(null);
  const [agentBusLoading, setAgentBusLoading] = useState<boolean>(false);
  const [activeInboxPath, setActiveInboxPath] = useState<string | null>(null);
  const [inboxDocContent, setInboxDocContent] = useState<string | null>(null);
  const [inboxDocLoading, setInboxDocLoading] = useState<boolean>(false);

  useEffect(() => {
    if (parsedInput.valid) {
      try {
        localStorage.setItem(STORAGE_BRIDGE_URL_KEY, parsedInput.normalizedUrl);
      } catch {
        // Ignore storage errors in private mode
      }
    }
  }, [parsedInput]);

  useEffect(() => {
    if (selectedConsoleHost.trim()) {
      try {
        localStorage.setItem(STORAGE_CONSOLE_HOST_KEY, selectedConsoleHost.trim());
      } catch {
        // Ignore storage errors
      }
    }
  }, [selectedConsoleHost]);

  const appendLog = (entry: Omit<BridgeActionLogEntry, 'id' | 'timestamp'>) => {
    const now = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    setActionLogs((prev) => [
      { ...entry, id: `${Date.now()}-${Math.random()}`, timestamp: now },
      ...prev.slice(0, 29),
    ]);
  };

  const loadDirectory = async (bridgeUrl: string, consoleHost: string, dirPath: string) => {
    setDirLoading(true);
    setDirError(null);
    setCurrentPath(dirPath);
    try {
      const listing = await listPs5Directory(bridgeUrl, consoleHost, dirPath);
      setDirEntries(Array.isArray(listing?.entries) ? listing.entries : []);
    } catch (err) {
      setDirError(err instanceof Error ? err.message : 'Ошибка чтения каталога');
      setDirEntries([]);
    } finally {
      setDirLoading(false);
    }
  };

  const loadAgentBus = async (bridgeUrl: string, consoleHost: string) => {
    setAgentBusLoading(true);
    try {
      const snap = await fetchAgentBusSnapshot(bridgeUrl, consoleHost);
      setAgentBusSnapshot(snap);
    } finally {
      setAgentBusLoading(false);
    }
  };

  const loadOverviewAndFiles = async (bridgeUrl: string, consoleHost: string) => {
    setOverviewLoading(true);
    try {
      const data = await fetchConsoleOverview(bridgeUrl, consoleHost);
      setOverview(data);
      await Promise.all([
        loadDirectory(bridgeUrl, consoleHost, currentPath),
        loadAgentBus(bridgeUrl, consoleHost),
      ]);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Не удалось получить телеметрию PS5.'
      );
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!parsedInput.valid) return;
    setStatus('connecting');
    setErrorMessage(null);

    try {
      const probe = await probeBridge(parsedInput.normalizedUrl);
      if (!probe.ok) {
        setStatus('error');
        setLatencyMs(probe.latencyMs ?? null);
        setErrorMessage(
          probe.error ||
            'Мост ps5upload не отвечает. Проверьте, запущен ли cloudflared и ps5upload.'
        );
        return;
      }

      const discoveredConsoles = probe.consoles?.consoles ?? [];
      setConsoles(discoveredConsoles);
      setEngineVersion(probe.version ?? null);
      setLatencyMs(probe.latencyMs);
      setStatus('connected');

      const preferredHost =
        discoveredConsoles.find((c) => c.host === selectedConsoleHost)?.host ??
        discoveredConsoles.find((c) => c.host.startsWith('192.168.'))?.host ??
        discoveredConsoles[0]?.host ??
        selectedConsoleHost;

      setSelectedConsoleHost(preferredHost);
      appendLog({
        action: 'CONNECT',
        target: parsedInput.normalizedUrl,
        ok: true,
        status: 200,
        summary: `ps5upload v${probe.version?.version ?? '?'} · ${discoveredConsoles.length} консолей`,
      });

      await loadOverviewAndFiles(parsedInput.normalizedUrl, preferredHost);
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Сетевая ошибка при подключении к мосту.'
      );
    }
  };

  const handleConsoleChange = async (nextHost: string) => {
    setSelectedConsoleHost(nextHost);
    if (status === 'connected' && parsedInput.valid) {
      await loadOverviewAndFiles(parsedInput.normalizedUrl, nextHost);
    }
  };

  const handlePreviewFile = async (filePath: string) => {
    if (!parsedInput.valid) return;
    setPreviewPath(filePath);
    setPreviewLoading(true);
    try {
      const raw = await readPs5FilePreview(
        parsedInput.normalizedUrl,
        selectedConsoleHost,
        filePath
      );
      setPreviewContent(extractPreviewText(raw));
      appendLog({
        action: 'READ_FILE',
        target: filePath,
        ok: true,
        status: 200,
        summary: 'Прочитано через /api/ps5/fs/read-preview',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка чтения файла';
      setPreviewContent(`Ошибка: ${msg}`);
      appendLog({
        action: 'READ_FILE',
        target: filePath,
        ok: false,
        status: 500,
        summary: msg,
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const runConfirmedProxy = async (
    actionLabel: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown
  ) => {
    if (!parsedInput.valid) return;
    const res = await executeBridgeProxyRequest({
      bridgeUrl: parsedInput.normalizedUrl,
      method,
      path,
      body,
    });
    setLastResponseJson(JSON.stringify(res.data, null, 2));
    appendLog({
      action: actionLabel,
      target: path,
      ok: res.ok,
      status: res.status,
      summary: res.error || `${res.latencyMs} ms`,
    });
  };

  const handleRunEndpoint = (
    spec: BridgeEndpointSpec,
    resolvedPath: string,
    parsedBody: unknown
  ) => {
    if (spec.category === 'read') {
      void runConfirmedProxy(spec.label, spec.method, resolvedPath, parsedBody);
      return;
    }

    setPendingAction({
      title: spec.label,
      description: spec.description,
      category: spec.category,
      targetSummary: `${spec.method} ${resolvedPath}`,
      onConfirm: async () => {
        await runConfirmedProxy(spec.label, spec.method, resolvedPath, parsedBody);
      },
    });
  };

  const handleRequestPushBuiltElf = (artifactId: BuiltElfArtifactId) => {
    const spec = resolveBuiltElfArtifact(artifactId);
    setPendingAction({
      title: `Отправить ${spec.id} на PS5`,
      description: `Локальный payload public/builds/${spec.id} (${spec.shortTag}) будет отправлен через ps5upload на загрузчик elfldr вашей консоли.`,
      category: 'mutate',
      targetSummary: `POST /api/payload/send?host=${selectedConsoleHost}&port=${elfldrPort}`,
      onConfirm: async () => {
        const res = await pushBuiltElfToConsole({
          bridgeUrl: parsedInput.normalizedUrl,
          consoleAddr: selectedConsoleHost,
          port: elfldrPort,
          artifact: spec.id,
        });
        setLastResponseJson(JSON.stringify(res, null, 2));
        appendLog({
          action: 'PUSH_ELF',
          target: `${selectedConsoleHost}:${elfldrPort}`,
          ok: res.ok,
          status: res.status,
          summary: res.error || `${res.artifact} (${res.sizeBytes} bytes)`,
        });
      },
    });
  };

  const handleRequestRescanSmp = () => {
    const path = `/api/ps5/smp/rescan?addr=${encodeURIComponent(selectedConsoleHost)}`;
    setPendingAction({
      title: 'Пересканировать ShadowMountPlus',
      description:
        'Отправляет команду пересканирования каталогов монтирования (/data/homebrew, USB) на выбранную PS5.',
      category: 'mutate',
      targetSummary: `POST ${path}`,
      onConfirm: async () => {
        await runConfirmedProxy('SMP_RESCAN', 'POST', path, {});
        await loadOverviewAndFiles(parsedInput.normalizedUrl, selectedConsoleHost);
      },
    });
  };

  const handleRequestLaunchGame = (game: Ps5InstalledGame) => {
    setPendingAction({
      title: `Запустить ${game.title || game.title_id}`,
      description:
        'Вызовет /api/ps5/app/launch на PS5 для запуска выбранного тайтла через sceLncUtilLaunchApp.',
      category: 'mutate',
      targetSummary: `POST /api/ps5/app/launch { addr: "${selectedConsoleHost}", title_id: "${game.title_id}" }`,
      onConfirm: async () => {
        await runConfirmedProxy('LAUNCH_APP', 'POST', '/api/ps5/app/launch', {
          addr: selectedConsoleHost,
          title_id: game.title_id,
        });
      },
    });
  };

  const handleProceedConfirm = async () => {
    if (!pendingAction) return;
    setActionBusy(true);
    try {
      await pendingAction.onConfirm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка выполнения';
      setLastResponseJson(JSON.stringify({ ok: false, error: msg }, null, 2));
    } finally {
      setActionBusy(false);
      setPendingAction(null);
    }
  };

  const handleProbeClock = async () => {
    if (!parsedInput.valid) return;
    try {
      const clockTs = await probeConsoleClock(parsedInput.normalizedUrl, selectedConsoleHost);
      appendLog({
        action: 'BUS_CLOCK',
        target: '/data/agent_bus/.clock',
        ok: true,
        status: 200,
        summary: `Часы консоли: ${clockTs ?? 'ok'}`,
      });
      await loadAgentBus(parsedInput.normalizedUrl, selectedConsoleHost);
    } catch (err) {
      appendLog({
        action: 'BUS_CLOCK',
        target: '/data/agent_bus/.clock',
        ok: false,
        status: 500,
        summary: err instanceof Error ? err.message : 'Ошибка пробы часов',
      });
    }
  };

  const handleOpenInboxDoc = async (doc: AgentBusInboxEntry) => {
    if (!parsedInput.valid) return;
    setActiveInboxPath(doc.path);
    setInboxDocLoading(true);
    try {
      const content = await readAgentBusInboxDoc(
        parsedInput.normalizedUrl,
        selectedConsoleHost,
        doc.path
      );
      setInboxDocContent(content);
      appendLog({
        action: 'BUS_INBOX',
        target: doc.path,
        ok: true,
        status: 200,
        summary: `Открыт документ (${doc.size} B)`,
      });
    } catch (err) {
      setInboxDocContent(
        `Ошибка чтения: ${err instanceof Error ? err.message : 'неизвестно'}`
      );
    } finally {
      setInboxDocLoading(false);
    }
  };

  const handleRequestAcquireLock = (holder: string, task: string) => {
    setPendingAction({
      title: 'Захватить атомарную блокировку (mkdir lock.d)',
      description:
        'Выполнит mkdir /data/agent_bus/lock.d через shell/run, инкрементирует epoch и запишет lock.d/meta.json + beat.',
      category: 'mutate',
      targetSummary: `POST /api/ps5/shell/run -> mkdir ${AGENT_BUS_LOCK_DIR}`,
      onConfirm: async () => {
        const nextEpoch = await acquireAgentBusLock(
          parsedInput.normalizedUrl,
          selectedConsoleHost,
          { holder, task }
        );
        appendLog({
          action: 'BUS_LOCK',
          target: AGENT_BUS_LOCK_DIR,
          ok: true,
          status: 200,
          summary: `Захвачено (${holder}, epoch ${nextEpoch})`,
        });
        await loadAgentBus(parsedInput.normalizedUrl, selectedConsoleHost);
      },
    });
  };

  const handleRequestRenewBeat = () => {
    setPendingAction({
      title: 'Продлить heartbeat блокировки (touch beat)',
      description:
        'Обновит время модификации /data/agent_bus/lock.d/beat и .clock на PS5, чтобы другой агент видел активную работу.',
      category: 'mutate',
      targetSummary: `POST /api/ps5/shell/run -> touch ${AGENT_BUS_LOCK_DIR}/beat`,
      onConfirm: async () => {
        await renewAgentBusLock(parsedInput.normalizedUrl, selectedConsoleHost);
        appendLog({
          action: 'BUS_BEAT',
          target: `${AGENT_BUS_LOCK_DIR}/beat`,
          ok: true,
          status: 200,
          summary: 'Heartbeat обновлён',
        });
        await loadAgentBus(parsedInput.normalizedUrl, selectedConsoleHost);
      },
    });
  };

  const handleRequestReleaseLock = (mode: 'mkdir-v2' | 'legacy-file') => {
    setPendingAction({
      title: 'Снять блокировку шины агентов (rm -rf lock.d)',
      description:
        mode === 'legacy-file'
          ? 'Удалит устаревший /data/agent_bus/lock.json на PS5.'
          : 'Удалит /data/agent_bus/lock.d (вместе с beat и meta.json) через shell/run rm -rf.',
      category: 'destructive',
      targetSummary:
        mode === 'legacy-file'
          ? 'POST /api/ps5/fs/delete -> /data/agent_bus/lock.json'
          : `POST /api/ps5/shell/run -> rm -rf ${AGENT_BUS_LOCK_DIR}`,
      onConfirm: async () => {
        await releaseAgentBusLock(parsedInput.normalizedUrl, selectedConsoleHost, mode);
        appendLog({
          action: 'BUS_UNLOCK',
          target: AGENT_BUS_LOCK_DIR,
          ok: true,
          status: 200,
          summary: 'Блокировка снята',
        });
        await loadAgentBus(parsedInput.normalizedUrl, selectedConsoleHost);
      },
    });
  };

  const handleRequestReclaimStale = () => {
    setPendingAction({
      title: 'Перехватить просроченный lock.d (mv lock.stale)',
      description:
        'Атомарно переименует /data/agent_bus/lock.d в lock.stale.<id> через shell/run mv (ровно один победитель).',
      category: 'destructive',
      targetSummary: `POST /api/ps5/shell/run -> mv ${AGENT_BUS_LOCK_DIR} /data/agent_bus/lock.stale.*`,
      onConfirm: async () => {
        const stalePath = await reclaimStaleAgentBusLock(
          parsedInput.normalizedUrl,
          selectedConsoleHost
        );
        appendLog({
          action: 'BUS_RECLAIM',
          target: stalePath,
          ok: true,
          status: 200,
          summary: `Перехвачено в ${stalePath}`,
        });
        await loadAgentBus(parsedInput.normalizedUrl, selectedConsoleHost);
      },
    });
  };

  const handleRequestPublishMessage = (draft: AgentBusMessageDraft) => {
    setPendingAction({
      title: `Отправить сообщение в сегментную ленту (${draft.from} → ${draft.to})`,
      description:
        'Запишет отдельный неизменяемый JSON-файл в /data/agent_bus/feed/<agent>/<epoch>-<uuid>.json (без гонок перезаписи).',
      category: 'mutate',
      targetSummary: `POST /api/ps5/fs/write-bytes -> ${AGENT_BUS_FEED_DIR}/...`,
      onConfirm: async () => {
        const writtenPath = await publishAgentBusMessage(
          parsedInput.normalizedUrl,
          selectedConsoleHost,
          draft
        );
        appendLog({
          action: 'BUS_MSG',
          target: writtenPath,
          ok: true,
          status: 200,
          summary: `${draft.from} -> ${draft.to}: ${draft.summary.slice(0, 48)}`,
        });
        await loadAgentBus(parsedInput.normalizedUrl, selectedConsoleHost);
      },
    });
  };

  const games = normalizeInstalledGames(overview?.sections.games?.data);
  const processes = normalizeProcessList(overview?.sections.processes?.data);

  return (
    <div className="space-y-6">
      <BridgeConnectionPanel
        rawInput={rawInput}
        parsedInput={parsedInput}
        status={status}
        errorMessage={errorMessage}
        latencyMs={latencyMs}
        engineVersion={engineVersion}
        consoles={consoles}
        selectedConsoleHost={selectedConsoleHost}
        elfldrPort={elfldrPort}
        onChangeRawInput={setRawInput}
        onSelectConsoleHost={(h) => void handleConsoleChange(h)}
        onChangeElfldrPort={setElfldrPort}
        onConnect={() => void handleConnect()}
        onRefreshOverview={() =>
          parsedInput.valid
            ? void loadOverviewAndFiles(parsedInput.normalizedUrl, selectedConsoleHost)
            : undefined
        }
      />

      <ConsoleTelemetryGrid overview={overview} loading={overviewLoading} />

      <AgentBusPanel
        connected={status === 'connected'}
        bridgeUrl={parsedInput.normalizedUrl || ''}
        consoleHost={selectedConsoleHost}
        snapshot={agentBusSnapshot}
        loading={agentBusLoading}
        activeInboxPath={activeInboxPath}
        inboxDocContent={inboxDocContent}
        inboxDocLoading={inboxDocLoading}
        onRefresh={() =>
          parsedInput.valid
            ? void loadAgentBus(parsedInput.normalizedUrl, selectedConsoleHost)
            : undefined
        }
        onProbeClock={() => void handleProbeClock()}
        onRequestAcquireLock={handleRequestAcquireLock}
        onRequestRenewBeat={handleRequestRenewBeat}
        onRequestReleaseLock={handleRequestReleaseLock}
        onRequestReclaimStale={handleRequestReclaimStale}
        onRequestPublishMessage={handleRequestPublishMessage}
        onOpenInboxDoc={(doc) => void handleOpenInboxDoc(doc)}
        onCloseInboxDoc={() => {
          setActiveInboxPath(null);
          setInboxDocContent(null);
        }}
      />

      <BridgeFileExplorerPanel
        connected={status === 'connected'}
        currentPath={currentPath}
        dirEntries={dirEntries}
        dirLoading={dirLoading}
        dirError={dirError}
        previewPath={previewPath}
        previewContent={previewContent}
        previewLoading={previewLoading}
        games={games}
        onBrowseDir={(dir) =>
          parsedInput.valid
            ? void loadDirectory(parsedInput.normalizedUrl, selectedConsoleHost, dir)
            : undefined
        }
        onPreviewFile={(file) => void handlePreviewFile(file)}
        onRequestLaunchGame={handleRequestLaunchGame}
      />

      <BridgeActionPanel
        connected={status === 'connected'}
        consoleHost={selectedConsoleHost}
        elfldrPort={elfldrPort}
        processes={processes}
        actionLogs={actionLogs}
        onPushBuiltElf={handleRequestPushBuiltElf}
        onRescanSmp={handleRequestRescanSmp}
        onRunEndpoint={handleRunEndpoint}
        lastResponseJson={lastResponseJson}
      />

      <BridgeConfirmModal
        pending={pendingAction}
        busy={actionBusy}
        onCancel={() => (!actionBusy ? setPendingAction(null) : undefined)}
        onProceed={() => void handleProceedConfirm()}
      />
    </div>
  );
};
