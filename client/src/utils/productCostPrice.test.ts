import { isCostPriceAutomatic } from './productCostPrice';
import type { Product } from '../types';

const supplier = (overrides: { isActive?: boolean; isAvailable?: boolean; supplierPrice?: number }) => ({
  id: 1,
  name: 'Поставщик',
  address: 'Адрес',
  phone: '77000000000',
  debt: 0,
  isActive: overrides.isActive ?? true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ProductSupplier: {
    supplierPrice: overrides.supplierPrice ?? 100,
    quantity: 0,
    isAvailable: overrides.isAvailable ?? true,
  },
});

const productWith = (...suppliers: ReturnType<typeof supplier>[]) => ({ suppliers } as Pick<Product, 'suppliers'>);

describe('isCostPriceAutomatic', () => {
  it('включается при активном поставщике в наличии с ценой', () => {
    expect(isCostPriceAutomatic(productWith(supplier({})))).toBe(true);
  });

  it('не включается без поставщиков', () => {
    expect(isCostPriceAutomatic({})).toBe(false);
  });

  it('не учитывает поставщиков не в наличии, неактивных и без цены', () => {
    expect(isCostPriceAutomatic(productWith(
      supplier({ isAvailable: false }),
      supplier({ isActive: false }),
      supplier({ supplierPrice: 0 })
    ))).toBe(false);
  });
});
