function normalizeHeaderValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return normalizeHeaderValue(value[0]);
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  return trimmed || undefined;
}

export function parseRetryAfterSeconds(value: unknown): number | null {
  const normalized = normalizeHeaderValue(value);
  if (!normalized) return null;

  const numericValue = Number(normalized);
  if (Number.isFinite(numericValue) && numericValue >= 0) {
    return Math.ceil(numericValue);
  }

  const dateValue = Date.parse(normalized);
  if (!Number.isNaN(dateValue)) {
    return Math.max(Math.ceil((dateValue - Date.now()) / 1000), 0);
  }

  return null;
}

export function buildRateLimitMessage(retryAfter: unknown, backendMessage?: string): string {
  const seconds = parseRetryAfterSeconds(retryAfter);

  if (seconds !== null) {
    return `Слишком много запросов. Повторите через ${seconds} секунд.`;
  }

  return backendMessage || 'Слишком много запросов. Повторите немного позже.';
}
