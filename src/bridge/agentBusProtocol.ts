export {
  AGENT_MESSAGE_STATUS_META,
  MAX_PS5_WRITE_BYTES,
  appendAgentBusMessage,
  assertWithinWriteBytesLimit,
  buildSegmentedFeedPayload,
  createEmptyFeed,
  decodeBase64ToUtf8,
  encodeUtf8ToBase64,
  formatPaddedEpoch,
  getUtf8ByteLength,
  mergeSegmentedMessages,
  normalizeBusMessage,
  parseAgentBusFeed,
  parseAgentBusLock,
  parseEpochValue,
  parseShellStatMtime,
  sanitizeAgentSlug,
} from './agentBusCodec';

export const AGENT_BUS_DIR = '/data/agent_bus';
export const AGENT_BUS_LOCK_DIR = '/data/agent_bus/lock.d';
export const AGENT_BUS_LOCK_META_PATH = '/data/agent_bus/lock.d/meta.json';
export const AGENT_BUS_LOCK_BEAT_PATH = '/data/agent_bus/lock.d/beat';
export const AGENT_BUS_FEED_DIR = '/data/agent_bus/feed';
export const AGENT_BUS_INBOX_DIR = '/data/agent_bus/inbox';
export const AGENT_BUS_EPOCH_PATH = '/data/agent_bus/epoch';
export const AGENT_BUS_CLOCK_PATH = '/data/agent_bus/.clock';

// Legacy paths kept for backward compatibility read fallback
export const AGENT_BUS_LOCK_PATH = '/data/agent_bus/lock.json';
export const AGENT_BUS_FEED_PATH = '/data/agent_bus/feed.json';

export function buildSecondAgentProtocolPrompt(
  bridgeUrl: string,
  consoleHost: string
): string {
  return [
    `Правило синхронизации AgentBus v2 через мост PS5Upload (${bridgeUrl}, консоль ${consoleHost}):`,
    `1. Перед началом работ на PS5 прочитай состояние шины:`,
    `   - GET /api/ps5/list-dir -> ${AGENT_BUS_INBOX_DIR} и ${AGENT_BUS_FEED_DIR}/<agent>/ (НЕ использовать /api/ps5/fs/list-dir)`,
    `   - ${AGENT_BUS_EPOCH_PATH} (fencing-счётчик) и ${AGENT_BUS_LOCK_DIR} (проверка блокировки).`,
    `2. Атомарный мьютекс ТОЛЬКО через POST /api/ps5/shell/run { addr: "${consoleHost}", cmd: "mkdir ${AGENT_BUS_LOCK_DIR}" }`,
    `   (write-bytes + create_only НЕ является атомарным мьютексом; 502 exists = занято).`,
    `3. Продление аренды: cmd "touch ${AGENT_BUS_LOCK_BEAT_PATH}". Время консоли измеряй пробой "touch ${AGENT_BUS_CLOCK_PATH}" + "stat ${AGENT_BUS_CLOCK_PATH}" (mtime каталога != сейчас).`,
    `4. Освобождение лока: cmd "rm -rf ${AGENT_BUS_LOCK_DIR}" (НЕ rmdir, внутри есть beat). Перехват просроченного лока: cmd "mv ${AGENT_BUS_LOCK_DIR} ${AGENT_BUS_DIR}/lock.stale.<uuid>".`,
    `5. Сообщения пиши в отдельный файл ${AGENT_BUS_FEED_DIR}/<agent>/<epoch>-<uuid>.json (<= 256 KiB; единый feed.json теряет сообщения при гонке), длинные отчёты — в ${AGENT_BUS_INBOX_DIR}/*.md.`,
    `6. Среда shell/run — встроенный интерпретатор (без пайпов, >, [ -d ], date +%s). Не будить 192.168.50.80 и не перезапускать stage-2 ELF.`,
  ].join('\n');
}
