import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  Clock,
  Copy,
  Lock,
  MessageSquarePlus,
  RefreshCw,
  Unlock,
} from 'lucide-react';
import {
  AgentBusInboxEntry,
  AgentBusMessageDraft,
  AgentBusMessageStatus,
  AgentBusSnapshot,
} from '../../types/agentBus';
import {
  AGENT_BUS_EPOCH_PATH,
  AGENT_BUS_FEED_DIR,
  AGENT_BUS_LOCK_DIR,
  AGENT_MESSAGE_STATUS_META,
  buildSecondAgentProtocolPrompt,
} from '../../bridge/agentBusProtocol';
import { AgentBusInboxCard } from './AgentBusInboxCard';

interface AgentBusPanelProps {
  connected: boolean;
  bridgeUrl: string;
  consoleHost: string;
  snapshot: AgentBusSnapshot | null;
  loading: boolean;
  activeInboxPath: string | null;
  inboxDocContent: string | null;
  inboxDocLoading: boolean;
  onRefresh: () => void;
  onProbeClock: () => void;
  onRequestAcquireLock: (holder: string, task: string) => void;
  onRequestRenewBeat: () => void;
  onRequestReleaseLock: (mode: 'mkdir-v2' | 'legacy-file') => void;
  onRequestReclaimStale: () => void;
  onRequestPublishMessage: (draft: AgentBusMessageDraft) => void;
  onOpenInboxDoc: (doc: AgentBusInboxEntry) => void;
  onCloseInboxDoc: () => void;
}

export const AgentBusPanel: React.FC<AgentBusPanelProps> = ({
  connected,
  bridgeUrl,
  consoleHost,
  snapshot,
  loading,
  activeInboxPath,
  inboxDocContent,
  inboxDocLoading,
  onRefresh,
  onProbeClock,
  onRequestAcquireLock,
  onRequestRenewBeat,
  onRequestReleaseLock,
  onRequestReclaimStale,
  onRequestPublishMessage,
  onOpenInboxDoc,
  onCloseInboxDoc,
}) => {
  const [agentName, setAgentName] = useState('Prospero-Studio');
  const [targetAgent, setTargetAgent] = useState('arena-agent');
  const [lockTask, setLockTask] = useState('Синхронизация FC27 / Kraken / AgentBus v2');
  const [msgStatus, setMsgStatus] = useState<AgentBusMessageStatus>('handoff');
  const [msgSummary, setMsgSummary] = useState('');
  const [msgNextStep, setMsgNextStep] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const protocolPrompt = useMemo(
    () => buildSecondAgentProtocolPrompt(bridgeUrl, consoleHost),
    [bridgeUrl, consoleHost]
  );

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(protocolPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      // Clipboard might be unavailable in restricted context
    }
  };

  const handleSubmitMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgSummary.trim()) return;
    onRequestPublishMessage({
      from: agentName,
      to: targetAgent,
      status: msgStatus,
      summary: msgSummary,
      nextStep: msgNextStep,
    });
    setMsgSummary('');
    setMsgNextStep('');
  };

  const lock = snapshot?.lock ?? null;
  const messages = snapshot?.feed.messages ?? [];
  const epoch = snapshot?.epoch ?? 1;
  const staleLocks = snapshot?.staleLocks ?? [];
  const clockMtime = snapshot?.consoleClockMtime;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
            <span>AgentBus v{snapshot?.protocolVersion ?? 2}</span>
            <span aria-hidden="true">·</span>
            <span>{AGENT_BUS_LOCK_DIR}</span>
            <span aria-hidden="true">·</span>
            <span>{AGENT_BUS_FEED_DIR}/&lt;agent&gt;/</span>
            <span aria-hidden="true">·</span>
            <span className="text-sky-400">
              {AGENT_BUS_EPOCH_PATH}: {epoch}
            </span>
            {typeof clockMtime === 'number' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-slate-400">clock: {clockMtime}</span>
              </>
            )}
          </div>
          <h3 className="text-base font-semibold text-white">
            Синхронизация агентов через общий мост PS5Upload (mkdir lock + сегментная лента)
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={!connected || loading}
            onClick={onProbeClock}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            <Clock className="h-3.5 w-3.5 text-sky-400" />
            Зонд .clock
          </button>
          <button
            type="button"
            disabled={!connected || loading}
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Обновить шину
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Atomic mkdir Lock + Inbox Docs + Protocol Prompt */}
        <div className="xl:col-span-5 space-y-5">
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {lock ? (
                  <Lock className="h-4 w-4 text-amber-400" />
                ) : (
                  <Unlock className="h-4 w-4 text-emerald-400" />
                )}
                <span className="text-sm font-semibold text-white">
                  {lock
                    ? `Занято: ${lock.holder}`
                    : 'Консоль свободна (lock.d отсутствует)'}
                </span>
              </div>
              <span className="font-mono text-xs text-slate-500">
                shell/run mkdir
              </span>
            </div>

            {lock ? (
              <div className="space-y-1 text-xs font-mono text-slate-300">
                <div>Задача: {lock.task}</div>
                <div className="text-slate-400">
                  Захвачен: {lock.acquiredAt}
                  {typeof lock.epoch === 'number' ? ` · epoch ${lock.epoch}` : ''}
                </div>
                {typeof lock.beatMtime === 'number' && (
                  <div className="text-slate-400">
                    Heartbeat beat: {lock.beatMtime}
                    {typeof lock.ageSeconds === 'number'
                      ? ` (возраст ${lock.ageSeconds} с)`
                      : ''}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Атомарный мьютекс через mkdir /data/agent_bus/lock.d защищает операции PS5 от гонки двух агентов (write-bytes create_only не используется).
              </p>
            )}

            {staleLocks.length > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-[11px] font-mono text-slate-400">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="truncate">
                  История перехватов: {staleLocks.join(', ')}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Имя агента"
                aria-label="Имя агента"
                className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                value={lockTask}
                onChange={(e) => setLockTask(e.target.value)}
                placeholder="Текущая задача"
                aria-label="Задача для блокировки"
                className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!connected || Boolean(lock)}
                onClick={() => onRequestAcquireLock(agentName, lockTask)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
              >
                <Lock className="h-3.5 w-3.5" />
                Захватить lock.d
              </button>
              <button
                type="button"
                disabled={!connected || !lock || lock.mode !== 'mkdir-v2'}
                onClick={onRequestRenewBeat}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
              >
                <Activity className="h-3.5 w-3.5 text-sky-400" />
                Продлить beat
              </button>
              <button
                type="button"
                disabled={!connected || !lock}
                onClick={() => onRequestReleaseLock(lock?.mode ?? 'mkdir-v2')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 rounded-lg hover:bg-rose-600 hover:text-white disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
              >
                <Unlock className="h-3.5 w-3.5" />
                Снять (rm -rf)
              </button>
              {lock && lock.mode === 'mkdir-v2' && (
                <button
                  type="button"
                  disabled={!connected}
                  onClick={onRequestReclaimStale}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-300 bg-slate-800 rounded-lg hover:bg-amber-600 hover:text-white disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                >
                  Перехватить stale
                </button>
              )}
            </div>
          </div>

          <AgentBusInboxCard
            connected={connected}
            inbox={snapshot?.inbox ?? []}
            activeDocPath={activeInboxPath}
            docContent={inboxDocContent}
            docLoading={inboxDocLoading}
            onOpenDoc={onOpenInboxDoc}
            onCloseDoc={onCloseInboxDoc}
          />

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-slate-200">
                Промпт-правило AgentBus v2 для второго агента
              </h4>
              <button
                type="button"
                onClick={() => void handleCopyPrompt()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-sky-300 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Копировать
                  </>
                )}
              </button>
            </div>
            <pre className="max-h-44 overflow-auto font-mono text-[11px] leading-relaxed text-slate-400 whitespace-pre-wrap break-words">
              {protocolPrompt}
            </pre>
          </div>
        </div>

        {/* Right: Segmented Message Feed & Composer */}
        <div className="xl:col-span-7 space-y-4">
          <form
            onSubmit={handleSubmitMessage}
            className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="От кого"
                aria-label="От кого"
                className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                value={targetAgent}
                onChange={(e) => setTargetAgent(e.target.value)}
                placeholder="Кому (arena-agent / all)"
                aria-label="Кому"
                className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              />
              <select
                value={msgStatus}
                onChange={(e) => setMsgStatus(e.target.value as AgentBusMessageStatus)}
                aria-label="Статус сообщения"
                className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                {Object.entries(AGENT_MESSAGE_STATUS_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              rows={3}
              value={msgSummary}
              onChange={(e) => setMsgSummary(e.target.value)}
              placeholder="Сообщение в сегментную ленту /data/agent_bus/feed/<agent>/<epoch>-<uuid>.json..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={msgNextStep}
                onChange={(e) => setMsgNextStep(e.target.value)}
                placeholder="Следующий шаг (опционально)"
                className="flex-1 h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!connected || !msgSummary.trim()}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
              >
                <MessageSquarePlus className="h-4 w-4" />
                Отправить в feed/
              </button>
            </div>
          </form>

          <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-800 bg-slate-950/60 divide-y divide-slate-800/70">
            {messages.length === 0 ? (
              <div className="p-4 text-xs text-slate-500">
                {connected
                  ? 'Сообщений в /data/agent_bus/feed/ пока нет. Отправьте первое сообщение в сегментную ленту.'
                  : 'Подключите мост ps5upload для чтения и записи шины агентов.'}
              </div>
            ) : (
              messages.map((msg) => {
                const stMeta = AGENT_MESSAGE_STATUS_META[msg.status];
                return (
                  <div key={msg.id} className="p-3.5 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">{msg.from}</span>
                        <span aria-hidden="true" className="text-slate-600">→</span>
                        <span className="text-sky-400">{msg.to}</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className={stMeta.textClass}>{stMeta.label}</span>
                        {typeof msg.epoch === 'number' && (
                          <>
                            <span aria-hidden="true" className="text-slate-600">·</span>
                            <span className="text-slate-400">epoch {msg.epoch}</span>
                          </>
                        )}
                      </div>
                      <span className="text-slate-500 tabular-nums">{msg.timestamp}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
                      {msg.summary}
                    </p>
                    {msg.nextStep && (
                      <div className="text-xs font-mono text-slate-400">
                        Следующий шаг: {msg.nextStep}
                      </div>
                    )}
                    {msg.sourceFile && (
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        {msg.sourceFile}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
