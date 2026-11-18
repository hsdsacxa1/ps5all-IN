import React from 'react';
import { FileText, X } from 'lucide-react';
import { AgentBusInboxEntry } from '../../types/agentBus';

interface AgentBusInboxCardProps {
  connected: boolean;
  inbox: AgentBusInboxEntry[];
  activeDocPath: string | null;
  docContent: string | null;
  docLoading: boolean;
  onOpenDoc: (doc: AgentBusInboxEntry) => void;
  onCloseDoc: () => void;
}

function formatByteSize(bytes: number): string {
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }
  return `${bytes} B`;
}

export const AgentBusInboxCard: React.FC<AgentBusInboxCardProps> = ({
  connected,
  inbox,
  activeDocPath,
  docContent,
  docLoading,
  onOpenDoc,
  onCloseDoc,
}) => {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-sky-400" />
          <h4 className="text-xs font-semibold text-slate-200">
            Входящие отчёты /data/agent_bus/inbox ({inbox.length})
          </h4>
        </div>
        {activeDocPath && (
          <button
            type="button"
            onClick={onCloseDoc}
            aria-label="Закрыть просмотр документа inbox"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Свернуть
          </button>
        )}
      </div>

      {!connected ? (
        <p className="text-xs text-slate-500">
          Подключите мост для чтения файлов передачи из /data/agent_bus/inbox/.
        </p>
      ) : inbox.length === 0 ? (
        <p className="text-xs text-slate-500">
          Каталог /data/agent_bus/inbox пока пуст.
        </p>
      ) : (
        <div className="space-y-1.5">
          {inbox.map((doc) => {
            const isActive = activeDocPath === doc.path;
            return (
              <button
                key={doc.path}
                type="button"
                onClick={() => onOpenDoc(doc)}
                className={`w-full flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                  isActive
                    ? 'border-sky-500/60 bg-sky-950/30 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <span className="font-mono truncate">{doc.name}</span>
                <span className="font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
                  {formatByteSize(doc.size)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {activeDocPath && (
        <div className="rounded-md border border-slate-800 bg-slate-900/80 p-3 space-y-2">
          <div className="font-mono text-[11px] text-sky-400 truncate">
            {activeDocPath}
          </div>
          {docLoading ? (
            <div className="text-xs text-slate-400">Загрузка документа из PS5...</div>
          ) : (
            <pre className="max-h-72 overflow-auto font-mono text-[11px] leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
              {docContent ?? ''}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
