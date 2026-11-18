import { BridgeActionCategory, BridgeEndpointSpec } from '../types/bridge';

export const DEFAULT_TUNNEL_PRESET_URL =
  'https://bluetooth-clothes-headphones-castle.trycloudflare.com';

export const PS5_DIRECTORY_PRESETS: ReadonlyArray<{ path: string; label: string }> = [
  { path: '/data', label: '/data' },
  { path: '/data/agent_bus', label: '/data/agent_bus' },
  { path: '/data/titan-core', label: '/data/titan-core' },
  { path: '/data/titan-core/debug', label: '/data/titan-core/debug' },
  { path: '/data/homebrew', label: '/data/homebrew' },
  { path: '/data/shadowmount', label: '/data/shadowmount' },
  { path: '/data/pldmgr', label: '/data/pldmgr' },
  { path: '/user/app', label: '/user/app' },
];

export const ACTION_CATEGORY_META: Record<
  BridgeActionCategory,
  { label: string; textClass: string; requiresConfirm: boolean }
> = {
  read: {
    label: 'Чтение (Read-Only)',
    textClass: 'text-emerald-400',
    requiresConfirm: false,
  },
  mutate: {
    label: 'Изменение (Требует подтверждения)',
    textClass: 'text-amber-400',
    requiresConfirm: true,
  },
  destructive: {
    label: 'Опасная операция (Подтверждение)',
    textClass: 'text-rose-400',
    requiresConfirm: true,
  },
};

export const BRIDGE_ENDPOINT_CATALOG: ReadonlyArray<BridgeEndpointSpec> = [
  {
    id: 'ps5-status',
    label: 'Статус хелпера и ядра',
    method: 'GET',
    pathTemplate: '/api/ps5/status?addr={console}',
    category: 'read',
    description: 'Версия ps5upload helper, ревизия ядра PS5 (13.60), ucred и счётчик команд.',
  },
  {
    id: 'ps5-hw-info',
    label: 'Аппаратный профиль PS5',
    method: 'GET',
    pathTemplate: '/api/ps5/hw/info?addr={console}',
    category: 'read',
    description: 'Модель ревизии (CFI-*), CPU/RAM, сетевые модули.',
  },
  {
    id: 'ps5-hw-temps',
    label: 'Датчики температур и частот',
    method: 'GET',
    pathTemplate: '/api/ps5/hw/temps?addr={console}&extended=true',
    category: 'read',
    description: 'Температура CPU, SoC, M.2 SSD и целевая температура вентилятора.',
  },
  {
    id: 'ps5-smp-status',
    label: 'Состояние ShadowMountPlus',
    method: 'GET',
    pathTemplate: '/api/ps5/smp/status?addr={console}',
    category: 'read',
    description: 'Проверка установки, процесса, config.ini и хвоста debug_log_tail.',
  },
  {
    id: 'ps5-process-list',
    label: 'Активные процессы PS5',
    method: 'GET',
    pathTemplate: '/api/ps5/process/list?addr={console}',
    category: 'read',
    description: 'Список процессов (SceShellUI, SceShellCore, запущенные игры).',
  },
  {
    id: 'ps5-smp-rescan',
    label: 'Пересканировать ShadowMountPlus',
    method: 'POST',
    pathTemplate: '/api/ps5/smp/rescan?addr={console}',
    category: 'mutate',
    description: 'Запускает пересканирование каталогов монтирования через ps5upload.',
    defaultBody: {},
  },
  {
    id: 'ps5-app-launch',
    label: 'Запустить Title ID',
    method: 'POST',
    pathTemplate: '/api/ps5/app/launch',
    category: 'mutate',
    description: 'Запуск зарегистрированного тайтла через sceLncUtilLaunchApp.',
    defaultBody: { addr: '{console}', title_id: 'CUSA08519' },
  },
  {
    id: 'ps5-shell-run',
    label: 'Выполнить команду Shell (Read/Diag)',
    method: 'POST',
    pathTemplate: '/api/ps5/shell/run',
    category: 'destructive',
    description: 'Выполнение команды на PS5 через helper shell runner (только с подтверждением).',
    defaultBody: { addr: '{console}', cmd: 'ls -la /data/homebrew', timeout_s: 10 },
  },
];

export const BRIDGE_ENDPOINT_MAP: Record<string, BridgeEndpointSpec> = Object.fromEntries(
  BRIDGE_ENDPOINT_CATALOG.map((spec) => [spec.id, spec])
);
