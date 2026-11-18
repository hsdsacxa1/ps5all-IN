import React from 'react';
import { Cpu, Layers, ShieldAlert } from 'lucide-react';
import {
  PORT_API_MAPPING_ROWS,
  PORT_GPU_BACKEND_META,
} from '../../data/nativePortsCatalog';
import {
  evaluatePortMemoryImpact,
  PORT_STRATEGY_LIST,
  PORT_STRATEGY_REGISTRY,
} from '../../ports/portStrategyRegistry';
import {
  NativePortConfig,
  PortGpuBackendId,
  PortStrategyId,
} from '../../types/nativePorts';

interface PortConfiguratorPanelProps {
  config: NativePortConfig;
  onChangeConfig: (next: NativePortConfig) => void;
}

const GPU_BACKENDS = Object.values(PORT_GPU_BACKEND_META);

const PACKAGE_FORMATS: { id: NativePortConfig['packageFormat']; label: string }[] = [
  { id: 'folder', label: 'Unpacked Folder' },
  { id: 'ffpkg', label: 'UFS2 .ffpkg' },
  { id: 'ffpfsc', label: 'Compressed .ffpfsc' },
];

export const PortConfiguratorPanel: React.FC<PortConfiguratorPanelProps> = ({
  config,
  onChangeConfig,
}) => {
  const activeStrategy = PORT_STRATEGY_REGISTRY[config.strategy];
  const activeGpu = PORT_GPU_BACKEND_META[config.gpuBackend];
  const mem = evaluatePortMemoryImpact(config.flexibleMemoryMiB);

  const updateField = <K extends keyof NativePortConfig>(
    key: K,
    value: NativePortConfig[K]
  ) => {
    onChangeConfig({ ...config, [key]: value });
  };

  const handleSelectStrategy = (strategyId: PortStrategyId) => {
    const nextMeta = PORT_STRATEGY_REGISTRY[strategyId].meta;
    onChangeConfig({
      ...config,
      strategy: strategyId,
      gpuBackend: nextMeta.recommendedGpu,
      enableJitDynarec: strategyId === 'emulator-dynarec',
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left column: Strategy, GPU stack, Memory & Subsystems */}
      <section className="xl:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-5">
        <div className="space-y-1 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <Layers className="h-3.5 w-3.5 text-blue-500" />
            <span>Конструктор нативного порта (PS5 13.60)</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Параметры портирования и графический стек
          </h3>
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Стратегия переноса проекта
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PORT_STRATEGY_LIST.map((handler) => {
              const selected = config.strategy === handler.meta.id;
              return (
                <button
                  key={handler.meta.id}
                  type="button"
                  onClick={() => handleSelectStrategy(handler.meta.id)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-xs transition-colors ${
                    selected
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-slate-950 dark:text-white font-semibold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {handler.meta.shortLabel}
                </button>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 pt-1">
            {activeStrategy.meta.tagline}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="space-y-1 sm:col-span-2">
            <span className="block text-xs text-slate-600 dark:text-slate-400">
              Исходный проект / движок
            </span>
            <input
              type="text"
              value={config.sourceProject}
              onChange={(e) => updateField('sourceProject', e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-600 dark:text-slate-400">
              Title ID
            </span>
            <input
              type="text"
              value={config.titleId}
              onChange={(e) =>
                updateField('titleId', e.target.value.toUpperCase().slice(0, 9))
              }
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="block text-xs text-slate-600 dark:text-slate-400">
              Имя каталога порта (/data/...)
            </span>
            <input
              type="text"
              value={config.portName}
              onChange={(e) =>
                updateField('portName', e.target.value.replace(/\s+/g, '_'))
              }
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-600 dark:text-slate-400">
              Графический бэкенд (gfx1013)
            </span>
            <select
              value={config.gpuBackend}
              onChange={(e) =>
                updateField('gpuBackend', e.target.value as PortGpuBackendId)
              }
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              {GPU_BACKENDS.map((gpu) => (
                <option key={gpu.id} value={gpu.id}>
                  {gpu.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/70 rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-1">
          <div className="text-slate-700 dark:text-slate-200">
            Стек: {activeGpu.apiLevel} · {activeGpu.repo}
          </div>
          <div>Оптимально для: {activeGpu.bestFor}</div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Flexible Memory (param.json)
            </span>
            <span className="font-mono tabular-nums text-slate-900 dark:text-white font-semibold">
              {mem.flexibleMiB} MiB (штраф Direct: −{mem.directPenaltyMiB} MiB)
            </span>
          </div>
          <input
            type="range"
            min={448}
            max={1024}
            step={64}
            value={config.flexibleMemoryMiB}
            onChange={(e) =>
              updateField('flexibleMemoryMiB', Number(e.target.value))
            }
            aria-label="Flexible Memory MiB"
            className="w-full accent-blue-600"
          />
          <p
            className={`text-[11px] ${
              mem.severity === 'caution'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {mem.summary}
          </p>
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Формат деплоя (ShadowMountPlus / RecompStore)
          </span>
          <div className="flex flex-wrap gap-2">
            {PACKAGE_FORMATS.map((fmt) => {
              const active = config.packageFormat === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => updateField('packageFormat', fmt.id)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {fmt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Подсистемы PS5 и защиты 13.60
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={config.enableDualSensePad}
                onChange={(e) =>
                  updateField('enableDualSensePad', e.target.checked)
                }
                className="rounded border-slate-600 text-blue-600"
              />
              <span>DualSense (libScePad)</span>
            </label>
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={config.enableAudioOut}
                onChange={(e) =>
                  updateField('enableAudioOut', e.target.checked)
                }
                className="rounded border-slate-600 text-blue-600"
              />
              <span>Звук (libSceAudioOut)</span>
            </label>
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={config.enableMbedTls}
                onChange={(e) => updateField('enableMbedTls', e.target.checked)}
                className="rounded border-slate-600 text-blue-600"
              />
              <span>Static mbedTLS + CA_LIST</span>
            </label>
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={config.enableDownload0Fallback}
                onChange={(e) =>
                  updateField('enableDownload0Fallback', e.target.checked)
                }
                className="rounded border-slate-600 text-blue-600"
              />
              <span>Fallback /download0/</span>
            </label>
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={config.enableS3ResumeHook}
                onChange={(e) =>
                  updateField('enableS3ResumeHook', e.target.checked)
                }
                className="rounded border-slate-600 text-blue-600"
              />
              <span>S3 Resume / Rest Mode</span>
            </label>
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={config.enableJitDynarec}
                onChange={(e) =>
                  updateField('enableJitDynarec', e.target.checked)
                }
                className="rounded border-slate-600 text-blue-600"
              />
              <span>JIT / Dynarec Probe</span>
            </label>
          </div>
        </div>
      </section>

      {/* Right column: PC-to-PS5 API Mapping Matrix & Strategy Pitfalls */}
      <section className="xl:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-5">
        <div className="space-y-1 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <Cpu className="h-3.5 w-3.5 text-emerald-500" />
            <span>Матрица замены подсистем при портировании на PS5</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Соответствие API (Upstream → PS5 13.60) и подводные камни
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                <th className="py-2.5 pr-3 font-medium">Подсистема</th>
                <th className="py-2.5 pr-3 font-medium">Исходный API (PC/Linux)</th>
                <th className="py-2.5 pr-3 font-medium">Эквивалент на PS5</th>
                <th className="py-2.5 font-medium">Критичное ограничение 13.60</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
              {PORT_API_MAPPING_ROWS.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 pr-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    {row.subsystem}
                  </td>
                  <td className="py-3 pr-3 font-mono text-slate-600 dark:text-slate-400">
                    {row.upstreamApi}
                  </td>
                  <td className="py-3 pr-3 font-mono text-sky-700 dark:text-sky-400">
                    {row.ps5NativeApi}
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-300 leading-relaxed">
                    {row.pitfallNote}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              Специфические риски стратегии «{activeStrategy.meta.shortLabel}»
            </span>
          </div>
          <p className="text-xs font-mono text-amber-900/80 dark:text-amber-200/80">
            Память: {activeStrategy.meta.memoryNote}
          </p>
          <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-disc pl-5">
            {activeStrategy.meta.keyPitfalls.map((pitfall) => (
              <li key={pitfall}>{pitfall}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};
