import React from 'react';
import {
  FIRMWARE_OFFSET_MAP,
  FIRMWARE_OFFSET_PROFILES,
  OFFSET_STATUS_META,
} from '../../data/firmwareOffsetsData';
import { ELF_LOADER_VARIANTS } from '../../generators/payloadHeader/payloadHeaderRegistry';
import {
  ElfLoaderEntryVariant,
  FirmwareOffsetProfileId,
  PayloadHeaderConfig,
} from '../../types/payloadHeader';

interface PayloadOffsetSelectorProps {
  config: PayloadHeaderConfig;
  projectName: string;
  onChange: (next: PayloadHeaderConfig) => void;
  onSyncFromProject: () => void;
}

export const PayloadOffsetSelector: React.FC<PayloadOffsetSelectorProps> = ({
  config,
  projectName,
  onChange,
  onSyncFromProject,
}) => {
  const selectedFw =
    FIRMWARE_OFFSET_MAP[config.firmwareId] ?? FIRMWARE_OFFSET_MAP['fw-1360'];
  const statusMeta = OFFSET_STATUS_META[selectedFw.verifiedStatus];

  const updateField = <K extends keyof PayloadHeaderConfig>(
    key: K,
    value: PayloadHeaderConfig[K]
  ) => {
    onChange({ ...config, [key]: value });
  };

  const quickFirmwareIds: readonly FirmwareOffsetProfileId[] = [
    'fw-1360',
    'fw-1320',
    'fw-1200',
    'fw-761',
    'fw-451',
  ];

  return (
    <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Payload Generator — Выбор Firmware Offset
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Выберите целевую прошивку PS5 и вариант ELF-загрузчика для генерации C-заголовка
          </p>
        </div>

        <button
          type="button"
          onClick={onSyncFromProject}
          title={`Синхронизировать префикс с проектом ${projectName}`}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          Взять имя из проекта
        </button>
      </div>

      {/* Quick Firmware Selector Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="payload-fw-select"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Целевая прошивка PS5 (Firmware Offset Profile)
          </label>
          <span
            className={`px-2 py-0.5 text-[11px] font-mono rounded border ${statusMeta.badgeClass}`}
          >
            {statusMeta.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {quickFirmwareIds.map((fwId) => {
            const fwItem = FIRMWARE_OFFSET_MAP[fwId];
            const active = config.firmwareId === fwId;
            return (
              <button
                key={fwId}
                type="button"
                onClick={() => updateField('firmwareId', fwId)}
                aria-pressed={active}
                className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-colors whitespace-nowrap ${
                  active
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-600 text-white font-semibold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                FW {fwItem.fwNumber}
              </button>
            );
          })}
        </div>

        <select
          id="payload-fw-select"
          value={config.firmwareId}
          onChange={(e) =>
            updateField('firmwareId', e.target.value as FirmwareOffsetProfileId)
          }
          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
        >
          {FIRMWARE_OFFSET_PROFILES.map((fw) => (
            <option key={fw.id} value={fw.id}>
              FW {fw.fwNumber} · allproc {fw.offsets.allproc} ({fw.sdkTarget.split('+')[0].trim()})
            </option>
          ))}
        </select>

        {/* Offset Summary Card */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
          <div className="text-slate-600 dark:text-slate-400">
            {selectedFw.notes}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-500">allproc:</span>
              <span className="text-slate-900 dark:text-slate-100">{selectedFw.offsets.allproc}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">prison0:</span>
              <span className="text-slate-900 dark:text-slate-100">{selectedFw.offsets.prison0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">rootvnode:</span>
              <span className="text-slate-900 dark:text-slate-100">{selectedFw.offsets.rootvnode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">secflags:</span>
              <span className="text-slate-900 dark:text-slate-100">{selectedFw.offsets.securityFlags}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">elfldr_hook:</span>
              <span className="text-blue-600 dark:text-blue-400">{selectedFw.offsets.elfldrEntryHook}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">dlsym_off:</span>
              <span className="text-blue-600 dark:text-blue-400">{selectedFw.offsets.sceKernelDlsymOffset}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ELF Loader Strategy Selector */}
      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <label
          htmlFor="payload-loader-variant"
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          Шаблон точки входа ELF-загрузчика (Loader ABI)
        </label>
        <select
          id="payload-loader-variant"
          value={config.loaderVariant}
          onChange={(e) =>
            updateField('loaderVariant', e.target.value as ElfLoaderEntryVariant)
          }
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
        >
          {ELF_LOADER_VARIANTS.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.label}
            </option>
          ))}
        </select>
      </div>

      {/* C-Header Identity Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
        <div>
          <label
            htmlFor="header-filename-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Имя C-header файла
          </label>
          <input
            id="header-filename-input"
            type="text"
            value={config.fileName}
            onChange={(e) => updateField('fileName', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
          />
        </div>

        <div>
          <label
            htmlFor="header-guard-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Include Guard (#ifndef)
          </label>
          <input
            id="header-guard-input"
            type="text"
            value={config.headerGuard}
            onChange={(e) => updateField('headerGuard', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
          />
        </div>

        <div>
          <label
            htmlFor="header-prefix-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Префикс макросов
          </label>
          <input
            id="header-prefix-input"
            type="text"
            value={config.namespacePrefix}
            onChange={(e) => updateField('namespacePrefix', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
          />
        </div>

        <div>
          <label
            htmlFor="kdata-override-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Override kdata_base (опционально hex)
          </label>
          <input
            id="kdata-override-input"
            type="text"
            placeholder={selectedFw.offsets.kernelDataBaseHint}
            value={config.customKernelDataBaseOverride}
            onChange={(e) =>
              updateField('customKernelDataBaseOverride', e.target.value)
            }
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
          />
        </div>
      </div>

      {/* Template Sections Checkboxes */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={config.includeElf64Boilerplate}
            onChange={(e) =>
              updateField('includeElf64Boilerplate', e.target.checked)
            }
            className="rounded border-slate-300 dark:border-slate-700 accent-blue-600"
          />
          <span>ELF64 Ehdr / Phdr структуры</span>
        </label>

        <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={config.includeKernelReadWriteMacros}
            onChange={(e) =>
              updateField('includeKernelReadWriteMacros', e.target.checked)
            }
            className="rounded border-slate-300 dark:border-slate-700 accent-blue-600"
          />
          <span>Kernel R/W макросы и хелперы</span>
        </label>

        <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={config.includeSandboxEscapeHelpers}
            onChange={(e) =>
              updateField('includeSandboxEscapeHelpers', e.target.checked)
            }
            className="rounded border-slate-300 dark:border-slate-700 accent-blue-600"
          />
          <span>Sandbox Escape &amp; QA Flags</span>
        </label>

        <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={config.includeS3ResumeCheck}
            onChange={(e) =>
              updateField('includeS3ResumeCheck', e.target.checked)
            }
            className="rounded border-slate-300 dark:border-slate-700 accent-blue-600"
          />
          <span>S3 Resume / Canonical Guard</span>
        </label>
      </div>
    </div>
  );
};
