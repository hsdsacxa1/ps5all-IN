import React from 'react';
import { ARCHITECTURE_PATTERNS } from '../../data/exploitStackData';
import {
  ArchitecturePatternId,
  GraphicsBackendId,
  PackageFormatId,
  ProjectScaffoldConfig,
} from '../../types/ps5';
import { calculateMemoryBudget } from '../../validators/memoryBudgetCalculator';

interface ConfigFormPanelProps {
  config: ProjectScaffoldConfig;
  onChange: (next: ProjectScaffoldConfig) => void;
  onLoadPreset: (
    presetId: 'nasbridge' | 'patchdl' | 'vulkan-emu' | 'daemon' | 'kraken-mount'
  ) => void;
}

export const ConfigFormPanel: React.FC<ConfigFormPanelProps> = ({
  config,
  onChange,
  onLoadPreset,
}) => {
  const memoryAnalysis = calculateMemoryBudget(
    config.architecture,
    config.flexibleMemoryMiB
  );

  const isNativeOrHybrid =
    config.architecture === 'native-app' || config.architecture === 'hybrid-app';

  const updateField = <K extends keyof ProjectScaffoldConfig>(
    key: K,
    value: ProjectScaffoldConfig[K]
  ) => {
    onChange({ ...config, [key]: value });
  };

  const incrementContentVersion = () => {
    const parts = config.contentVersion.split('.');
    const major = parseInt(parts[0] || '1', 10);
    const minor = parseInt(parts[1] || '0', 10) + 1;
    const nextVer = `${String(major).padStart(2, '0')}.${String(minor % 100).padStart(2, '0')}`;
    updateField('contentVersion', nextVer);
  };

  return (
    <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            01. Архитектура и параметры таргета (FW 13.60)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Выберите один из 4 проверенных паттернов и настройте параметры сборки
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onLoadPreset('nasbridge')}
            className="px-2.5 py-1 text-xs font-medium rounded text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Hybrid NAS Preset
          </button>
          <button
            type="button"
            onClick={() => onLoadPreset('vulkan-emu')}
            className="px-2.5 py-1 text-xs font-medium rounded text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Vulkan Native App
          </button>
          <button
            type="button"
            onClick={() => onLoadPreset('kraken-mount')}
            className="px-2.5 py-1 text-xs font-medium rounded text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Kraken Mount (8097)
          </button>
          <button
            type="button"
            onClick={() => onLoadPreset('patchdl')}
            className="px-2.5 py-1 text-xs font-medium rounded text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            WebUI Payload
          </button>
        </div>
      </div>

      {/* Architecture Pattern Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Архитектурный паттерн (Раздел 3 спецификации)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ARCHITECTURE_PATTERNS.map((pattern) => {
            const active = config.architecture === pattern.id;
            return (
              <button
                key={pattern.id}
                type="button"
                onClick={() =>
                  updateField('architecture', pattern.id as ArchitecturePatternId)
                }
                aria-pressed={active}
                className={`text-left p-3.5 rounded-lg border transition-colors ${
                  active
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {pattern.shortTitle}
                  </span>
                  <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 tabular-nums truncate">
                    {pattern.id === 'hybrid-app'
                      ? 'eboot.bin + .elf'
                      : pattern.id === 'native-app'
                        ? 'eboot.bin / .ffpkg'
                        : '*.elf'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                  {pattern.useCaseSummary}
                </p>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                  <span>{pattern.ramCeiling}</span>
                  <span aria-hidden="true">·</span>
                  <span>{pattern.requiresKstuff ? 'kstuff-lite 1.11+' : 'elfldr:9021'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Core Input Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="project-name-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Имя проекта / Каталог в /data/
          </label>
          <input
            id="project-name-input"
            type="text"
            value={config.projectName}
            onChange={(e) => updateField('projectName', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
          />
        </div>

        <div>
          <label
            htmlFor="title-id-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Title ID (формат PPSA99808 / FAKE00001)
          </label>
          <input
            id="title-id-input"
            type="text"
            maxLength={9}
            value={config.titleId}
            onChange={(e) => updateField('titleId', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono tabular-nums"
          />
        </div>

        <div>
          <label
            htmlFor="content-version-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            contentVersion (sce_sys/param.json)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="content-version-input"
              type="text"
              value={config.contentVersion}
              onChange={(e) => updateField('contentVersion', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono tabular-nums"
            />
            <button
              type="button"
              onClick={incrementContentVersion}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              Bump +0.01
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="ps5-ip-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Целевой IP консоли ($PS5_HOST)
          </label>
          <input
            id="ps5-ip-input"
            type="text"
            value={config.ps5Ip}
            onChange={(e) => updateField('ps5Ip', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono tabular-nums"
          />
        </div>
      </div>

      {/* Graphics Backend & Package Format */}
      {isNativeOrHybrid && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div>
            <label
              htmlFor="graphics-backend-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Графический бэкенд
            </label>
            <select
              id="graphics-backend-select"
              value={config.graphicsBackend}
              onChange={(e) =>
                updateField('graphicsBackend', e.target.value as GraphicsBackendId)
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="videoout-sdl2-imgui">libSceVideoOut + SDL2 + ImGui</option>
              <option value="vulkan-radv">Vulkan via RADV (PS5_Vulkan / mihawk-99)</option>
              <option value="opengl-mesa">OpenGL via ps5-opengl (Mesa)</option>
              <option value="headless">Framebuffer Minimal</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="package-format-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Формат контейнера (ShadowMountPlus / Kraken Mount)
            </label>
            <select
              id="package-format-select"
              value={config.packageFormat}
              onChange={(e) =>
                updateField('packageFormat', e.target.value as PackageFormatId)
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="unpacked-folder">Распакованная папка (/data/homebrew/&lt;ID&gt;/)</option>
              <option value="ffpkg-ufs2">ShadowMountPlus UFS2 (.ffpkg)</option>
              <option value="ffpfsc-compressed">ShadowMountPlus Compressed (.ffpfsc / mkpfs)</option>
              <option value="pkg-fpkg">Kraken Mount Debug FPKG (.pkg / ampr-emu-ng)</option>
              <option value="zstd-pack">Kraken Mount Zstandard Pack (.zst / ampr-emu-ng)</option>
              <option value="lz4-pack">Kraken Mount LZ4 Pack (.lz4 / ampr-emu-ng)</option>
            </select>
          </div>
        </div>
      )}

      {/* Memory Budget Slider */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="flexible-memory-range"
            className="text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            {isNativeOrHybrid
              ? 'Гибкая память в sce_sys/param.json (Flexible Memory)'
              : 'Целевой лимит RAM для ELF Payload (пул SceShellUI)'}
          </label>
          <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
            {config.flexibleMemoryMiB} MiB ({config.flexibleMemoryMiB * 1024 * 1024} bytes)
          </span>
        </div>
        <input
          id="flexible-memory-range"
          type="range"
          min={128}
          max={1536}
          step={64}
          value={config.flexibleMemoryMiB}
          onChange={(e) =>
            updateField('flexibleMemoryMiB', parseInt(e.target.value, 10))
          }
          className="w-full accent-blue-600"
        />
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
          <div className="flex items-center justify-between font-mono tabular-nums text-slate-700 dark:text-slate-300">
            <span>Статус бюджета памяти: {memoryAnalysis.status.toUpperCase()}</span>
            {isNativeOrHybrid && (
              <span>
                Потеря Direct Memory: -{memoryAnalysis.directMemoryLostMiB} MiB
              </span>
            )}
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            {memoryAnalysis.recommendation}
          </p>
        </div>
      </div>

      {/* Checkboxes for 13.60 Guardrails */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={config.useHttpsTls}
            onChange={(e) => updateField('useHttpsTls', e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-700 accent-blue-600"
          />
          <span>Статический mbedTLS 3.6.7 + CA_LIST</span>
        </label>

        <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={config.openSourceGpl}
            onChange={(e) => updateField('openSourceGpl', e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-700 accent-blue-600"
          />
          <span>Включить licenses/GPL-3.0-NOTICE.md</span>
        </label>
      </div>
    </div>
  );
};
