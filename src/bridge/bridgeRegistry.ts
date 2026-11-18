import {
  Ps5DirEntry,
  Ps5FilePreviewResult,
  Ps5InstalledGame,
  Ps5ProcessEntry,
} from '../types/bridge';

export type TitlePlatformKind = 'ps5' | 'ps4' | 'homebrew';

interface TitlePlatformDescriptor {
  kind: TitlePlatformKind;
  label: string;
  textClass: string;
}

const TITLE_PREFIX_RULES: ReadonlyArray<{
  matches: (titleId: string) => boolean;
  descriptor: TitlePlatformDescriptor;
}> = [
  {
    matches: (id) => id.startsWith('PPSA'),
    descriptor: {
      kind: 'ps5',
      label: 'PS5 Native (PPSA)',
      textClass: 'text-sky-400',
    },
  },
  {
    matches: (id) => id.startsWith('CUSA'),
    descriptor: {
      kind: 'ps4',
      label: 'PS4 Backcompat (CUSA)',
      textClass: 'text-amber-400',
    },
  },
  {
    matches: () => true,
    descriptor: {
      kind: 'homebrew',
      label: 'Homebrew / System',
      textClass: 'text-emerald-400',
    },
  },
];

export function classifyTitleId(titleId: string): TitlePlatformDescriptor {
  const normalized = titleId.trim().toUpperCase();
  const matched = TITLE_PREFIX_RULES.find((rule) => rule.matches(normalized));
  return (
    matched?.descriptor ?? {
      kind: 'homebrew',
      label: 'Homebrew / System',
      textClass: 'text-emerald-400',
    }
  );
}

export function normalizeProcessList(raw: unknown): Ps5ProcessEntry[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (item): item is Ps5ProcessEntry =>
        Boolean(item) && typeof item === 'object' && typeof (item as Ps5ProcessEntry).name === 'string'
    );
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as { processes?: unknown; items?: unknown };
    const candidate = obj.processes ?? obj.items;
    if (Array.isArray(candidate)) {
      return normalizeProcessList(candidate);
    }
  }
  return [];
}

export function normalizeInstalledGames(raw: unknown): Ps5InstalledGame[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (item): item is Ps5InstalledGame =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as Ps5InstalledGame).title_id === 'string'
    );
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as { games?: unknown; titles?: unknown };
    const candidate = obj.games ?? obj.titles;
    if (Array.isArray(candidate)) {
      return normalizeInstalledGames(candidate);
    }
  }
  return [];
}

export function sortDirEntries(entries: Ps5DirEntry[]): Ps5DirEntry[] {
  return [...entries].sort((a, b) => {
    const aIsDir = a.kind === 'dir' ? 0 : 1;
    const bIsDir = b.kind === 'dir' ? 0 : 1;
    if (aIsDir !== bIsDir) return aIsDir - bIsDir;
    return a.name.localeCompare(b.name);
  });
}

function decodeBase64Utf8(b64: string): string {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return b64;
  }
}

export function extractPreviewText(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (!raw || typeof raw !== 'object') return '';
  const data = raw as Ps5FilePreviewResult & {
    preview?: string;
    data?: string;
    base64?: string;
  };
  if (typeof data.base64 === 'string') return decodeBase64Utf8(data.base64);
  if (typeof data.text === 'string') return data.text;
  if (typeof data.content === 'string') return data.content;
  if (typeof data.preview === 'string') return data.preview;
  if (typeof data.data === 'string') return data.data;
  return JSON.stringify(raw, null, 2);
}

export function substituteConsolePath(template: string, consoleHost: string): string {
  return template.replaceAll('{console}', encodeURIComponent(consoleHost));
}

export function substituteBodyTemplate(
  template: Record<string, unknown> | undefined,
  consoleHost: string
): Record<string, unknown> | undefined {
  if (!template) return undefined;
  const entries = Object.entries(template).map(([key, value]) => [
    key,
    typeof value === 'string' ? value.replaceAll('{console}', consoleHost) : value,
  ]);
  return Object.fromEntries(entries);
}
