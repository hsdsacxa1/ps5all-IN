import React, { useMemo, useState } from 'react';
import {
  ArrowUp,
  Eye,
  FileText,
  Folder,
  Play,
  Search,
} from 'lucide-react';
import { Ps5DirEntry, Ps5InstalledGame } from '../../types/bridge';
import { PS5_DIRECTORY_PRESETS } from '../../bridge/bridgeCatalog';
import {
  classifyTitleId,
  sortDirEntries,
  TitlePlatformKind,
} from '../../bridge/bridgeRegistry';
import { formatBytesCompact } from '../../bridge/bridgeUrlValidator';

interface BridgeFileExplorerPanelProps {
  connected: boolean;
  currentPath: string;
  dirEntries: Ps5DirEntry[];
  dirLoading: boolean;
  dirError: string | null;
  previewPath: string | null;
  previewContent: string | null;
  previewLoading: boolean;
  games: Ps5InstalledGame[];
  onBrowseDir: (path: string) => void;
  onPreviewFile: (path: string) => void;
  onRequestLaunchGame: (game: Ps5InstalledGame) => void;
}

export const BridgeFileExplorerPanel: React.FC<BridgeFileExplorerPanelProps> = ({
  connected,
  currentPath,
  dirEntries,
  dirLoading,
  dirError,
  previewPath,
  previewContent,
  previewLoading,
  games,
  onBrowseDir,
  onPreviewFile,
  onRequestLaunchGame,
}) => {
  const [pathInput, setPathInput] = useState(currentPath);
  const [gameFilter, setGameFilter] = useState<'all' | TitlePlatformKind>('all');
  const [gameQuery, setGameQuery] = useState('');

  const sortedEntries = useMemo(() => sortDirEntries(dirEntries), [dirEntries]);

  const filteredGames = useMemo(() => {
    const q = gameQuery.trim().toLowerCase();
    return games.filter((g) => {
      const kind = classifyTitleId(g.title_id).kind;
      if (gameFilter !== 'all' && kind !== gameFilter) return false;
      if (!q) return true;
      return (
        g.title_id.toLowerCase().includes(q) ||
        g.title.toLowerCase().includes(q)
      );
    });
  }, [games, gameFilter, gameQuery]);

  const handleGoParent = () => {
    const clean = currentPath.replace(/\/+$/, '');
    if (!clean || clean === '/') return;
    const idx = clean.lastIndexOf('/');
    const parent = idx <= 0 ? '/' : clean.slice(0, idx);
    setPathInput(parent);
    onBrowseDir(parent);
  };

  const handleNavigatePreset = (path: string) => {
    setPathInput(path);
    onBrowseDir(path);
  };

  return (
    <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Live PS5 Filesystem & Log Reader */}
      <div className="xl:col-span-6 rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white">
              Файловая система и логи на PS5
            </h3>
            <p className="text-xs text-slate-400">
              Чтение каталогов /data/shadowmount, /data/krakenmount, /data/homebrew и просмотр конфигов/логов.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGoParent}
            disabled={!connected || currentPath === '/'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            Вверх
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PS5_DIRECTORY_PRESETS.map((preset) => (
            <button
              key={preset.path}
              type="button"
              disabled={!connected}
              onClick={() => handleNavigatePreset(preset.path)}
              className={`px-2.5 py-1 rounded-md font-mono text-xs transition-colors whitespace-nowrap shrink-0 ${
                currentPath === preset.path
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onBrowseDir(pathInput.trim() || '/data');
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            placeholder="/data/krakenmount"
            className="flex-1 h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!connected || dirLoading}
            className="h-9 px-4 text-xs font-semibold text-white bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            {dirLoading ? 'Чтение...' : 'Открыть'}
          </button>
        </form>

        {dirError && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {dirError}
          </div>
        )}

        <div className="max-h-64 overflow-auto rounded-lg border border-slate-800 bg-slate-950/60 divide-y divide-slate-800/70">
          {sortedEntries.length === 0 ? (
            <div className="p-4 text-xs text-slate-500">
              {connected
                ? 'Каталог пуст или ещё не загружен.'
                : 'Подключите мост для просмотра файлов PS5.'}
            </div>
          ) : (
            sortedEntries.map((entry) => {
              const isDir = entry.kind === 'dir';
              const fullPath = `${currentPath === '/' ? '' : currentPath}/${entry.name}`;
              return (
                <div
                  key={entry.name}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-slate-900/80 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() =>
                      isDir ? handleNavigatePreset(fullPath) : onPreviewFile(fullPath)
                    }
                    className="flex items-center gap-2 text-left min-w-0 flex-1 text-slate-200 hover:text-white"
                  >
                    {isDir ? (
                      <Folder className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="font-mono truncate">{entry.name}</span>
                  </button>
                  <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums text-slate-400">
                    <span>{isDir ? 'DIR' : formatBytesCompact(entry.size)}</span>
                    {!isDir && (
                      <button
                        type="button"
                        onClick={() => onPreviewFile(fullPath)}
                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Читать
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {(previewLoading || previewContent !== null) && (
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="truncate">{previewPath}</span>
              {previewLoading && <span className="text-sky-400">Загрузка...</span>}
            </div>
            <pre className="max-h-52 overflow-auto font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap break-all">
              {previewContent || ''}
            </pre>
          </div>
        )}
      </div>

      {/* Right: Installed Games & PPSA vs CUSA Filter */}
      <div className="xl:col-span-6 rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">
              Установленные игры и тайтлы ({games.length})
            </h3>
            <p className="text-xs text-slate-400">
              Разделение PS5 (PPSA), PS4 (CUSA) и Homebrew из базы app.db через мост.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
            {(
              [
                ['all', 'Все'],
                ['ps5', 'PS5 PPSA'],
                ['ps4', 'PS4 CUSA'],
                ['homebrew', 'Homebrew'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setGameFilter(key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  gameFilter === key
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={gameQuery}
            onChange={(e) => setGameQuery(e.target.value)}
            placeholder="Поиск по Title ID (PPSA / CUSA) или названию..."
            className="w-full h-9 rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="max-h-96 overflow-auto rounded-lg border border-slate-800 bg-slate-950/60 divide-y divide-slate-800/70">
          {filteredGames.length === 0 ? (
            <div className="p-4 text-xs text-slate-500">
              {connected
                ? 'Подходящих тайтлов не найдено.'
                : 'Подключите мост для загрузки списка игр с PS5.'}
            </div>
          ) : (
            filteredGames.map((game) => {
              const cls = classifyTitleId(game.title_id);
              return (
                <div
                  key={game.title_id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-slate-900/80 transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-sm font-medium text-white truncate">
                      {game.title || game.title_id}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className={cls.textClass}>{game.title_id}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-slate-400">{cls.label}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!connected}
                    onClick={() => onRequestLaunchGame(game)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 rounded-lg hover:bg-blue-600 hover:text-white disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Запустить
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
