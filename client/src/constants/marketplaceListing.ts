import type { MarketplaceListingStatus } from '../types';

export const MARKETPLACE_LISTING_STATUS_LABELS: Record<MarketplaceListingStatus, string> = {
  not_started: 'Не начато',
  placing: 'В процессе размещения',
  moderation: 'Модерация',
  published: 'Опубликовано',
  in_sale: 'В продаже',
  blocked: 'Заблокировано',
  removed: 'Снято',
};

export const MARKETPLACE_LISTING_STATUS_OPTIONS: Array<{
  value: MarketplaceListingStatus;
  label: string;
}> = Object.entries(MARKETPLACE_LISTING_STATUS_LABELS).map(([value, label]) => ({
  value: value as MarketplaceListingStatus,
  label,
}));

export function getMarketplaceListingStatusLabel(status?: MarketplaceListingStatus | null) {
  return status ? MARKETPLACE_LISTING_STATUS_LABELS[status] ?? status : null;
}
