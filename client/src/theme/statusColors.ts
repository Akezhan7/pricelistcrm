/**
 * Centralized status → Tailwind class mappings.
 * Registry only — migrate usages from pages/components in later phases.
 */
import type { CollectorTaskStatus, OrderStatus, PaymentStatus, StockStatus } from '../types';

/** Badge classes: bg + text (+ optional border) */
export type StatusBadgeClasses = string;

const badge = (bg: string, text: string, border?: string): StatusBadgeClasses =>
  border ? `${bg} ${text} ${border}` : `${bg} ${text}`;

/** Order workflow statuses (Orders.tsx, OrderDetails.tsx) */
export const orderStatusColors: Record<OrderStatus, StatusBadgeClasses> = {
  'Создана': badge('bg-gray-100', 'text-gray-800', 'border border-gray-200'),
  'Отправлена поставщику': badge('bg-blue-100', 'text-blue-800', 'border border-blue-200'),
  'Частично подтверждена': badge('bg-yellow-100', 'text-yellow-800', 'border border-yellow-200'),
  'Подтверждена': badge('bg-green-100', 'text-green-800', 'border border-green-200'),
  'Доставка': badge('bg-orange-100', 'text-orange-800', 'border border-orange-200'),
  'В сборе': badge('bg-purple-100', 'text-purple-800', 'border border-purple-200'),
  'Забрана': badge('bg-indigo-100', 'text-indigo-800', 'border border-indigo-200'),
  'Принята на складе': badge('bg-teal-100', 'text-teal-800', 'border border-teal-200'),
  'Закрыта': badge('bg-gray-200', 'text-gray-600', 'border border-gray-300'),
  'Отменена': badge('bg-red-100', 'text-red-700', 'border border-red-200'),
};

/** Compact variant without borders (Orders list) */
export const orderStatusColorsCompact: Record<OrderStatus, StatusBadgeClasses> = {
  'Создана': badge('bg-gray-100', 'text-gray-800'),
  'Отправлена поставщику': badge('bg-blue-100', 'text-blue-800'),
  'Частично подтверждена': badge('bg-yellow-100', 'text-yellow-800'),
  'Подтверждена': badge('bg-green-100', 'text-green-800'),
  'Доставка': badge('bg-orange-100', 'text-orange-800'),
  'В сборе': badge('bg-purple-100', 'text-purple-800'),
  'Забрана': badge('bg-indigo-100', 'text-indigo-800'),
  'Принята на складе': badge('bg-teal-100', 'text-teal-800'),
  'Закрыта': badge('bg-gray-200', 'text-gray-600'),
  'Отменена': badge('bg-red-100', 'text-red-700'),
};

/** Legacy / delivery sub-statuses used in OrderDetails timeline */
export const deliveryStatusColors: Record<string, StatusBadgeClasses> = {
  'В работе': badge('bg-blue-100', 'text-blue-800', 'border border-blue-200'),
  'На точке': badge('bg-yellow-100', 'text-yellow-800', 'border border-yellow-200'),
  'В пути': badge('bg-purple-100', 'text-purple-800', 'border border-purple-200'),
  'На складе': badge('bg-green-100', 'text-green-800', 'border border-green-200'),
};

/** Payment statuses */
export const paymentStatusColors: Record<PaymentStatus, StatusBadgeClasses> = {
  'Не оплачено': badge('bg-red-100', 'text-red-800'),
  'Частично оплачено': badge('bg-orange-100', 'text-orange-800'),
  'Оплачено': badge('bg-green-100', 'text-green-800'),
};

/** Stock level indicators (StockDashboard.tsx) */
export const stockStatusColors: Record<StockStatus, StatusBadgeClasses> = {
  critical: badge('bg-red-100', 'text-red-800', 'border border-red-300'),
  low: badge('bg-yellow-100', 'text-yellow-800', 'border border-yellow-300'),
  medium: badge('bg-orange-100', 'text-orange-800', 'border border-orange-300'),
  good: badge('bg-green-100', 'text-green-800', 'border border-green-300'),
};

/** Collector task statuses */
export const collectorTaskStatusColors: Record<CollectorTaskStatus, StatusBadgeClasses> = {
  pending: badge('bg-gray-100', 'text-gray-800'),
  in_progress: badge('bg-blue-100', 'text-blue-800'),
  completed: badge('bg-green-100', 'text-green-800'),
};

export function getOrderStatusColor(
  status: OrderStatus,
  variant: 'default' | 'compact' = 'default'
): StatusBadgeClasses {
  const map = variant === 'compact' ? orderStatusColorsCompact : orderStatusColors;
  return map[status] ?? badge('bg-gray-100', 'text-gray-800', 'border border-gray-200');
}

export function getPaymentStatusColor(status: PaymentStatus): StatusBadgeClasses {
  return paymentStatusColors[status] ?? badge('bg-gray-100', 'text-gray-800');
}

export function getStockStatusColor(status: StockStatus): StatusBadgeClasses {
  return stockStatusColors[status] ?? badge('bg-gray-100', 'text-gray-800', 'border border-gray-300');
}
