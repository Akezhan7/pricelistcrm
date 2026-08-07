import { getSupplierSuggestions, type OrderLineForm } from './orderItems';
import type { Product } from '../types';

const baseProduct = {
  article: 'SKU',
  costPrice: 100,
  sellingPrice: 150,
  isActive: true,
  createdAt: '2026-08-07',
  updatedAt: '2026-08-07',
};

function product(id: number, supplierIds: number[]): Product {
  return {
    ...baseProduct,
    id,
    name: `Product ${id}`,
    suppliers: supplierIds.map((supplierId) => ({
      id: supplierId,
      name: `Supplier ${supplierId}`,
      address: 'Address',
      phone: '77000000000',
      debt: 0,
      isActive: true,
      createdAt: '2026-08-07',
      updatedAt: '2026-08-07',
      ProductSupplier: {
        supplierPrice: 90,
        quantity: 1,
        isAvailable: true,
      },
    })),
  };
}

const lines: OrderLineForm[] = [
  { productId: 1, product: product(1, [10, 20]), quantity: 1, priceAtPurchase: 100 },
  { productId: 2, product: product(2, [10]), quantity: 1, priceAtPurchase: 100 },
];

test('recommends suppliers by selected product coverage', () => {
  expect(getSupplierSuggestions(lines)).toEqual([
    expect.objectContaining({ supplierId: 10, matchedProductCount: 2, totalProductCount: 2 }),
    expect.objectContaining({ supplierId: 20, matchedProductCount: 1, totalProductCount: 2 }),
  ]);
});
