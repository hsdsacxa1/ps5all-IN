import {
  AgentBusInboxEntry,
  AgentBusLock,
  AgentBusMessage,
  AgentBusMessageDraft,
  AgentBusSnapshot,
} from '../types/agentBus';
import {
  AGENT_BUS_CLOCK_PATH,
  AGENT_BUS_EPOCH_PATH,
  AGENT_BUS_FEED_DIR,
  AGENT_BUS_LOCK_BEAT_PATH,
  AGENT_BUS_LOCK_DIR,
  AGENT_BUS_LOCK_META_PATH,
  AGENT_BUS_LOCK_PATH,
  assertWithinWriteBytesLimit,
  buildSegmentedFeedPayload,
  encodeUtf8ToBase64,
  mergeSegmentedMessages,
  normalizeBusMessage,
  parseAgentBusFeed,
  parseAgentBusLock,
  parseEpochValue,
  sanitizeAgentSlug,
} from './agentBusProtocol';
import { executeBridgeProxyRequest } from './bridgeClient';
import { extractPreviewText } from './bridgeRegistry';

interface ServerBusFilePayload {
  exists: boolean;
  data: unknown;
}

interface ServerSegmentedFilePayload {
  agent: string;
  path: string;
  exists: boolean;
  data: unknown;
}

interface ServerLockDirPayload {
  exists: boolean;
  entries?: Array<{ name: string; kind: string; size?: number; mtime?: number }>;
  meta?: ServerBusFilePayload | null;
  beatMtime?: number;
}

interface ServerBusSnapshotResponse {
  ok: boolean;
  dirExists?: boolean;
  epochData?: ServerBusFilePayload;
  consoleClockMtime?: number;
  lockDir?: ServerLockDirPayload;
  staleLocks?: string[];
  segmentedFeedFiles?: ServerSegmentedFilePayload[];
  inbox?: AgentBusInboxEntry[];
  legacyLock?: ServerBusFilePayload;
  legacyFeed?: ServerBusFilePayload;
  fetchedAt?: string;
  error?: string;
}

interface ShellRunResponseData {
  exit_code?: number;
  timed_out?: boolean;
  stdout?: string;
  err?: string | null;
}

async function readSnapshotFromProxy(
  bridgeUrl: string,
  consoleAddr: string
): Promise<ServerBusSnapshotResponse> {
  const response = await fetch('/api/bridge/agent-bus/snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bridgeUrl, consoleAddr }),
  });
  const payload = (await response.json()) as ServerBusSnapshotResponse;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

async function runPs5ShellCmd(
  bridgeUrl: string,
  consoleAddr: string,
  cmd: string,
  timeoutS = 10
): Promise<{ ok: boolean; status: number; data: ShellRunResponseData; error?: string }> {
  const res = await executeBridgeProxyRequest({
    bridgeUrl,
    method: 'POST',
    path: '/api/ps5/shell/run',
    body: {
      addr: consoleAddr,
      cmd,
      timeout_s: timeoutS,
    },
  });
  const data = (res.data ?? {}) as ShellRunResponseData;
  const exitOk = res.ok && (data.exit_code === undefined || data.exit_code === 0);
  return {
    ok: exitOk,
    status: res.status,
    data,
    error: res.error || data.err || undefined,
  };
}

async function writeSmallBusFile(
  bridgeUrl: string,
  consoleAddr: string,
  filePath: string,
  text: string
): Promise<void> {
  assertWithinWriteBytesLimit(text);
  const res = await executeBridgeProxyRequest({
    bridgeUrl,
    method: 'POST',
    path: '/api/ps5/fs/write-bytes',
    body: {
      addr: consoleAddr,
      path: filePath,
      bytes_b64: encodeUtf8ToBase64(text),
      create_only: false,
    },
  });
  if (!res.ok) {
    throw new Error(res.error || `Ошибка записи ${filePath} (HTTP ${res.status}).`);
  }
}

export async function ensureAgentBusDir(
  bridgeUrl: string,
  consoleAddr: string,
  extraPaths: string[] = []
): Promise<void> {
  const response = await fetch('/api/bridge/agent-bus/ensure-dir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bridgeUrl, consoleAddr, paths: extraPaths }),
  });
  const payload = (await response.json()) as { ok?: boolean; error?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `Не удалось создать каталоги AgentBus (HTTP ${response.status}).`);
  }
}

export async function fetchAgentBusSnapshot(
  bridgeUrl: string,
  consoleAddr: string
): Promise<AgentBusSnapshot> {
  const payload = await readSnapshotFromProxy(bridgeUrl, consoleAddr);
  const epochText = payload.epochData?.exists ? extractPreviewText(payload.epochData.data) : '';
  const epoch = parseEpochValue(epochText);
  const consoleClockMtime = payload.consoleClockMtime;

  let lock: AgentBusLock | null = null;
  if (payload.lockDir?.exists) {
    const metaText = payload.lockDir.meta?.exists
      ? extractPreviewText(payload.lockDir.meta.data)
      : '';
    const parsedMeta = parseAgentBusLock(metaText);
    const beatMtime = payload.lockDir.beatMtime;
    const ageSeconds =
      typeof consoleClockMtime === 'number' && typeof beatMtime === 'number'
        ? Math.max(0, consoleClockMtime - beatMtime)
        : undefined;

    lock = parsedMeta
      ? {
          ...parsedMeta,
          mode: 'mkdir-v2',
          beatMtime,
          clockMtime: consoleClockMtime,
          ageSeconds,
        }
      : {
          mode: 'mkdir-v2',
          holder: 'Agent (lock.d)',
          task: 'Активная блокировка без meta.json',
          acquiredAt:
            typeof beatMtime === 'number'
              ? new Date(beatMtime * 1000).toISOString()
              : new Date().toISOString(),
          epoch,
          beatMtime,
          clockMtime: consoleClockMtime,
          ageSeconds,
        };
  } else if (payload.legacyLock?.exists) {
    lock = parseAgentBusLock(extractPreviewText(payload.legacyLock.data));
  }

  const segmentedMessages: AgentBusMessage[] = [];
  for (const item of payload.segmentedFeedFiles ?? []) {
    try {
      const rawText = extractPreviewText(item.data);
      const parsedJson = JSON.parse(rawText) as unknown;
      const normalized = normalizeBusMessage(parsedJson, item.path);
      if (normalized) segmentedMessages.push(normalized);
    } catch {
      // Skip malformed segmented JSON without breaking feed
    }
  }

  const legacyFeedText = payload.legacyFeed?.exists
    ? extractPreviewText(payload.legacyFeed.data)
    : '';
  const legacyMessages = legacyFeedText ? parseAgentBusFeed(legacyFeedText).messages : [];

  const mergedFeed = mergeSegmentedMessages([...segmentedMessages, ...legacyMessages]);
  const isV2 =
    Boolean(payload.epochData?.exists) ||
    Boolean(payload.lockDir?.exists) ||
    segmentedMessages.length > 0 ||
    (payload.inbox?.length ?? 0) > 0;

  return {
    initialized: Boolean(
      payload.dirExists &&
        (isV2 || lock !== null || mergedFeed.messages.length > 0)
    ),
    protocolVersion: isV2 ? 2 : 1,
    epoch,
    consoleClockMtime,
    lock,
    staleLocks: payload.staleLocks ?? [],
    feed: {
      ...mergedFeed,
      schemaVersion: isV2 ? 2 : 1,
    },
    inbox: payload.inbox ?? [],
    fetchedAt: payload.fetchedAt ?? new Date().toISOString(),
  };
}

export async function probeConsoleClock(
  bridgeUrl: string,
  consoleAddr: string
): Promise<number | undefined> {
  await ensureAgentBusDir(bridgeUrl, consoleAddr);
  await runPs5ShellCmd(bridgeUrl, consoleAddr, `touch ${AGENT_BUS_CLOCK_PATH}`);
  const statRes = await executeBridgeProxyRequest({
    bridgeUrl,
    method: 'POST',
    path: '/api/ps5/fs/stat',
    body: { addr: consoleAddr, path: AGENT_BUS_CLOCK_PATH },
  });
  const mtime = (statRes.data as { mtime?: unknown } | undefined)?.mtime;
  return typeof mtime === 'number' ? mtime : undefined;
}

export async function acquireAgentBusLock(
  bridgeUrl: string,
  consoleAddr: string,
  lockInput: { holder: string; task: string }
): Promise<number> {
  await ensureAgentBusDir(bridgeUrl, consoleAddr);
  const currentSnap = await readSnapshotFromProxy(bridgeUrl, consoleAddr);
  const currentEpoch = parseEpochValue(
    currentSnap.epochData?.exists ? extractPreviewText(currentSnap.epochData.data) : ''
  );

  const mkdirRes = await runPs5ShellCmd(
    bridgeUrl,
    consoleAddr,
    `mkdir ${AGENT_BUS_LOCK_DIR}`
  );
  if (!mkdirRes.ok) {
    throw new Error(
      mkdirRes.error ||
        `Блокировка ${AGENT_BUS_LOCK_DIR} уже занята другим агентом (HTTP ${mkdirRes.status}).`
    );
  }

  const nextEpoch = currentEpoch + 1;
  await writeSmallBusFile(bridgeUrl, consoleAddr, AGENT_BUS_EPOCH_PATH, String(nextEpoch));

  const lockMeta: AgentBusLock = {
    mode: 'mkdir-v2',
    holder: lockInput.holder.trim() || 'Prospero-Studio',
    task: lockInput.task.trim() || 'Active task',
    acquiredAt: new Date().toISOString(),
    epoch: nextEpoch,
  };
  await writeSmallBusFile(
    bridgeUrl,
    consoleAddr,
    AGENT_BUS_LOCK_META_PATH,
    JSON.stringify(lockMeta, null, 2)
  );
  await runPs5ShellCmd(bridgeUrl, consoleAddr, `touch ${AGENT_BUS_LOCK_BEAT_PATH}`);
  return nextEpoch;
}

export async function renewAgentBusLock(
  bridgeUrl: string,
  consoleAddr: string
): Promise<void> {
  const touchRes = await runPs5ShellCmd(
    bridgeUrl,
    consoleAddr,
    `touch ${AGENT_BUS_LOCK_BEAT_PATH}`
  );
  if (!touchRes.ok) {
    throw new Error(
      touchRes.error || `Не удалось обновить heartbeat ${AGENT_BUS_LOCK_BEAT_PATH}.`
    );
  }
  await runPs5ShellCmd(bridgeUrl, consoleAddr, `touch ${AGENT_BUS_CLOCK_PATH}`);
}

export async function releaseAgentBusLock(
  bridgeUrl: string,
  consoleAddr: string,
  mode: 'mkdir-v2' | 'legacy-file' = 'mkdir-v2'
): Promise<void> {
  if (mode === 'legacy-file') {
    const res = await executeBridgeProxyRequest({
      bridgeUrl,
      method: 'POST',
      path: '/api/ps5/fs/delete',
      body: { addr: consoleAddr, path: AGENT_BUS_LOCK_PATH },
    });
    if (!res.ok) {
      throw new Error(res.error || `Не удалось удалить ${AGENT_BUS_LOCK_PATH}.`);
    }
    return;
  }

  const rmRes = await runPs5ShellCmd(
    bridgeUrl,
    consoleAddr,
    `rm -rf ${AGENT_BUS_LOCK_DIR}`
  );
  if (!rmRes.ok) {
    throw new Error(
      rmRes.error || `Не удалось снять блокировку ${AGENT_BUS_LOCK_DIR} (HTTP ${rmRes.status}).`
    );
  }
}

export async function reclaimStaleAgentBusLock(
  bridgeUrl: string,
  consoleAddr: string
): Promise<string> {
  const staleTag = `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`;
  const stalePath = `/data/agent_bus/lock.stale.${staleTag}`;
  const mvRes = await runPs5ShellCmd(
    bridgeUrl,
    consoleAddr,
    `mv ${AGENT_BUS_LOCK_DIR} ${stalePath}`
  );
  if (!mvRes.ok) {
    throw new Error(
      mvRes.error || `Не удалось перехватить lock.d (возможно, его уже снял/перехватил другой агент).`
    );
  }
  return stalePath;
}

export async function publishAgentBusMessage(
  bridgeUrl: string,
  consoleAddr: string,
  draft: AgentBusMessageDraft
): Promise<string> {
  const agentSlug = sanitizeAgentSlug(draft.from);
  const agentFeedDir = `${AGENT_BUS_FEED_DIR}/${agentSlug}`;
  await ensureAgentBusDir(bridgeUrl, consoleAddr, [agentFeedDir]);

  const snap = await readSnapshotFromProxy(bridgeUrl, consoleAddr);
  const epoch = parseEpochValue(
    snap.epochData?.exists ? extractPreviewText(snap.epochData.data) : ''
  );

  const { filename, jsonText } = buildSegmentedFeedPayload(draft, epoch);
  const targetPath = `${agentFeedDir}/${filename}`;
  await writeSmallBusFile(bridgeUrl, consoleAddr, targetPath, jsonText);
  return targetPath;
}

export async function readAgentBusInboxDoc(
  bridgeUrl: string,
  consoleAddr: string,
  docPath: string
): Promise<string> {
  const res = await executeBridgeProxyRequest({
    bridgeUrl,
    method: 'POST',
    path: '/api/ps5/fs/read-preview',
    body: {
      addr: consoleAddr,
      path: docPath,
      max_bytes: 262144,
    },
  });
  if (!res.ok) {
    throw new Error(res.error || `Ошибка чтения ${docPath} (HTTP ${res.status}).`);
  }
  return extractPreviewText(res.data);
}
