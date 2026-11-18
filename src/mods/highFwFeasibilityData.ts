import type {
  FeasibilityVerdictLevel,
  HighFwTierId,
  HighFwTierProfile,
  TechnicalGateDefinition,
  TechnicalGateId,
} from '../types/highFwFeasibility.ts';
import type { DumpModRecipePreset } from '../types/dumpMods.ts';

export const HIGH_FW_TIER_MAP: Record<HighFwTierId, HighFwTierProfile> = {
  '13.60-public': {
    id: '13.60-public',
    label: 'FW 13.60 (Публичный стек)',
    fwBadge: 'FW 13.60 · Tethered JB',
    publicJailbreak: true,
    publicDumper: true,
    baseAccessScore: 40,
    statusSummary:
      'Верхняя граница публичных эксплойтов на 18.11.2026: Y2JB / WebKit + Relapse + Byepervisor-Reborn + kstuff-lite v1.11 + Kraken Mount v0.2.1.',
    sceneRealityNote:
      'Все игры с SDK ≤ 13.60 запускаются и дампятся напрямую. Более новые тайтлы (14.xx) требуют внешнего расшифрованного дампа и бэкпорта через BackPork + fakelib.',
    upgradeAdvice:
      'Оставаться на 13.60 (DNS 127.0.0.2 / блок обновлений). Обновление на 14.xx необратимо лишает джейлбрейка.',
  },
  '14.00-14.21': {
    id: '14.00-14.21',
    label: 'FW 14.00–14.21 (Закрыт браузер/Relapse)',
    fwBadge: 'FW 14.00–14.21 · No Public JB',
    publicJailbreak: false,
    publicDumper: false,
    baseAccessScore: 10,
    statusSummary:
      'Уязвимость браузера и публичный ядерный вектор Relapse закрыты Sony. Публичных payload-загрузчиков и дамперов нет.',
    sceneRealityNote:
      'Приватные исследования без релиза; запустить homebrew, kstuff или Kraken Mount невозможно.',
    upgradeAdvice:
      'Не обновляться выше текущей прошивки. С 13.60 переход на 14.00–14.21 не даёт ни одной функции homebrew.',
  },
  '14.22-private': {
    id: '14.22-private',
    label: 'FW 14.22 (Заявление Gezine / GTA VI)',
    fwBadge: 'FW 14.22 · Private PoC Only',
    publicJailbreak: false,
    publicDumper: false,
    baseAccessScore: 15,
    statusSummary:
      'Исследователь Gezine сообщил в соцсетях о приватном дампе бинарника на FW 14.22 (целевой версии под релиз GTA VI 19.11.2026) без публикации инструментов, эксплойтов или дампов.',
    sceneRealityNote:
      'Обсуждение r/ps5homebrew (1xzfh2m): Echo Stretch предупредил, что перспективы публичного дампа на 14.xx плохие; сообщество ожидает закрытых баг-баунти/NDA без скорого релиза.',
    upgradeAdvice:
      'Категорически НЕ обновлять 13.60 до 14.22 ради слухов: без публичного kstuff и дампера консоль станет полностью закрытой.',
  },
  '14.23-patched': {
    id: '14.23-patched',
    label: 'FW 14.23 (Экстренный патч Sony)',
    fwBadge: 'FW 14.23 · Patched',
    publicJailbreak: false,
    publicDumper: false,
    baseAccessScore: 0,
    statusSummary:
      'Sony оперативно выпустила системное обновление 14.23, закрывающее вектор безопасности, фигурировавший в отчётах о 14.22.',
    sceneRealityNote:
      'Полная блокировка публичного дампа и джейлбрейка; онлайн-доступ PSN требует актуальной прошивки.',
    upgradeAdvice:
      'Для homebrew-сцены 14.23 — тупик. Для легального запуска GTA VI безопаснее отдельная немодифицированная консоль.',
  },
};

export const HIGH_FW_TIER_LIST: readonly HighFwTierProfile[] = [
  HIGH_FW_TIER_MAP['13.60-public'],
  HIGH_FW_TIER_MAP['14.00-14.21'],
  HIGH_FW_TIER_MAP['14.22-private'],
  HIGH_FW_TIER_MAP['14.23-patched'],
];

export const TECHNICAL_GATES: readonly TechnicalGateDefinition[] = [
  {
    id: 'decrypted-self-pfs',
    title: 'Расшифрованные ELF/SELF и PFS-ассеты доступны публично',
    weight: 25,
    technicalDetail:
      'Консоль 13.60 не имеет ключей расшифровки 14.xx и публичного дампера для FW 14.22. Для запуска нужен уже расшифрованный дамп с приватного dev/research-стенда.',
    failureReason:
      'Нет публичного дампера 14.22 — зашифрованные retail PFS/SELF от GTA VI невозможно прочитать на 13.60.',
  },
  {
    id: 'fakelib-prx-abi',
    title: 'Совместимость libSce* PRX через BackPork + fakelib/',
    weight: 15,
    technicalDetail:
      'При сборке под SDK 14.xx игра вызывает новые NID-экспорты (libSceNp, libSceAmpr, libc/libkernel). Требуется даунгрейд param.json + selfutil-patched и подмена PRX в fakelib/.',
    failureReason:
      'Отсутствующие 14.xx NID-экспорты в прошивке 13.60 вызовут мгновенный краш динамического линковщика (CE-108255-1).',
  },
  {
    id: 'no-new-syscalls-a53',
    title: 'Нет жёсткой привязки к новым syscalls ядра 14.xx и A53/HV',
    weight: 10,
    technicalDetail:
      'Пользовательский fakelib перехватывает .sprx, но не может добавить новые системные вызовы ядра FreeBSD 14.xx или обход аппаратного сопроцессора A53/MP4 без ядерного патча.',
    failureReason:
      'Новые syscalls ядра 14.xx или проверки A53/MP4 нельзя обойти одним BackPork — нужен бэкпорт патчей ядра/HV.',
  },
  {
    id: 'ampr-256mib-streaming',
    title: 'Стриминг открытого мира укладывается в ampr-emu-ng (256 MiB PRX)',
    weight: 10,
    technicalDetail:
      'В ampr-emu-ng (17.11.2026) пул PRX увеличен до 256 MiB (до 204 MiB под кэш zstd). Сверхплотные open-world индексы (RAGE / GTA VI) проверяют пределы DMA-эмуляции.',
    failureReason:
      'Переполнение таблицы индексов ampr_emu.index или деградация I/O приводит к фризам стриминга и CE-108255-1.',
  },
];

export const DEFAULT_GATE_STATE_BY_TIER: Record<
  HighFwTierId,
  readonly TechnicalGateId[]
> = {
  '13.60-public': [
    'decrypted-self-pfs',
    'fakelib-prx-abi',
    'no-new-syscalls-a53',
    'ampr-256mib-streaming',
  ],
  '14.00-14.21': ['ampr-256mib-streaming'],
  '14.22-private': ['ampr-256mib-streaming'],
  '14.23-patched': [],
};

export const VERDICT_META: Record<
  FeasibilityVerdictLevel,
  { readonly label: string; readonly summary: string; readonly badgeClass: string }
> = {
  'ready-1360': {
    label: 'Готово на 13.60',
    summary:
      'Целевой стек 13.60 полностью поддерживается публичными инструментами (Kraken Mount v0.2.1 + ampr-emu-ng 256 MiB + BackPork).',
    badgeClass:
      'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70',
  },
  'conditional-backport': {
    label: 'Условный бэкпорт 14.xx → 13.60',
    summary:
      'Теоретически возможно только при внешнем расшифрованном дампе + полном пакете BackPork fakelib (14.xx → 13.60) без новых syscalls ядра.',
    badgeClass:
      'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/70',
  },
  'blocked-private': {
    label: 'Заблокировано: приватный PoC (без релиза)',
    summary:
      'Публичного дампа или джейлбрейка для 14.22 нет. Заявления исследователей (Gezine) не означают скорый релиз играбельного дампа GTA VI (позиция Echo Stretch).',
    badgeClass:
      'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70',
  },
  'patched-deadend': {
    label: 'Закрыто патчем Sony (14.23)',
    summary:
      'Прошивка 14.23 закрыла вектор безопасности. Публичных путей дампа или запуска homebrew на ней нет.',
    badgeClass:
      'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
  },
};

export const GTA6_BACKPORT_LAB_PRESET: DumpModRecipePreset = {
  gameTitle: 'High-FW 14.22 -> 13.60 Backport Template (R&D)',
  titleId: 'PPSA14220',
  contentVersion: '01.000.000',
  targetSdkHex: '0x13600000',
  strategyId: 'fakelib-backport',
  includeAmpr041: true,
  includeNpOfflineStub: true,
  rewriteUpgradableDrm: true,
  extract16ProtectedCnt: true,
  enable60FpsUnlocked: false,
  enableDlcRedirect: false,
  enableUnionFsModLayer: false,
};
