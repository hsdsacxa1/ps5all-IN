import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_BUS_CLOCK_PATH,
  AGENT_BUS_EPOCH_PATH,
  AGENT_BUS_FEED_DIR,
  AGENT_BUS_INBOX_DIR,
  AGENT_BUS_LOCK_DIR,
  MAX_PS5_WRITE_BYTES,
  assertWithinWriteBytesLimit,
  buildSecondAgentProtocolPrompt,
  buildSegmentedFeedPayload,
  decodeBase64ToUtf8,
  encodeUtf8ToBase64,
  formatPaddedEpoch,
  mergeSegmentedMessages,
  normalizeBusMessage,
  parseEpochValue,
  parseShellStatMtime,
  sanitizeAgentSlug,
} from './agentBusProtocol.ts';

test('encodeUtf8ToBase64 and decodeBase64ToUtf8 round-trip Cyrillic JSON cleanly', () => {
  const source = JSON.stringify({
    holder: 'Prospero-Studio',
    task: 'Проверка логов PPSA34015 на FW 13.60',
  });
  const encoded = encodeUtf8ToBase64(source);
  assert.equal(decodeBase64ToUtf8(encoded), source);
});

test('parseShellStatMtime extracts mtime from built-in PS5 shell stat output', () => {
  const sample =
    'path: /data/agent_bus/.clock\nsize: 0\nmode: 0100644\nuid: 0\ngid: 0\nmtime: 1794722863\ntype: file\n';
  assert.equal(parseShellStatMtime(sample), 1794722863);
  assert.equal(parseShellStatMtime(''), undefined);
});

test('epoch parsing and formatting pad properly and fallback safely', () => {
  assert.equal(parseEpochValue('12\n'), 12);
  assert.equal(parseEpochValue(''), 1);
  assert.equal(formatPaddedEpoch(7), '000007');
  assert.equal(sanitizeAgentSlug('Prospero Studio #1'), 'prospero-studio-1');
});

test('normalizeBusMessage supports both arena-agent v2 schema and Prospero-Studio schema', () => {
  const arenaRaw = {
    schemaVersion: 1,
    id: '0be88a01a3fb49478ddf46bc97bf9d06',
    epoch: 1,
    from: 'arena-agent',
    kind: 'status',
    ts: 1794722863,
    text: 'HANDOFF: work state for 192.168.50.14',
    refs: ['/data/agent_bus/inbox/2026-11-15-HANDOFF.md'],
  };

  const normalizedArena = normalizeBusMessage(
    arenaRaw,
    '/data/agent_bus/feed/arena-agent/000001-0be88a01.json'
  );
  assert.ok(normalizedArena);
  assert.equal(normalizedArena.from, 'arena-agent');
  assert.equal(normalizedArena.status, 'info');
  assert.equal(normalizedArena.epoch, 1);
  assert.equal(normalizedArena.summary, 'HANDOFF: work state for 192.168.50.14');
  assert.deepEqual(normalizedArena.filesTouched, ['/data/agent_bus/inbox/2026-11-15-HANDOFF.md']);

  const { filename, jsonText } = buildSegmentedFeedPayload(
    {
      from: 'Prospero-Studio',
      to: 'arena-agent',
      status: 'handoff',
      summary: 'UI обновлён на AgentBus v2',
      nextStep: 'Проверить чтение из feed/prospero-studio/',
    },
    3
  );
  assert.ok(filename.startsWith('000003-'));
  const parsedBack = normalizeBusMessage(JSON.parse(jsonText));
  assert.ok(parsedBack);
  assert.equal(parsedBack.status, 'handoff');
  assert.equal(parsedBack.to, 'arena-agent');
  assert.equal(parsedBack.epoch, 3);

  const merged = mergeSegmentedMessages([normalizedArena, parsedBack]);
  assert.equal(merged.schemaVersion, 2);
  assert.equal(merged.messages.length, 2);
});

test('assertWithinWriteBytesLimit enforces 256 KiB ps5upload ceiling', () => {
  assert.doesNotThrow(() => assertWithinWriteBytesLimit('ok'));
  const oversized = 'A'.repeat(MAX_PS5_WRITE_BYTES + 10);
  assert.throws(() => assertWithinWriteBytesLimit(oversized), /262144/);
});

test('buildSecondAgentProtocolPrompt v2 references mkdir lock.d, rm -rf, .clock, epoch, feed/, and inbox/', () => {
  const prompt = buildSecondAgentProtocolPrompt(
    'https://example.trycloudflare.com',
    '192.168.50.14'
  );
  assert.ok(prompt.includes(`mkdir ${AGENT_BUS_LOCK_DIR}`));
  assert.ok(prompt.includes(`rm -rf ${AGENT_BUS_LOCK_DIR}`));
  assert.ok(prompt.includes(AGENT_BUS_CLOCK_PATH));
  assert.ok(prompt.includes(AGENT_BUS_EPOCH_PATH));
  assert.ok(prompt.includes(AGENT_BUS_FEED_DIR));
  assert.ok(prompt.includes(AGENT_BUS_INBOX_DIR));
});
