import React from 'react';
import { Cpu, HardDrive, Layers, Thermometer } from 'lucide-react';
import { BridgeConsoleOverview } from '../../types/bridge';
import { formatBytesCompact } from '../../bridge/bridgeUrlValidator';

interface ConsoleTelemetryGridProps {
  overview: BridgeConsoleOverview | null;
  loading: boolean;
}

export const ConsoleTelemetryGrid: React.FC<ConsoleTelemetryGridProps> = ({
  overview,
  loading,
}) => {
  if (loading && !overview) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((slot) => (
          <div
            key={slot}
            className="h-40 rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse p-5"
          />
        ))}
      </section>
    );
  }

  if (!overview) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
        Подключите мост ps5upload, чтобы получить живую телеметрию консоли (модель, ревизия ядра 13.60, температуры, свободное место и статус ShadowMountPlus).
      </section>
    );
  }

  const status = overview.sections.status?.data;
  const hw = overview.sections.hwInfo?.data;
  const temps = overview.sections.hwTemps?.data;
  const storage = overview.sections.hwStorage?.data;
  const smp = overview.sections.smpStatus?.data;

  const totalBytes = storage?.user_total_bytes ?? storage?.total_bytes ?? 0;
  const freeBytes = storage?.user_free_bytes ?? storage?.free_bytes ?? 0;
  const usedPct =
    totalBytes > 0 ? Math.min(100, Math.round(((totalBytes - freeBytes) / totalBytes) * 100)) : 0;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Column 1: Console & Kernel */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium text-slate-300">Консоль и ядро</span>
            <Cpu className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-base font-semibold text-white font-mono">
            {hw?.model || hw?.hw_model || overview.consoleAddr}
          </div>
          <div className="space-y-1 text-xs font-mono text-slate-400 tabular-nums">
            <div>Адрес: {overview.consoleAddr}</div>
            <div className="truncate" title={status?.ps5_kernel || ''}>
              Ядро: {status?.ps5_kernel || 'Нет ответа helper'}
            </div>
            <div>
              Helper: {status?.version ? `v${status.version}` : '—'} · ucred:{' '}
              {status?.ucred_elevated ? 'elevated' : 'standard'}
            </div>
          </div>
        </div>

        {/* Column 2: Thermal & Clock */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium text-slate-300">Температуры и частоты</span>
            <Thermometer className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-base font-semibold text-white font-mono tabular-nums">
            CPU {temps?.cpu_temp ?? '—'}°C · SoC {temps?.soc_temp ?? '—'}°C
          </div>
          <div className="space-y-1 text-xs font-mono text-slate-400 tabular-nums">
            <div>M.2 SSD: {temps?.m2_temp ?? '—'}°C</div>
            <div>Частота CPU: {temps?.cpu_freq_mhz ?? '—'} MHz</div>
            <div>Цель вентилятора: {temps?.fan_target_c ?? '—'}°C</div>
          </div>
        </div>

        {/* Column 3: Storage */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium text-slate-300">Накопитель PS5</span>
            <HardDrive className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-base font-semibold text-white font-mono tabular-nums">
            Свободно {formatBytesCompact(freeBytes)}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <div className="space-y-1 text-xs font-mono text-slate-400 tabular-nums">
            <div>
              Раздел /user: {formatBytesCompact(totalBytes)} ({usedPct}% занято)
            </div>
            <div>
              Системный /system_data: свободен {formatBytesCompact(storage?.system_data_free_bytes)}
            </div>
          </div>
        </div>

        {/* Column 4: ShadowMountPlus */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium text-slate-300">ShadowMountPlus</span>
            <Layers className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-base font-semibold text-white font-mono">
            {smp?.running
              ? 'Активен (Running)'
              : smp?.installed
                ? 'Установлен (Остановлен)'
                : 'Не обнаружен'}
          </div>
          <div className="space-y-1 text-xs font-mono text-slate-400">
            <div>Команд обработано: {status?.command_count ?? '—'}</div>
            <div>Физическая RAM: {formatBytesCompact(hw?.physmem)}</div>
            <div>CPU ядер/потоков: {hw?.ncpu ?? '—'}</div>
          </div>
        </div>
      </div>

      {smp?.debug_log_tail && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium text-slate-300">
              Хвост лога ShadowMountPlus (debug_log_tail)
            </span>
            <span className="font-mono text-slate-500">/data/shadowmount</span>
          </div>
          <pre className="max-h-40 overflow-auto font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap break-all">
            {smp.debug_log_tail}
          </pre>
        </div>
      )}
    </section>
  );
};
