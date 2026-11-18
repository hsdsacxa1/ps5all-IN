export interface ParsedBridgeInput {
  valid: boolean;
  normalizedUrl: string;
  extractedFromLog: boolean;
  sourceLabel: 'trycloudflare' | 'localhost' | 'lan-http' | 'custom-https' | 'invalid';
  reason?: string;
}

const TRY_CLOUDFLARE_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com(?:\/[^\s|"'<>]*)?/i;
const GENERIC_HTTP_URL_RE = /https?:\/\/[^\s|"'<>]+/gi;

function detectSourceLabel(parsed: URL): ParsedBridgeInput['sourceLabel'] {
  if (parsed.hostname.endsWith('.trycloudflare.com')) {
    return 'trycloudflare';
  }
  if (
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === 'localhost' ||
    parsed.hostname === '::1'
  ) {
    return 'localhost';
  }
  if (parsed.protocol === 'https:') {
    return 'custom-https';
  }
  return 'lan-http';
}

function stripBridgeSuffix(rawUrl: string): string {
  return rawUrl
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/mcp$/i, '')
    .replace(/\/api\/version$/i, '');
}

export function extractBridgeUrlFromText(rawInput: string): ParsedBridgeInput {
  const input = rawInput.trim();
  if (!input) {
    return {
      valid: false,
      normalizedUrl: '',
      extractedFromLog: false,
      sourceLabel: 'invalid',
      reason: 'Введите URL моста или вставьте вывод cloudflared.',
    };
  }

  const cfMatch = input.match(TRY_CLOUDFLARE_RE);
  if (cfMatch) {
    try {
      const cleaned = stripBridgeSuffix(cfMatch[0]);
      const parsed = new URL(cleaned);
      return {
        valid: true,
        normalizedUrl: parsed.origin,
        extractedFromLog: input.includes('\n') || input.length > cleaned.length + 4,
        sourceLabel: 'trycloudflare',
      };
    } catch {
      // Fall through to generic URL scan
    }
  }

  const allUrls = input.match(GENERIC_HTTP_URL_RE) ?? [];
  const nonCloudflareDocUrl = allUrls.find((candidate) => {
    try {
      const u = new URL(candidate);
      return (
        u.hostname !== 'www.cloudflare.com' &&
        u.hostname !== 'developers.cloudflare.com' &&
        u.hostname !== 'api.cloudflare.com' &&
        !u.hostname.endsWith('.argotunnel.com')
      );
    } catch {
      return false;
    }
  });

  const candidateUrl = nonCloudflareDocUrl ?? stripBridgeSuffix(input);
  try {
    const parsed = new URL(stripBridgeSuffix(candidateUrl));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        normalizedUrl: '',
        extractedFromLog: false,
        sourceLabel: 'invalid',
        reason: 'Поддерживаются только протоколы http:// и https://.',
      };
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    return {
      valid: true,
      normalizedUrl: `${parsed.origin}${cleanPath}`,
      extractedFromLog: input.includes('\n') || input.length > candidateUrl.length + 8,
      sourceLabel: detectSourceLabel(parsed),
    };
  } catch {
    return {
      valid: false,
      normalizedUrl: '',
      extractedFromLog: false,
      sourceLabel: 'invalid',
      reason: 'Не удалось распознать корректный URL моста (ожидается https://...trycloudflare.com или http://127.0.0.1:19113).',
    };
  }
}

export function formatBytesCompact(bytes?: number | null): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
    return '—';
  }
  if (bytes === 0) return '0 B';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`;
}
