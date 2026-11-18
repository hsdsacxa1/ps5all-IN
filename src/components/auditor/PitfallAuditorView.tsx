import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { CRITICAL_PITFALLS_1360 } from '../../data/pitfallsData';
import {
  ExploitEntryId,
  HenFlavorId,
  RuntimeStackSelection,
  SourceAuditInput,
} from '../../types/ps5';
import { validateRuntimeStack } from '../../validators/henConflictValidator';
import { auditProjectSourceAndConfig } from '../../validators/sourceCodeAuditor';

const SAMPLE_BUGGY_SOURCE = `// Sample Native PS5 App source with common 13.60 bugs
#include <stdio.h>
#include <sys/statvfs.h>

void save_user_config() {
    struct statvfs disk_info;
    // BUG 1: statvfs() is missing in userland libkernel -> Null Import Crash!
    if (statvfs("/data", &disk_info) == 0) {
        printf("Free blocks: %lu\\n", disk_info.f_bavail);
    }

    // BUG 2: Writing to read-only /app0/ and no /download0 fallback for /data/
    FILE *fp = fopen("/app0/assets/settings.cfg", "w");
    FILE *data_fp = fopen("/data/my_app/state.json", "w");

    // BUG 3: Calling platform sceSslInit after privilege escalation
    sceSslInit(128 * 1024);
}`;

const SAMPLE_CLEAN_SOURCE = `// Clean PS5 13.60 Native App source (Compliant)
#include <cstdio>
#include <cerrno>
#include <unistd.h>
#include <fcntl.h>
#include <sys/stat.h>

const char* get_safe_storage_dir() {
    if (::mkdir("/data/prospero_app", 0777) == 0 || errno == EEXIST) {
        if (::access("/data/prospero_app", W_OK) == 0) {
            return "/data/prospero_app";
        }
    }
    return "/download0"; // Fallback for OnionHEN sandbox
}

bool write_data_safely(const char* path, const char* buf, size_t len) {
    int fd = ::open(path, O_WRONLY | O_CREAT | O_TRUNC, 0666);
    if (fd < 0) return false;
    ssize_t res = ::write(fd, buf, len);
    if (res < 0 && errno == ENOSPC) {
        // Safe disk space handling without statvfs()
        ::close(fd);
        return false;
    }
    ::close(fd);
    return true;
}`;

export const PitfallAuditorView: React.FC = () => {
  const [auditInput, setAuditInput] = useState<SourceAuditInput>({
    architecture: 'native-app',
    sourceCode: SAMPLE_BUGGY_SOURCE,
    titleId: 'PPSA99808',
    contentVersion: '01.00',
    flexibleMemoryMiB: 448,
    iconWidth: 512,
    iconHeight: 512,
    iconHasAlpha: true, // Intentionally set to true to show the RGBA icon0.png check
    elevatedPrivileges: true,
  });

  const [stackSelection, setStackSelection] = useState<RuntimeStackSelection>({
    exploitEntry: 'y2jb-1.3.0',
    henSelections: ['kstuff-lite-1.11'],
    elfldrEnabled: true,
    shadowMountEnabled: true,
    shadowMountVersion: '1.7beta11',
    krakenMountEnabled: false,
    ftpServer: 'ftpsrv-2121',
    byepervisorEnabled: false,
    usbPowerInRestMode: true,
  });

  const findings = auditProjectSourceAndConfig(auditInput);
  const stackIssues = validateRuntimeStack(stackSelection);

  const toggleHenSelection = (hen: HenFlavorId) => {
    const exists = stackSelection.henSelections.includes(hen);
    const next = exists
      ? stackSelection.henSelections.filter((h) => h !== hen)
      : [...stackSelection.henSelections, hen];
    setStackSelection({ ...stackSelection, henSelections: next });
  };

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;

  return (
    <div className="space-y-8">
      {/* Top Interactive Grid: Source & Asset Auditor + Runtime Conflict Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Source Code & icon0.png / param.json Auditor */}
        <div className="lg:col-span-7 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                01. Статический аудитор кода и манифеста (FW 13.60)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Проверка на statvfs/statfs, запись в /app0, fallback в /download0, TLS и формат icon0.png
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setAuditInput({
                    ...auditInput,
                    sourceCode: SAMPLE_BUGGY_SOURCE,
                    iconHasAlpha: true,
                    elevatedPrivileges: true,
                  })
                }
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Загрузить пример с багами
              </button>
              <button
                type="button"
                onClick={() =>
                  setAuditInput({
                    ...auditInput,
                    sourceCode: SAMPLE_CLEAN_SOURCE,
                    iconHasAlpha: false,
                    iconWidth: 512,
                    iconHeight: 512,
                  })
                }
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 whitespace-nowrap shrink-0"
              >
                Загрузить эталонный код
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label
                htmlFor="audit-title-id"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Title ID (param.json)
              </label>
              <input
                id="audit-title-id"
                type="text"
                value={auditInput.titleId}
                onChange={(e) =>
                  setAuditInput({ ...auditInput, titleId: e.target.value.toUpperCase() })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="audit-icon-alpha"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Цветовой режим icon0.png (512x512)
              </label>
              <select
                id="audit-icon-alpha"
                value={auditInput.iconHasAlpha ? 'rgba' : 'rgb'}
                onChange={(e) =>
                  setAuditInput({
                    ...auditInput,
                    iconHasAlpha: e.target.value === 'rgba',
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="rgb">24-bit RGB (Без Alpha — Валидно)</option>
                <option value="rgba">32-bit RGBA (С Alpha — Ошибка SceShellUI)</option>
              </select>
            </div>

            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={auditInput.elevatedPrivileges}
                  onChange={(e) =>
                    setAuditInput({
                      ...auditInput,
                      elevatedPrivileges: e.target.checked,
                    })
                  }
                  className="rounded accent-blue-600"
                />
                <span>Повышенные привилегии (/data)</span>
              </label>
            </div>
          </div>

          <div>
            <label
              htmlFor="audit-source-textarea"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Исходный код C/C++ для проверки ограничений 13.60
            </label>
            <textarea
              id="audit-source-textarea"
              rows={9}
              value={auditInput.sourceCode}
              onChange={(e) =>
                setAuditInput({ ...auditInput, sourceCode: e.target.value })
              }
              className="w-full p-3 rounded-lg bg-slate-950 text-slate-100 border border-slate-800 text-xs font-mono leading-relaxed"
            />
          </div>

          {/* Audit Results Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
              <span>Результаты проверки правил раздела 6</span>
              <span>
                Критических: {criticalCount} · Предупреждений: {warningCount}
              </span>
            </div>

            <div className="space-y-2.5">
              {findings.map((finding) => (
                <div
                  key={finding.id}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {finding.severity === 'critical' && (
                        <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      {finding.severity === 'warning' && (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      {finding.severity === 'pass' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                      <span>{finding.ruleName}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {finding.category} · {finding.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {finding.message}
                  </p>
                  <p className="text-xs font-mono text-blue-600 dark:text-blue-400">
                    Решение: {finding.remediation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Runtime Stack & HEN Conflict Checker */}
        <div className="lg:col-span-5 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
          <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              02. Детектор конфликтов Runtime-стека на консоли
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Проверка совместимости kstuff-lite v1.11+, OnionHEN v0.9.0, etaHEN 2.6b и Byepervisor
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label
                htmlFor="exploit-entry-select"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Точка входа пользовательского эксплойта (13.60)
              </label>
              <select
                id="exploit-entry-select"
                value={stackSelection.exploitEntry}
                onChange={(e) =>
                  setStackSelection({
                    ...stackSelection,
                    exploitEntry: e.target.value as ExploitEntryId,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="y2jb-1.3.0">
                  Y2JB (YouTube v01.009.253 + DNS 127.0.0.2 — Рекомендуется)
                </option>
                <option value="webkit-relapse">
                  WebKit User&apos;s Guide (DNS 62.210.38.117 / 45.56.67.85)
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <span className="block font-medium text-slate-700 dark:text-slate-300">
                Активные FSELF / HEN патчеры (проверка правила «НЕ одновременно»)
              </span>
              <div className="grid grid-cols-1 gap-2">
                {(
                  [
                    {
                      id: 'kstuff-lite-1.11',
                      label: 'EchoStretch/kstuff-lite v1.11+ (Эталон для 13.60)',
                    },
                    {
                      id: 'onionhen-0.9.0',
                      label: 'aydencharles/onionHEN v0.9.0 (Включает kstuff-lite 1.11)',
                    },
                    {
                      id: 'etahen-2.6b',
                      label: 'GronedWaffel/etahen-13.60 (Неофициальный порт etaHEN 2.6b)',
                    },
                    {
                      id: 'legacy-kstuff-1.6.7',
                      label: 'Старый kstuff_v1.6.7.elf (Запрещён на 13.60)',
                    },
                  ] as const
                ).map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={stackSelection.henSelections.includes(item.id)}
                      onChange={() => toggleHenSelection(item.id)}
                      className="rounded accent-blue-600"
                    />
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stackSelection.elfldrEnabled}
                  onChange={(e) =>
                    setStackSelection({
                      ...stackSelection,
                      elfldrEnabled: e.target.checked,
                    })
                  }
                  className="rounded accent-blue-600"
                />
                <span>elfldr (TCP 9021)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stackSelection.shadowMountEnabled}
                  onChange={(e) =>
                    setStackSelection({
                      ...stackSelection,
                      shadowMountEnabled: e.target.checked,
                    })
                  }
                  className="rounded accent-blue-600"
                />
                <span>ShadowMountPlus v1.7 (10101)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(stackSelection.krakenMountEnabled)}
                  onChange={(e) =>
                    setStackSelection({
                      ...stackSelection,
                      krakenMountEnabled: e.target.checked,
                    })
                  }
                  className="rounded accent-blue-600"
                />
                <span>Kraken Mount v0.0.1-beta (8097)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stackSelection.byepervisorEnabled}
                  onChange={(e) =>
                    setStackSelection({
                      ...stackSelection,
                      byepervisorEnabled: e.target.checked,
                    })
                  }
                  className="rounded accent-blue-600"
                />
                <span>Byepervisor-Reborn (XOM off)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stackSelection.usbPowerInRestMode}
                  onChange={(e) =>
                    setStackSelection({
                      ...stackSelection,
                      usbPowerInRestMode: e.target.checked,
                    })
                  }
                  className="rounded accent-blue-600"
                />
                <span>Питание USB в Rest Mode</span>
              </label>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            {stackIssues.map((issue) => (
              <div
                key={issue.id}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {issue.title}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 uppercase">
                    {issue.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {issue.detail}
                </p>
                <p className="text-xs font-mono text-blue-600 dark:text-blue-400">
                  Действие: {issue.fixAction}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Reference Grid: All 6 Critical Pitfalls with Good vs Bad Code */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            03. Справочник 6 критических ограничений PS5 FW 13.60 (Раздел 6)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Обязательные правила кодирования для предотвращения крашей Title-процессов и отказа сетевого стека
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CRITICAL_PITFALLS_1360.map((pitfall) => (
            <div
              key={pitfall.id}
              className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <span>Правило {pitfall.number}</span>
                  <span>{pitfall.affectedTarget}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {pitfall.title}
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong className="font-semibold text-slate-800 dark:text-slate-200">
                  Причина:
                </strong>{' '}
                {pitfall.rootCause}
              </p>
              <pre className="p-2.5 rounded bg-slate-950 text-slate-200 border border-slate-800 text-[11px] font-mono overflow-x-auto">
                <code>{pitfall.codeSnippetGood}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
