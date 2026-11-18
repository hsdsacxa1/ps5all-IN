import React, { useState } from 'react';
import { Play, Plus } from 'lucide-react';

interface HomebrewEntry {
  titleId: string;
  titleName: string;
  contentVersion: string;
  containerType: 'folder' | 'ffpkg' | 'ffpfsc';
  path: string;
  mounted: boolean;
}

const INITIAL_HOMEBREW_ENTRIES: HomebrewEntry[] = [
  {
    titleId: 'PPSA99808',
    titleName: 'NASBridge PS5 (Hybrid)',
    contentVersion: '01.04',
    containerType: 'folder',
    path: '/data/homebrew/PPSA99808',
    mounted: true,
  },
  {
    titleId: 'FAKE00001',
    titleName: 'PSP5 Vulkan Emulator (RADV)',
    contentVersion: '01.02',
    containerType: 'ffpfsc',
    path: '/data/homebrew/FAKE00001.ffpfsc',
    mounted: true,
  },
  {
    titleId: 'PPSA99210',
    titleName: 'ProsperoTV Media Player',
    contentVersion: '01.01',
    containerType: 'ffpkg',
    path: '/data/homebrew/PPSA99210.ffpkg',
    mounted: false,
  },
];

export const ShadowMountSimulator: React.FC = () => {
  const [entries, setEntries] = useState<HomebrewEntry[]>(INITIAL_HOMEBREW_ENTRIES);
  const [activeEndpoint, setActiveEndpoint] = useState<'scan' | 'games' | 'mount'>('games');
  const [selectedTitleId, setSelectedTitleId] = useState<string>('PPSA99210');
  const [newTitleId, setNewTitleId] = useState<string>('PPSA99500');
  const [newTitleName, setNewTitleName] = useState<string>('PlayDen 13.60 Client');
  const [lastResponseJson, setLastResponseJson] = useState<string>(() =>
    JSON.stringify(
      {
        status: 'ok',
        daemon: 'ShadowMountPlus v1.7beta11',
        bridge: 'SceShellCore / TitleDir',
        games: INITIAL_HOMEBREW_ENTRIES,
      },
      null,
      2
    )
  );

  const executeSimulatedRequest = (endpoint: 'scan' | 'games' | 'mount') => {
    setActiveEndpoint(endpoint);

    if (endpoint === 'scan') {
      const response = {
        status: 'ok',
        endpoint: 'POST http://127.0.0.1:10101/api/v1/scan',
        scannedDirectories: ['/data/homebrew/', '/mnt/usb0/homebrew/'],
        discoveredCount: entries.length,
        games: entries,
      };
      setLastResponseJson(JSON.stringify(response, null, 2));
      return;
    }

    if (endpoint === 'games') {
      const response = {
        status: 'ok',
        endpoint: 'GET http://127.0.0.1:10101/api/v1/games',
        count: entries.length,
        games: entries,
      };
      setLastResponseJson(JSON.stringify(response, null, 2));
      return;
    }

    const updated = entries.map((item) =>
      item.titleId === selectedTitleId ? { ...item, mounted: true } : item
    );
    setEntries(updated);
    const target = updated.find((i) => i.titleId === selectedTitleId);
    setLastResponseJson(
      JSON.stringify(
        {
          status: 'mounted',
          endpoint: 'POST http://127.0.0.1:10101/api/v1/games/mount',
          bridge: 'SceShellCore TitleDir Mounted',
          app0Path: `/app0 -> ${target?.path || '/data/homebrew/' + selectedTitleId}`,
          target,
        },
        null,
        2
      )
    );
  };

  const handleAddHomebrewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = newTitleId.trim().toUpperCase();
    const trimmedName = newTitleName.trim();
    if (!/^[A-Z]{4}[0-9]{5}$/.test(trimmedId) || !trimmedName) {
      return;
    }
    const nextEntry: HomebrewEntry = {
      titleId: trimmedId,
      titleName: trimmedName,
      contentVersion: '01.00',
      containerType: 'folder',
      path: `/data/homebrew/${trimmedId}`,
      mounted: false,
    };
    const nextList = [...entries.filter((i) => i.titleId !== trimmedId), nextEntry];
    setEntries(nextList);
    setSelectedTitleId(trimmedId);
    setLastResponseJson(
      JSON.stringify(
        {
          status: 'added_to_data_homebrew',
          message: `Created /data/homebrew/${trimmedId}/eboot.bin. Run POST /api/v1/scan or /mount.`,
          games: nextList,
        },
        null,
        2
      )
    );
  };

  return (
    <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Интерактивный песочный стенд ShadowMountPlus v1.7 HTTP API
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
            Базовый URL: http://127.0.0.1:10101/api/v1 · Мост: SceShellCore / TitleDir (FW 12.00–13.60)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => executeSimulatedRequest('scan')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              activeEndpoint === 'scan'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Play className="w-3 h-3" />
            <span>POST /api/v1/scan</span>
          </button>

          <button
            type="button"
            onClick={() => executeSimulatedRequest('games')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              activeEndpoint === 'games'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Play className="w-3 h-3" />
            <span>GET /api/v1/games</span>
          </button>

          <button
            type="button"
            onClick={() => executeSimulatedRequest('mount')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              activeEndpoint === 'mount'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Play className="w-3 h-3" />
            <span>POST /api/v1/games/mount</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 space-y-4">
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Title ID</th>
                  <th className="py-2.5 px-3 font-medium">Название</th>
                  <th className="py-2.5 px-3 font-medium">Формат</th>
                  <th className="py-2.5 px-3 font-medium text-right">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {entries.map((entry) => (
                  <tr
                    key={entry.titleId}
                    onClick={() => setSelectedTitleId(entry.titleId)}
                    className={`cursor-pointer transition-colors ${
                      selectedTitleId === entry.titleId
                        ? 'bg-blue-50/50 dark:bg-blue-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-950/50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {entry.titleId}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {entry.titleName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {entry.containerType}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right">
                      {entry.mounted ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Mounted</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">Unmounted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form
            onSubmit={handleAddHomebrewFolder}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end pt-1"
          >
            <div className="sm:col-span-4">
              <label
                htmlFor="sim-title-id"
                className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Новый Title ID (4 буквы + 5 цифр)
              </label>
              <input
                id="sim-title-id"
                type="text"
                maxLength={9}
                value={newTitleId}
                onChange={(e) => setNewTitleId(e.target.value.toUpperCase())}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono tabular-nums"
              />
            </div>
            <div className="sm:col-span-5">
              <label
                htmlFor="sim-title-name"
                className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Имя в /data/homebrew/
              </label>
              <input
                id="sim-title-name"
                type="text"
                value={newTitleName}
                onChange={(e) => setNewTitleName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить</span>
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>Ответ HTTP-сервера ShadowMountPlus (127.0.0.1:10101)</span>
            <span>Target: {selectedTitleId}</span>
          </div>
          <pre className="p-3.5 rounded-lg bg-slate-950 text-slate-100 border border-slate-800 text-xs font-mono overflow-x-auto max-h-[240px] leading-relaxed">
            <code>{lastResponseJson}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
