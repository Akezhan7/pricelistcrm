import type { Product } from '../types';

export type ProductBulkActionMode = 'assign_designer' | 'start_lifecycle';

export function canStartProductLifecycle(product: Product): boolean {
  return product.lifecycleStatus === 'in_sale'
    && (!product.lifecycleStartedAt || Boolean(product.lifecycleCompletedAt));
}

export function getBulkSelectableProductIds(
  products: Product[],
  mode: ProductBulkActionMode
): number[] {
  return products
    .filter((product) => (
      mode === 'assign_designer'
        ? product.lifecycleStatus === 'new'
        : canStartProductLifecycle(product)
    ))
    .map((product) => product.id);
}
