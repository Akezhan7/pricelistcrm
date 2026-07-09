import type { ProductLifecycleStatus } from '../types';

export const PRODUCT_LIFECYCLE_LABELS: Record<ProductLifecycleStatus, string> = {
  new: 'Новый',
  assigned_to_designer: 'У дизайнера',
  content_created: 'Карточка создана',
  review: 'Проверка',
  revision: 'Доработка',
  marketplace: 'Маркетплейс',
  purchase: 'Закуп',
  warehouse: 'Склад',
  in_sale: 'В продаже',
  archived: 'Архив',
};

export const PRODUCT_LIFECYCLE_FILTERS: Array<{
  value: '' | ProductLifecycleStatus;
  label: string;
}> = [
  { value: '', label: 'Все этапы' },
  { value: 'new', label: PRODUCT_LIFECYCLE_LABELS.new },
  { value: 'assigned_to_designer', label: PRODUCT_LIFECYCLE_LABELS.assigned_to_designer },
  { value: 'in_sale', label: PRODUCT_LIFECYCLE_LABELS.in_sale },
  { value: 'archived', label: PRODUCT_LIFECYCLE_LABELS.archived },
];

export const PRODUCT_LIFECYCLE_ALL_FILTERS: Array<{
  value: '' | ProductLifecycleStatus;
  label: string;
}> = [
  { value: '', label: 'Все этапы' },
  ...Object.entries(PRODUCT_LIFECYCLE_LABELS).map(([value, label]) => ({
    value: value as ProductLifecycleStatus,
    label,
  })),
];

export function getProductLifecycleLabel(status?: ProductLifecycleStatus | null) {
  return status ? PRODUCT_LIFECYCLE_LABELS[status] ?? status : null;
}
