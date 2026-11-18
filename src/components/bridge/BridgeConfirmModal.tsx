import React from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { BridgeActionCategory } from '../../types/bridge';
import { ACTION_CATEGORY_META } from '../../bridge/bridgeCatalog';

export interface PendingBridgeAction {
  title: string;
  description: string;
  category: BridgeActionCategory;
  targetSummary: string;
  onConfirm: () => Promise<void>;
}

interface BridgeConfirmModalProps {
  pending: PendingBridgeAction | null;
  busy: boolean;
  onCancel: () => void;
  onProceed: () => void;
}

export const BridgeConfirmModal: React.FC<BridgeConfirmModalProps> = ({
  pending,
  busy,
  onCancel,
  onProceed,
}) => {
  if (!pending) return null;
  const meta = ACTION_CATEGORY_META[pending.category];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bridge-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className={`text-xs font-medium ${meta.textClass}`}>
                {meta.label}
              </div>
              <h3
                id="bridge-confirm-title"
                className="text-base font-semibold text-white"
              >
                {pending.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Закрыть диалог"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-slate-300">
          {pending.description}
        </p>

        <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 font-mono text-xs text-slate-300 break-all">
          {pending.targetSummary}
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onProceed}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="h-4 w-4" />
            {busy ? 'Выполняется...' : 'Подтвердить и выполнить'}
          </button>
        </div>
      </div>
    </div>
  );
};
