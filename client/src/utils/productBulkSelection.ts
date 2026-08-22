import type { Product } from '../types';

export type ProductBulkActionMode = 'assign_designer' | 'start_lifecycle';

export function getBulkSelectableProductIds(
  products: Product[],
  mode: ProductBulkActionMode
): number[] {
  return products
    .filter((product) => (
      mode === 'assign_designer'
        ? product.lifecycleStatus === 'new'
        : product.lifecycleStatus === 'in_sale' && !product.lifecycleStartedAt
    ))
    .map((product) => product.id);
}
