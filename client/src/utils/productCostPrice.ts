import type { Product } from '../types';

/**
 * Себестоимость считается автоматически как самая низкая цена среди активных поставщиков,
 * у которых товар в наличии. Тогда вручную её не меняют.
 */
export function isCostPriceAutomatic(product: Pick<Product, 'suppliers'>): boolean {
  return (product.suppliers || []).some((supplier) => {
    const link = supplier.ProductSupplier;
    return supplier.isActive !== false
      && link?.isAvailable !== false
      && Number(link?.supplierPrice) > 0;
  });
}
