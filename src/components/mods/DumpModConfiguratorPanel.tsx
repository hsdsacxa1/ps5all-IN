import React, { useMemo } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  auditDumpModRecipe,
  DUMP_MOD_STRATEGY_LIST,
  getDumpModStrategy,
} from '../../mods/dumpModRegistry';
import {
  DumpModRecipeConfig,
  DumpModStrategyId,
} from '../../types/dumpMods';

interface DumpModConfiguratorPanelProps {
  config: DumpModRecipeConfig;
  onChangeConfig: React.Dispatch<React.SetStateAction<DumpModRecipeConfig>>;
}

export const DumpModConfiguratorPanel: React.FC<
  DumpModConfiguratorPanelProps
> = ({ config, onChangeConfig }) => {
  const activeStrategy = useMemo(
    () => getDumpModStrategy(config.strategyId),
    [config.strategyId]
  );

  const auditFindings = useMemo(() => auditDumpModRecipe(config), [config]);

  const updateField = <K extends keyof DumpModRecipeConfig>(
    key: K,
    value: DumpModRecipeConfig[K]
  ) => {
    onChangeConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 space-y-1">
        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
          Полиморфный конструктор патчей и мод-оверлеев (5 архитектурных стратегий)
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          03. Конфигуратор рецепта патча дампа и подключения контента
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Настройте параметры целевого дампа PPSA, выберите стратегию модификации и проверьте совместимость с ограничениями PS5 FW 13.60 перед генерацией скриптов.
        </p>
      </div>

      {/* Strategy Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
        {DUMP_MOD_STRATEGY_LIST.map((strat) => {
          const isSelected = strat.id === config.strategyId;
          return (
            <button
              key={strat.id}
              type="button"
              onClick={() => updateField('strategyId', strat.id as DumpModStrategyId)}
              className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between gap-2 ${
                isSelected
                  ? 'border-blue-600 dark:border-blue-400 bg-blue-50/70 dark:bg-blue-950/40'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {strat.shortBadge}
              </span>
              <span className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">
                {strat.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Inputs */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Название игры / дампа
              </span>
              <input
                type="text"
                value={config.gameTitle}
                onChange={(e) => updateField('gameTitle', e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Title ID (PPSAxxxxx)
              </span>
              <input
                type="text"
                value={config.titleId}
                onChange={(e) => updateField('titleId', e.target.value.toUpperCase())}
                className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Версия патча / дампа (contentVersion)
              </span>
              <input
                type="text"
                value={config.contentVersion}
                onChange={(e) => updateField('contentVersion', e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Целевой SDK прошивки (Hex)
              </span>
              <select
                value={config.targetSdkHex}
                onChange={(e) => updateField('targetSdkHex', e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="0x13600000">0x13600000 (FW 13.60 — Текущий таргет)</option>
                <option value="0x12000000">0x12000000 (FW 12.00 Backport)</option>
                <option value="0x10010000">0x10010000 (FW 10.01 Backport)</option>
                <option value="0x07610000">0x07610000 (FW 7.61 Legacy Backport)</option>
              </select>
            </label>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {(
              [
                {
                  key: 'includeAmpr041',
                  label: 'Инъекция ampr-emu-ng v0.4.1 (>48 MiB индекс)',
                },
                {
                  key: 'rewriteUpgradableDrm',
                  label: 'Патч param.json: upgradable -> standard DRM',
                },
                {
                  key: 'extract16ProtectedCnt',
                  label: 'Извлечь 16 защищённых CNT (фикс CE-107112-2)',
                },
                {
                  key: 'includeNpOfflineStub',
                  label: 'Оффлайн-стаб libSceNp в fakelib/ (без PSN)',
                },
                {
                  key: 'enableDlcRedirect',
                  label: 'Анлокер всех DLC (addcont + ключи)',
                },
                {
                  key: 'enable60FpsUnlocked',
                  label: 'Включить XML-хуки 60/120 FPS и Debug-меню',
                },
                {
                  key: 'enableUnionFsModLayer',
                  label: 'Слой модов/русификатора Stacked UnionFS',
                },
              ] as const
            ).map((toggle) => (
              <label
                key={toggle.key}
                className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={Boolean(config[toggle.key])}
                  onChange={(e) => updateField(toggle.key, e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{toggle.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Strategy Architecture Summary & Live Compatibility Audit */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 space-y-2.5">
            <div className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
              Активная стратегия: {activeStrategy.shortBadge}
            </div>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {activeStrategy.architectureSummary}
            </p>
            <div className="pt-1 space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Требуемые компоненты на консоли 13.60:
              </div>
              <ul className="space-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                {activeStrategy.requiredRuntimeStack.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 space-y-2.5">
            <div className="text-xs font-semibold text-slate-900 dark:text-white">
              Аудит совместимости рецепта (FW 13.60):
            </div>
            <div className="space-y-2">
              {auditFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-xs"
                >
                  {finding.level === 'ok' ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert
                      className={`h-4 w-4 shrink-0 mt-0.5 ${
                        finding.level === 'critical'
                          ? 'text-rose-500'
                          : 'text-amber-500'
                      }`}
                    />
                  )}
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {finding.title}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {finding.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
