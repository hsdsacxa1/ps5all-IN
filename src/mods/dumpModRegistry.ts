import type {
  DumpModAuditFinding,
  DumpModCatalogItem,
  DumpModCategoryId,
  DumpModGeneratedArtifact,
  DumpModRecipeConfig,
  DumpModStrategyId,
  DumpSymptomDiagnosis,
  DumpSymptomId,
} from '../types/dumpMods.ts';
import { DUMP_SYMPTOMS_DIAGNOSIS } from '../data/dumpSymptomsData.ts';
import { bootAmprNpFixStrategy } from './strategies/bootAmprNpFixStrategy.ts';
import { dlcEntitlementUnlockStrategy } from './strategies/dlcEntitlementUnlockStrategy.ts';
import { fakelibBackportStrategy } from './strategies/fakelibBackportStrategy.ts';
import type { DumpModStrategyHandler } from './strategies/types.ts';
import { unionFsContentOverlayStrategy } from './strategies/unionFsContentOverlayStrategy.ts';
import { xmlPerformancePatchStrategy } from './strategies/xmlPerformancePatchStrategy.ts';

export const DUMP_MOD_STRATEGY_REGISTRY: Record<
  DumpModStrategyId,
  DumpModStrategyHandler
> = {
  'boot-ampr-npfix': bootAmprNpFixStrategy,
  'fakelib-backport': fakelibBackportStrategy,
  'dlc-entitlement-unlock': dlcEntitlementUnlockStrategy,
  'xml-60fps-resolution': xmlPerformancePatchStrategy,
  'unionfs-content-mod': unionFsContentOverlayStrategy,
};

export const DUMP_MOD_STRATEGY_LIST: readonly DumpModStrategyHandler[] = [
  bootAmprNpFixStrategy,
  fakelibBackportStrategy,
  dlcEntitlementUnlockStrategy,
  xmlPerformancePatchStrategy,
  unionFsContentOverlayStrategy,
];

export function getDumpModStrategy(
  strategyId: DumpModStrategyId
): DumpModStrategyHandler {
  return DUMP_MOD_STRATEGY_REGISTRY[strategyId] ?? bootAmprNpFixStrategy;
}

export function generateDumpModArtifacts(
  config: DumpModRecipeConfig
): DumpModGeneratedArtifact[] {
  const strategy = getDumpModStrategy(config.strategyId);
  return strategy.generateArtifacts(config);
}

export function filterDumpModsCatalog(
  items: readonly DumpModCatalogItem[],
  category: DumpModCategoryId,
  query: string
): DumpModCatalogItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  return items.filter((item) => {
    const matchesCategory = category === 'all' || item.category === category;
    const matchesQuery =
      !normalizedQuery ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.repoOrAuthor.toLowerCase().includes(normalizedQuery) ||
      item.summary.toLowerCase().includes(normalizedQuery) ||
      item.technicalMechanism.toLowerCase().includes(normalizedQuery) ||
      item.solvedErrors.some((err) =>
        err.toLowerCase().includes(normalizedQuery)
      ) ||
      item.targetFilesOrPaths.some((p) =>
        p.toLowerCase().includes(normalizedQuery)
      );
    return matchesCategory && matchesQuery;
  });
}

export function getDumpSymptomById(
  symptomId: DumpSymptomId
): DumpSymptomDiagnosis {
  return (
    DUMP_SYMPTOMS_DIAGNOSIS.find((item) => item.id === symptomId) ??
    DUMP_SYMPTOMS_DIAGNOSIS[0]
  );
}

interface DeclarativeAuditRule {
  id: string;
  matches: (config: DumpModRecipeConfig) => boolean;
  buildFinding: (config: DumpModRecipeConfig) => DumpModAuditFinding;
}

const DUMP_RECIPE_AUDIT_RULES: readonly DeclarativeAuditRule[] = [
  {
    id: 'title-id-format',
    matches: (cfg) => !/^PPSA\d{5}$/i.test(cfg.titleId.trim()),
    buildFinding: (cfg) => ({
      id: 'title-id-format',
      level: 'warning',
      title: 'Нестандартный формат Title ID (ожидается PPSAxxxxx)',
      detail: `Текущий идентификатор «${cfg.titleId}» не соответствует маске PS5 PPSAxxxxx (или используется обратная совместимость CUSA). Проверьте папку монтирования.`,
    }),
  },
  {
    id: 'ampr-disabled-warning',
    matches: (cfg) => !cfg.includeAmpr041,
    buildFinding: () => ({
      id: 'ampr-disabled-warning',
      level: 'warning',
      title: 'Отключён эмулятор ampr-emu-ng v0.4.1',
      detail:
        'Для игр на движках с аппаратным APR-стримингом (Spider-Man 2, Ratchet, Horizon) и сжатых .zst/.lz4 паков отключение ampr-emu-ng v0.4.1 приведёт к вылету CE-108255-1.',
    }),
  },
  {
    id: 'upgradable-drm-risk',
    matches: (cfg) => !cfg.rewriteUpgradableDrm,
    buildFinding: () => ({
      id: 'upgradable-drm-risk',
      level: 'critical',
      title: 'Сохраняется флаг applicationDrmType = "upgradable"',
      detail:
        'На оффлайн-консоли 13.60 игры с флагом upgradable требуют PSN-проверки полной лицензии или запускаются в урезанном Trial-режиме. Рекомендуется включить перезапись в "standard".',
    }),
  },
  {
    id: 'cnt-fallbacks-enabled',
    matches: (cfg) => cfg.extract16ProtectedCnt,
    buildFinding: () => ({
      id: 'cnt-fallbacks-enabled',
      level: 'ok',
      title: 'Защита сохранений и трофеев активна (16 CNT Fallbacks + STAMP_V=2)',
      detail:
        'Все 16 мета-контейнеров sce_sys (save_data.png, trophy00.ucp, uds00.ucp, nptitle.dat, npbind.dat) будут извлечены с правами umask(0), предотвращая ошибку CE-107112-2.',
    }),
  },
  {
    id: 'sdk-1360-verified',
    matches: (cfg) => cfg.targetSdkHex.toLowerCase() === '0x13600000',
    buildFinding: () => ({
      id: 'sdk-1360-verified',
      level: 'ok',
      title: 'Целевой порог SDK синхронизирован с прошивкой 13.60 (0x13600000)',
      detail:
        'Заголовки PT_SCE_PROCPARAM и requiredSystemSoftwareVersion соответствуют верхней границе публичного джейлбрейка Relapse / Y2JB.',
    }),
  },
];

export function auditDumpModRecipe(
  config: DumpModRecipeConfig
): DumpModAuditFinding[] {
  return DUMP_RECIPE_AUDIT_RULES.filter((rule) => rule.matches(config)).map(
    (rule) => rule.buildFinding(config)
  );
}
