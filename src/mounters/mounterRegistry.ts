import { MounterEngineId, MounterEngineSpec, MounterStrategy } from '../types/mounter';
import { krakenMountStrategy } from './krakenMountStrategy';
import { krakenShadowMixStrategy } from './krakenShadowMixStrategy';
import { shadowMountStrategy } from './shadowMountStrategy';

export const MOUNTER_STRATEGY_REGISTRY: Record<MounterEngineId, MounterStrategy> = {
  'kraken-shadow-mix': krakenShadowMixStrategy,
  'kraken-mount-0.0.1-beta': krakenMountStrategy,
  'shadowmount-1.7': shadowMountStrategy,
};

export function getMounterStrategy(engineId: MounterEngineId): MounterStrategy {
  return MOUNTER_STRATEGY_REGISTRY[engineId];
}

export function listMounterSpecs(): MounterEngineSpec[] {
  return Object.values(MOUNTER_STRATEGY_REGISTRY).map((s) => s.spec);
}

export interface MounterComparisonRow {
  feature: string;
  shadowMount: string;
  krakenMount: string;
  unifiedMix: string;
}

export const MOUNTER_COMPARISON_MATRIX: MounterComparisonRow[] = [
  {
    feature: 'Репозиторий и режим',
    shadowMount: 'drakmor/ShadowMountPlus (v1.7beta11)',
    krakenMount: 'quer3q/kraken-mount (v0.0.1-beta сток)',
    unifiedMix: 'KrakenShadow-Mix v1.0 (Единый гибрид без переключения)',
  },
  {
    feature: 'Поведение при одновременном запуске',
    shadowMount: 'Перехватывает common/lib первым (global fakelib)',
    krakenMount: 'Отменяет монтирование (occupied by unionfs; not mounting -> вылет)',
    unifiedMix: 'Stacked UnionFS: накладывает fakelib (ampr-emu-ng) поверх слоя SMP + /app0/kraken',
  },
  {
    feature: 'Поддержка .pkg со Sparse Extents (0x40)',
    shadowMount: 'Не монтирует .pkg напрямую',
    krakenMount: 'Ошибка: layout has a sparse extent; repack with --kraken stored',
    unifiedMix: 'Исправлено (fill_sparse + кэширование): запускает Demon’s Souls, Split Fiction и др.',
  },
  {
    feature: 'Глубина поиска папок и путей',
    shadowMount: '/data/homebrew/ + USB',
    krakenMount: 'Строго 1 уровень (/data/homebrew, /data/etaHEN/games, корень USB)',
    unifiedMix: '2 уровня вглубь (видит вложенные /homebrew/Game/game.pkg, /data/games, /usb0/pkgs)',
  },
  {
    feature: 'Поддерживаемые форматы',
    shadowMount: 'folder, .ffpkg (UFS2), .ffpfsc (mkpfs)',
    krakenMount: ' только .pkg, folder (plain / ampr_zstd.index / ampr_assets.index)',
    unifiedMix: 'ВСЕ 6 ФОРМАТОВ: .pkg, zstd, lz4, folder + авто-мост на 10101 для .ffpkg и .ffpfsc',
  },
];
