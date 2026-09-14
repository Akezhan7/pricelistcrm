import type { Product } from '../types';
import { getBulkSelectableProductIds } from './productBulkSelection';

function product(
  id: number,
  lifecycleStatus: Product['lifecycleStatus'],
  lifecycleStartedAt: string | null = null
): Product {
  return {
    id,
    name: `Product ${id}`,
    article: `SKU-${id}`,
    costPrice: 100,
    sellingPrice: 150,
    lifecycleStatus,
    lifecycleStartedAt,
    isActive: true,
    createdAt: '2026-08-22',
    updatedAt: '2026-08-22',
  };
}

test('returns every new product id for bulk designer assignment', () => {
  const products = [
    product(1, 'new'),
    product(2, 'new'),
    product(3, 'assigned_to_designer'),
  ];

  expect(getBulkSelectableProductIds(products, 'assign_designer')).toEqual([1, 2]);
});

test('returns catalog products without an active lifecycle for bulk lifecycle start', () => {
  const products = [
    product(1, 'in_sale'),
    { ...product(2, 'in_sale', '2026-08-20T10:00:00Z'), lifecycleCompletedAt: '2026-08-21T10:00:00Z' },
    { ...product(4, 'in_sale', '2026-08-20T10:00:00Z'), lifecycleCompletedAt: null },
    product(3, 'new'),
  ];

  expect(getBulkSelectableProductIds(products, 'start_lifecycle')).toEqual([1, 2]);
});
