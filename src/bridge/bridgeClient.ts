import {
  BridgeConsoleOverview,
  BridgeProbeResponse,
  Ps5DirListing,
} from '../types/bridge';
import { BuiltElfArtifactId, BuiltElfDiskInfo } from './builtElfCatalog';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok && !(payload && typeof payload === 'object' && 'ok' in payload)) {
    throw new Error(payload?.error || `HTTP ${response.status}`);
  }
  return payload;
}

export async function fetchBuiltElfCatalog(): Promise<BuiltElfDiskInfo[]> {
  const response = await fetch('/api/bridge/built-elfs', { cache: 'no-store' });
  const payload = (await response.json()) as {
    ok?: boolean;
    artifacts?: BuiltElfDiskInfo[];
    error?: string;
  };
  if (!response.ok || !Array.isArray(payload?.artifacts)) {
    throw new Error(payload?.error || `HTTP ${response.status}`);
  }
  return payload.artifacts;
}

export async function probeBridge(bridgeUrl: string): Promise<BridgeProbeResponse> {
  return postJson<BridgeProbeResponse>('/api/bridge/probe', { bridgeUrl });
}

export async function fetchConsoleOverview(
  bridgeUrl: string,
  consoleAddr: string
): Promise<BridgeConsoleOverview> {
  return postJson<BridgeConsoleOverview>('/api/bridge/overview', {
    bridgeUrl,
    consoleAddr,
  });
}

export async function listPs5Directory(
  bridgeUrl: string,
  consoleAddr: string,
  dirPath: string
): Promise<Ps5DirListing> {
  const res = await postJson<{
    ok: boolean;
    data: Ps5DirListing;
    error?: string;
  }>('/api/bridge/proxy', {
    bridgeUrl,
    method: 'GET',
    path: `/api/ps5/list-dir?addr=${encodeURIComponent(consoleAddr)}&path=${encodeURIComponent(dirPath)}&offset=0&limit=250`,
  });
  if (!res.ok) {
    throw new Error(res.error || 'Не удалось получить содержимое каталога PS5.');
  }
  return res.data;
}

export async function readPs5FilePreview(
  bridgeUrl: string,
  consoleAddr: string,
  filePath: string,
  maxBytes = 65536
): Promise<unknown> {
  const res = await postJson<{ ok: boolean; data: unknown; error?: string }>(
    '/api/bridge/proxy',
    {
      bridgeUrl,
      method: 'POST',
      path: '/api/ps5/fs/read-preview',
      body: {
        addr: consoleAddr,
        path: filePath,
        max_bytes: maxBytes,
      },
    }
  );
  if (!res.ok) {
    throw new Error(res.error || `Ошибка чтения файла ${filePath}`);
  }
  return res.data;
}

export async function executeBridgeProxyRequest(params: {
  bridgeUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
}): Promise<{ ok: boolean; status: number; latencyMs: number; data: unknown; error?: string }> {
  return postJson('/api/bridge/proxy', params);
}

export async function pushBuiltElfToConsole(params: {
  bridgeUrl: string;
  consoleAddr: string;
  port: number;
  artifact?: BuiltElfArtifactId;
}): Promise<{
  ok: boolean;
  status: number;
  artifact: string;
  sizeBytes: number;
  consoleAddr: string;
  port: number;
  data: unknown;
  error?: string;
}> {
  return postJson('/api/bridge/push-built-elf', params);
}
