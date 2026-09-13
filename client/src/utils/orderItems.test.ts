import {
  getMainOrderLineQuantities,
  getSupplierSuggestions,
  updateMainOrderLineQuantity,
  type OrderLineForm,
} from './orderItems';
import { filterProductsBySearch } from './productSearch';
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

test('updates the main order-line quantity without changing variations', () => {
  const source: OrderLineForm[] = [
    { productId: 1, quantity: 1, priceAtPurchase: 100 },
    { productId: 1, productVariationId: 9, quantity: 4, priceAtPurchase: 120 },
  ];

  const updated = updateMainOrderLineQuantity(source, 1, 6);

  expect(updated).not.toBe(source);
  expect(updated[0].quantity).toBe(6);
  expect(updated[1].quantity).toBe(4);
  expect(getMainOrderLineQuantities(updated)).toEqual({ 1: 6 });
});

test('normalizes invalid catalog quantities to one', () => {
  expect(updateMainOrderLineQuantity(lines, 1, 0)[0].quantity).toBe(1);
  expect(updateMainOrderLineQuantity(lines, 1, Number.NaN)[0].quantity).toBe(1);
});

test('keeps server search results found by internal and Kaspi names', () => {
  const internalMatch = {
    ...product(3, []),
    name: 'Сетевой инструмент',
    internalName: 'Плиткорез усиленный',
  };
  const kaspiMatch = {
    ...product(4, []),
    name: 'Инструмент ручной',
    kaspiName: 'Маркер строительный',
  };

  expect(filterProductsBySearch([internalMatch], 'плиткорез')).toEqual([internalMatch]);
  expect(filterProductsBySearch([kaspiMatch], 'маркер')).toEqual([kaspiMatch]);
});

test('finds marketplace product codes with the same normalized token rules', () => {
  const codeMatch = {
    ...product(5, []),
    name: 'Аккумуляторный инструмент',
    marketplaceListings: [{ id: 7, marketplace: 'kaspi' as const, productCode: 'KASPI-77-AA' }],
  };

  expect(filterProductsBySearch([codeMatch], 'kaspi-77')).toEqual([codeMatch]);
  expect(filterProductsBySearch([codeMatch], 'ИНСТРУМЕНТ аккумуляторный')).toEqual([codeMatch]);
});
