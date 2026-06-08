/**
 * Shared formatting utilities (ru-RU locale).
 * Migrate inline toLocaleString calls in later phases.
 */

export type FormatPriceOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

/**
 * Format a number as currency value (ru-RU), without currency symbol.
 * Default: 2 decimal places (e.g. "1 234,56").
 */
export function formatPrice(
  value: number | string | null | undefined,
  options: FormatPriceOptions = {}
): string {
  const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options;

  if (value === null || value === undefined) {
    return (0).toLocaleString('ru-RU', { minimumFractionDigits, maximumFractionDigits });
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) {
    return (0).toLocaleString('ru-RU', { minimumFractionDigits, maximumFractionDigits });
  }

  return num.toLocaleString('ru-RU', { minimumFractionDigits, maximumFractionDigits });
}

/** Format price with Kazakhstani tenge symbol (₸) */
export function formatPriceKZT(
  value: number | string | null | undefined,
  options?: FormatPriceOptions
): string {
  return `${formatPrice(value, options)} ₸`;
}

/** Format price with Russian ruble symbol (₽) */
export function formatPriceRUB(
  value: number | string | null | undefined,
  options?: FormatPriceOptions
): string {
  return `${formatPrice(value, options)} ₽`;
}
