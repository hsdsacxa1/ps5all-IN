import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  ShieldAlert,
} from 'lucide-react';
import { parseElf64Binary } from '../../elf/elf64Parser';
import {
  ElfStringCategoryFilterId,
  ElfSymbolFilterId,
  filterElfSymbols,
  filterExtractedStrings,
} from '../../elf/elfFilters';
import {
  buildSampleElf64Binary,
  SampleElfPresetId,
} from '../../elf/sampleElfGenerator';

type InspectorTabId = 'symbols' | 'headers' | 'strings' | 'hexdump';

export const ElfResearchView: React.FC = () => {
  const [binaryState, setBinaryState] = useState<{
    fileName: string;
    bytes: Uint8Array;
    targetMode: 'title-eboot' | 'payload-elf';
  }>(() => {
    const initial = buildSampleElf64Binary('buggy-title-eboot');
    return {
      fileName: initial.fileName,
      bytes: initial.bytes,
      targetMode: initial.defaultMode,
    };
  });

  const [activeTab, setActiveTab] = useState<InspectorTabId>('symbols');
  const [symbolFilter, setSymbolFilter] = useState<ElfSymbolFilterId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stringCategory, setStringCategory] =
    useState<ElfStringCategoryFilterId>('all');
  const [stringQuery, setStringQuery] = useState<string>('');
  const [buildLoadError, setBuildLoadError] = useState<string | null>(null);
  const [isLoadingBuild, setIsLoadingBuild] = useState<boolean>(false);

  const report = useMemo(
    () =>
      parseElf64Binary(
        binaryState.fileName,
        binaryState.bytes,
        binaryState.targetMode
      ),
    [binaryState]
  );

  const handleLoadSamplePreset = (presetId: SampleElfPresetId) => {
    setBuildLoadError(null);
    const sample = buildSampleElf64Binary(presetId);
    setBinaryState({
      fileName: sample.fileName,
      bytes: sample.bytes,
      targetMode: sample.defaultMode,
    });
  };

  const handleLoadBuiltElf = async (fileName: string) => {
    setIsLoadingBuild(true);
    setBuildLoadError(null);
    try {
      const res = await fetch(`/builds/${fileName}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} при загрузке ${fileName}`);
      }
      const buf = await res.arrayBuffer();
      setBinaryState({
        fileName,
        bytes: new Uint8Array(buf),
        targetMode: 'payload-elf',
      });
    } catch (err) {
      setBuildLoadError(
        err instanceof Error ? err.message : `Не удалось загрузить ${fileName}`
      );
    } finally {
      setIsLoadingBuild(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBuildLoadError(null);
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const isPayloadName =
      file.name.toLowerCase().endsWith('.elf') &&
      !file.name.toLowerCase().includes('eboot');
    setBinaryState({
      fileName: file.name,
      bytes,
      targetMode: isPayloadName ? 'payload-elf' : 'title-eboot',
    });
  };

  const filteredSymbols = useMemo(
    () => filterElfSymbols(report.symbols, symbolFilter, searchQuery),
    [report.symbols, symbolFilter, searchQuery]
  );

  const filteredStrings = useMemo(
    () =>
      filterExtractedStrings(
        report.extractedStrings,
        stringCategory,
        stringQuery
      ),
    [report.extractedStrings, stringCategory, stringQuery]
  );

  return (
    <div className="space-y-6">
      {/* Top Control & Upload Bar */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              01. Лаборатория исследования ELF64 / FSELF бинарников (PS5 13.60)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Загрузите собственный .elf / eboot.bin с диска или выберите эталонный бинарный сэмпл для разбора заголовков, секций, таблицы символов (.dynsym) и строк (.rodata)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="elf-file-upload"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Загрузить .elf / eboot.bin</span>
              <input
                id="elf-file-upload"
                type="file"
                accept=".elf,.bin,.prx,.sprx,.so,.self"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleLoadSamplePreset('buggy-title-eboot')}
                className="px-2.5 py-1 text-xs font-medium rounded text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Sample: Buggy Title ELF
              </button>
              <button
                type="button"
                onClick={() => handleLoadSamplePreset('clean-vulkan-eboot')}
                className="px-2.5 py-1 text-xs font-medium rounded text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Sample: Clean Vulkan ELF
              </button>
              <button
                type="button"
                onClick={() => handleLoadSamplePreset('hybrid-helper-elf')}
                className="px-2.5 py-1 text-xs font-medium rounded text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Sample: Helper 9021 ELF
              </button>
              <button
                type="button"
                disabled={isLoadingBuild}
                onClick={() => handleLoadBuiltElf('kraken-shadow-mix.elf')}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isLoadingBuild ? 'Загрузка...' : 'Real Build: kraken-shadow-mix.elf'}
              </button>
              <button
                type="button"
                disabled={isLoadingBuild}
                onClick={() => handleLoadBuiltElf('byepv-pxl-v0.1.0.elf')}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                Real Build: byepv-pxl
              </button>
            </div>
          </div>
        </div>

        {buildLoadError && (
          <div
            role="alert"
            className="p-3 rounded-lg border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300 font-mono"
          >
            {buildLoadError}
          </div>
        )}

        {/* Binary Metadata Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <span className="text-slate-500 dark:text-slate-400 block">Файл</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 truncate block mt-0.5">
              {report.fileName}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <span className="text-slate-500 dark:text-slate-400 block">OS / ABI</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 truncate block mt-0.5">
              {report.header.osAbiLabel}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <span className="text-slate-500 dark:text-slate-400 block">Entry Point</span>
            <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums block mt-0.5">
              {report.header.entryPointHex}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <span className="text-slate-500 dark:text-slate-400 block">Тип ELF</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 truncate block mt-0.5">
              {report.header.eTypeLabel}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <span className="text-slate-500 dark:text-slate-400 block">Phdr / Shdr / Syms</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums block mt-0.5">
              {report.programHeaders.length} / {report.sectionHeaders.length} / {report.symbols.length}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <label
              htmlFor="elf-target-mode-select"
              className="text-slate-500 dark:text-slate-400 block"
            >
              Контекст запуска
            </label>
            <select
              id="elf-target-mode-select"
              value={binaryState.targetMode}
              onChange={(e) =>
                setBinaryState({
                  ...binaryState,
                  targetMode: e.target.value as 'title-eboot' | 'payload-elf',
                })
              }
              className="w-full mt-0.5 bg-transparent font-mono font-semibold text-slate-900 dark:text-slate-100"
            >
              <option value="title-eboot">Title Process (eboot.bin)</option>
              <option value="payload-elf">Payload Process (elfldr:9021)</option>
            </select>
          </div>
        </div>

        {/* 13.60 Compatibility Audit Findings */}
        <div className="space-y-2.5 pt-2">
          {report.auditIssues.map((issue) => (
            <div
              key={issue.id}
              className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {issue.severity === 'critical' && (
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  {issue.severity === 'warning' && (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  {issue.severity === 'nominal' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  <span>{issue.title}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 uppercase">
                  {issue.severity}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {issue.detail}
              </p>
              <p className="text-xs font-mono text-blue-600 dark:text-blue-400">
                Рекомендация: {issue.remediation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Binary Inspector Tabs */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            {(
              [
                {
                  id: 'symbols',
                  label: `Таблица символов .dynsym (${report.symbols.length})`,
                },
                {
                  id: 'headers',
                  label: `Сегменты и секции (${report.programHeaders.length} Phdr / ${report.sectionHeaders.length} Shdr)`,
                },
                {
                  id: 'strings',
                  label: `Строки и пути .rodata (${report.extractedStrings.length})`,
                },
                {
                  id: 'hexdump',
                  label: 'Hex-дамп заголовка ELF64',
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'symbols' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                aria-label="Поиск по имени символа"
                placeholder="Фильтр символа (statvfs, sceVideo...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
              />
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                {(
                  [
                    { id: 'all', label: 'Все' },
                    { id: 'imports', label: 'Импорты (UND)' },
                    { id: 'exports', label: 'Экспорты' },
                    { id: 'forbidden', label: 'Запрещённые в Title' },
                  ] as const
                ).map((flt) => (
                  <button
                    key={flt.id}
                    type="button"
                    onClick={() => setSymbolFilter(flt.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 ${
                      symbolFilter === flt.id
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'strings' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                aria-label="Фильтр строк и путей .rodata"
                placeholder="Фильтр строк (/data, .sprx, CA_LIST...)"
                value={stringQuery}
                onChange={(e) => setStringQuery(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
              />
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                {(
                  [
                    { id: 'all', label: 'Все' },
                    { id: 'ps5-path', label: 'Пути PS5' },
                    { id: 'sprx-module', label: 'Модули .sprx' },
                    { id: 'symbol-or-literal', label: 'Литералы' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setStringCategory(cat.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 ${
                      stringCategory === cat.id
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab 1: Symbol Table */}
        {activeTab === 'symbols' && (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-medium">#</th>
                  <th className="py-2.5 px-3 font-medium">Имя символа</th>
                  <th className="py-2.5 px-3 font-medium">Направление</th>
                  <th className="py-2.5 px-3 font-medium">Bind / Type</th>
                  <th className="py-2.5 px-3 font-medium">Адрес (Value)</th>
                  <th className="py-2.5 px-3 font-medium text-right">Статус PS5 13.60</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {filteredSymbols.map((sym) => (
                  <tr key={sym.index} className="hover:bg-slate-50 dark:hover:bg-slate-950/60">
                    <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                      {sym.index}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {sym.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {sym.isImported ? 'IMPORT (SHN_UNDEF)' : `EXPORT (Sec #${sym.shndx})`}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {sym.binding} · {sym.symType}
                    </td>
                    <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400 tabular-nums">
                      {sym.valueHex}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {sym.forbiddenInTitle ? (
                        <span className="text-red-500 font-semibold">
                          CRASH IN TITLE (Missing in libkernel)
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredSymbols.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      Символы по выбранному фильтру не найдены.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Program & Section Headers */}
        {activeTab === 'headers' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Program Headers (Phdr — Сегменты памяти)
              </h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Тип</th>
                      <th className="py-2 px-3">Флаги</th>
                      <th className="py-2 px-3">VAddr</th>
                      <th className="py-2 px-3 text-right">MemSz (B)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {report.programHeaders.map((ph) => (
                      <tr key={ph.index}>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {ph.typeLabel}
                        </td>
                        <td className="py-2 px-3 text-blue-600 dark:text-blue-400">
                          {ph.flagsLabel}
                        </td>
                        <td className="py-2 px-3 tabular-nums">{ph.vaddrHex}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{ph.memsz}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Section Headers (Shdr — Секции ELF64)
              </h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Имя</th>
                      <th className="py-2 px-3">Тип</th>
                      <th className="py-2 px-3 text-right">Размер (B)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {report.sectionHeaders.map((sh) => (
                      <tr key={sh.index}>
                        <td className="py-2 px-3 text-slate-500 tabular-nums">{sh.index}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {sh.name}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{sh.typeLabel}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{sh.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Extracted Strings */}
        {activeTab === 'strings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-mono text-xs">
            {filteredStrings.map((str, idx) => (
              <div
                key={`${str.offsetHex}-${idx}`}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between gap-3"
              >
                <span className="text-slate-900 dark:text-slate-100 truncate">
                  {str.value}
                </span>
                <span className="text-[11px] text-slate-500 shrink-0 tabular-nums">
                  {str.category} · {str.offsetHex}
                </span>
              </div>
            ))}
            {filteredStrings.length === 0 && (
              <div className="md:col-span-2 py-6 text-center text-slate-500 border border-slate-200 dark:border-slate-800 rounded-lg">
                Строки по выбранному фильтру не найдены.
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Hex Header Dump */}
        {activeTab === 'hexdump' && (
          <pre className="p-4 rounded-lg bg-slate-950 text-emerald-300 border border-slate-800 text-xs font-mono overflow-x-auto leading-relaxed">
            <code>{report.hexHeaderDump.join('\n')}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
