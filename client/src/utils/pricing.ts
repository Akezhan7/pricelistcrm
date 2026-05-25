/**
 * Утилиты ценообразования для прайс-листа.
 */

/**
 * Применить процентную наценку к стоимости.
 * applyMarkup(100, 30) === 130
 */
export const applyMarkup = (price: number, markupPercent: number): number => {
  if (!Number.isFinite(price)) return 0;
  if (!Number.isFinite(markupPercent)) return price;
  return price * (1 + markupPercent / 100);
};

/**
 * Округление до ближайших 5 по правилам клиента:
 *   192/193 → 195
 *   191    → 190
 *   194    → 195
 * Логика: смотрим младшие 5; если последняя цифра 1, округляем вниз;
 * если 2 — округляем вверх; для 3 — вверх; для 4 — вверх. Иначе обычное «к ближайшему» к 5.
 *
 * Алгоритм:
 *   remainder = price mod 5
 *   - remainder === 0 → price
 *   - remainder <= 1  → price - remainder   (округление вниз)
 *   - remainder >= 2  → price + (5 - remainder)  (округление вверх)
 *
 * Это согласуется с примерами:
 *   190 → 190 (rem=0)
 *   191 → 190 (rem=1, вниз)
 *   192 → 195 (rem=2, вверх)
 *   193 → 195 (rem=3, вверх)
 *   194 → 195 (rem=4, вверх)
 *   195 → 195 (rem=0)
 */
export const roundToNearest5 = (price: number): number => {
  if (!Number.isFinite(price)) return 0;
  const rounded = Math.round(price);
  const remainder = ((rounded % 5) + 5) % 5; // безопасно для отрицательных
  if (remainder === 0) return rounded;
  if (remainder <= 1) return rounded - remainder;
  return rounded + (5 - remainder);
};

/**
 * Конечная цена прайса: cost * (1 + markup) → округлённая до 5.
 */
export const calculatePriceListValue = (
  costPrice: number,
  markupPercent: number
): number => roundToNearest5(applyMarkup(costPrice, markupPercent));
