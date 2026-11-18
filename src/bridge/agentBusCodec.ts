import {
  AgentBusFeed,
  AgentBusLock,
  AgentBusMessage,
  AgentBusMessageDraft,
  AgentBusMessageStatus,
} from '../types/agentBus';

export const MAX_PS5_WRITE_BYTES = 256 * 1024;
const MAX_FEED_MESSAGES = 80;

export const AGENT_MESSAGE_STATUS_META: Record<
  AgentBusMessageStatus,
  { label: string; textClass: string }
> = {
  info: { label: 'Инфо', textClass: 'text-slate-300' },
  working: { label: 'В работе', textClass: 'text-sky-400' },
  done: { label: 'Готово', textClass: 'text-emerald-400' },
  blocked: { label: 'Блокер', textClass: 'text-rose-400' },
  handoff: { label: 'Передача', textClass: 'text-amber-400' },
};

const ARENA_KIND_TO_STATUS: Record<string, AgentBusMessageStatus> = {
  status: 'info',
  info: 'info',
  working: 'working',
  progress: 'working',
  done: 'done',
  completed: 'done',
  blocked: 'blocked',
  error: 'blocked',
  handoff: 'handoff',
};

export function encodeUtf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeBase64ToUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export function getUtf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function assertWithinWriteBytesLimit(text: string): void {
  const size = getUtf8ByteLength(text);
  if (size > MAX_PS5_WRITE_BYTES) {
    throw new Error(
      `Размер записи (${size} B) превышает лимит ps5upload write-bytes (${MAX_PS5_WRITE_BYTES} B). Перенесите документ в inbox/*.md частями или сократите текст.`
    );
  }
}

export function sanitizeAgentSlug(agentName: string): string {
  const cleaned = agentName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'agent';
}

export function formatPaddedEpoch(epoch: number): string {
  const normalized = Number.isFinite(epoch) && epoch > 0 ? Math.floor(epoch) : 1;
  return String(normalized).padStart(6, '0');
}

export function parseEpochValue(rawText: string | null | undefined): number {
  if (!rawText) return 1;
  const match = rawText.trim().match(/\d+/);
  if (!match) return 1;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parseShellStatMtime(stdout: string | null | undefined): number | undefined {
  if (!stdout) return undefined;
  const match = stdout.match(/\bmtime:\s*(\d+)/i);
  if (!match) return undefined;
  const val = Number.parseInt(match[1], 10);
  return Number.isFinite(val) ? val : undefined;
}

function normalizeTimestamp(rawTs: unknown, fallbackIso?: string): string {
  if (typeof rawTs === 'string' && rawTs.trim()) {
    return rawTs;
  }
  if (typeof rawTs === 'number' && Number.isFinite(rawTs)) {
    const ms = rawTs < 1e12 ? rawTs * 1000 : rawTs;
    return new Date(ms).toISOString();
  }
  return fallbackIso || new Date().toISOString();
}

export function normalizeBusMessage(
  raw: unknown,
  sourceFile?: string
): AgentBusMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const from = typeof obj.from === 'string' && obj.from.trim() ? obj.from.trim() : 'unknown';
  const summary =
    typeof obj.summary === 'string' && obj.summary.trim()
      ? obj.summary.trim()
      : typeof obj.text === 'string' && obj.text.trim()
        ? obj.text.trim()
        : '';

  if (!summary) return null;

  const rawStatus =
    typeof obj.status === 'string'
      ? obj.status.toLowerCase()
      : typeof obj.kind === 'string'
        ? obj.kind.toLowerCase()
        : 'info';
  const status: AgentBusMessageStatus = ARENA_KIND_TO_STATUS[rawStatus] ?? 'info';

  const filesTouchedRaw = Array.isArray(obj.filesTouched)
    ? obj.filesTouched
    : Array.isArray(obj.refs)
      ? obj.refs
      : undefined;
  const filesTouched = filesTouchedRaw?.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  );

  const epoch =
    typeof obj.epoch === 'number' && Number.isFinite(obj.epoch) ? obj.epoch : undefined;

  return {
    id:
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id
        : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    epoch,
    timestamp: normalizeTimestamp(obj.timestamp ?? obj.ts),
    from,
    to: typeof obj.to === 'string' && obj.to.trim() ? obj.to.trim() : 'all',
    status,
    summary,
    filesTouched: filesTouched && filesTouched.length > 0 ? filesTouched : undefined,
    nextStep: typeof obj.nextStep === 'string' && obj.nextStep.trim() ? obj.nextStep.trim() : undefined,
    sourceFile,
  };
}

export function parseAgentBusLock(rawText: string | null | undefined): AgentBusLock | null {
  if (!rawText || !rawText.trim()) return null;
  try {
    const parsed = JSON.parse(rawText) as Partial<AgentBusLock>;
    if (typeof parsed.holder === 'string' && typeof parsed.task === 'string') {
      return {
        mode: parsed.mode === 'mkdir-v2' ? 'mkdir-v2' : 'legacy-file',
        holder: parsed.holder,
        task: parsed.task,
        acquiredAt:
          typeof parsed.acquiredAt === 'string'
            ? parsed.acquiredAt
            : new Date().toISOString(),
        epoch: typeof parsed.epoch === 'number' ? parsed.epoch : undefined,
        beatMtime: typeof parsed.beatMtime === 'number' ? parsed.beatMtime : undefined,
        clockMtime: typeof parsed.clockMtime === 'number' ? parsed.clockMtime : undefined,
        ageSeconds: typeof parsed.ageSeconds === 'number' ? parsed.ageSeconds : undefined,
        filesTouched: Array.isArray(parsed.filesTouched)
          ? parsed.filesTouched.filter((v): v is string => typeof v === 'string')
          : undefined,
        note: typeof parsed.note === 'string' ? parsed.note : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function createEmptyFeed(schemaVersion: 1 | 2 = 2): AgentBusFeed {
  return {
    schemaVersion,
    updatedAt: new Date().toISOString(),
    messages: [],
  };
}

export function parseAgentBusFeed(rawText: string | null | undefined): AgentBusFeed {
  if (!rawText || !rawText.trim()) return createEmptyFeed(1);
  try {
    const parsed = JSON.parse(rawText) as Partial<AgentBusFeed>;
    const rawMessages = Array.isArray(parsed.messages) ? parsed.messages : [];
    const messages = rawMessages
      .map((item) => normalizeBusMessage(item))
      .filter((item): item is AgentBusMessage => Boolean(item));
    return {
      schemaVersion: 1,
      updatedAt:
        typeof parsed.updatedAt === 'string'
          ? parsed.updatedAt
          : new Date().toISOString(),
      messages,
    };
  } catch {
    return createEmptyFeed(1);
  }
}

export function mergeSegmentedMessages(messages: AgentBusMessage[]): AgentBusFeed {
  const sorted = [...messages].sort((a, b) => {
    const tsB = Date.parse(b.timestamp) || 0;
    const tsA = Date.parse(a.timestamp) || 0;
    if (tsB !== tsA) return tsB - tsA;
    return (b.epoch ?? 0) - (a.epoch ?? 0);
  });
  return {
    schemaVersion: 2,
    updatedAt: sorted[0]?.timestamp ?? new Date().toISOString(),
    messages: sorted.slice(0, MAX_FEED_MESSAGES),
  };
}

export function buildSegmentedFeedPayload(
  draft: AgentBusMessageDraft,
  epoch: number
): { filename: string; jsonText: string; record: Record<string, unknown> } {
  const nowIso = new Date().toISOString();
  const tsUnix = Math.floor(Date.now() / 1000);
  const shortUuid = Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-6);
  const id = `${Date.now()}-${shortUuid.slice(0, 8)}`;
  const paddedEpoch = formatPaddedEpoch(epoch);
  const filename = `${paddedEpoch}-${shortUuid}.json`;

  const statusToKind: Record<AgentBusMessageStatus, string> = {
    info: 'status',
    working: 'working',
    done: 'done',
    blocked: 'blocked',
    handoff: 'handoff',
  };

  const record: Record<string, unknown> = {
    schemaVersion: 1,
    id,
    epoch,
    from: draft.from.trim() || 'Prospero-Studio',
    to: draft.to.trim() || 'all',
    kind: statusToKind[draft.status] ?? 'status',
    status: draft.status,
    ts: tsUnix,
    timestamp: nowIso,
    text: draft.summary.trim(),
    summary: draft.summary.trim(),
    refs: draft.filesTouched?.filter(Boolean) ?? [],
    ...(draft.nextStep?.trim() ? { nextStep: draft.nextStep.trim() } : {}),
  };

  const jsonText = JSON.stringify(record, null, 2);
  assertWithinWriteBytesLimit(jsonText);

  return { filename, jsonText, record };
}

export function appendAgentBusMessage(
  feed: AgentBusFeed,
  draft: AgentBusMessageDraft
): AgentBusFeed {
  const now = new Date().toISOString();
  const entry: AgentBusMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: now,
    from: draft.from.trim() || 'agent',
    to: draft.to.trim() || 'all',
    status: draft.status,
    summary: draft.summary.trim(),
    filesTouched: draft.filesTouched?.filter(Boolean),
    nextStep: draft.nextStep?.trim() || undefined,
  };
  const nextMessages = [entry, ...feed.messages].slice(0, MAX_FEED_MESSAGES);
  return {
    schemaVersion: feed.schemaVersion,
    updatedAt: now,
    messages: nextMessages,
  };
}
