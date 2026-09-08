import type { Product, ProductVariation, ProductWithPrice, Supplier } from '../types';

/** Строка товара в форме создания заявки / возврата */
export type OrderLineForm = {
  productId: number;
  product?: Product;
  productVariationId?: number | null;
  selectedVariation?: ProductVariation | null;
  quantity: number;
  priceAtPurchase: number;
  notes?: string;
  uniqueKey?: string;
};

/** Предзаполнение из панели поставщика — с полным объектом товара */
export interface CreateOrderInitialItem {
  product: Product;
  quantity?: number;
  priceAtPurchase?: number;
  notes?: string;
}

function newLineKey(productId: number, suffix: string): string {
  return `product-${productId}-${suffix}-${Date.now()}-${Math.random()}`;
}

/** Основная позиция без вариации (заявка / возврат) */
export function buildMainOrderLine(
  product: Product,
  options?: { quantity?: number; priceAtPurchase?: number; notes?: string }
): OrderLineForm {
  const quantity = options?.quantity && options.quantity > 0 ? options.quantity : 1;
  const priceAtPurchase =
    typeof options?.priceAtPurchase === 'number'
      ? options.priceAtPurchase
      : Number(product.costPrice) || 0;

  return {
    productId: product.id,
    product,
    productVariationId: null,
    selectedVariation: null,
    quantity,
    priceAtPurchase,
    notes: options?.notes ?? '',
    uniqueKey: newLineKey(product.id, 'main'),
  };
}

export function buildOrderLinesFromInitialItems(
  initialItems: CreateOrderInitialItem[]
): OrderLineForm[] {
  return initialItems.map((init) =>
    buildMainOrderLine(init.product, {
      quantity: init.quantity,
      priceAtPurchase: init.priceAtPurchase,
      notes: init.notes,
    })
  );
}

/** Каталог для поиска в модалке: API-список + уже выбранные товары */
export function mergeProductCatalog(catalog: Product[], extra: Product[] = []): Product[] {
  const byId = new Map<number, Product>();
  for (const p of catalog) byId.set(p.id, p);
  for (const p of extra) byId.set(p.id, p);
  return Array.from(byId.values());
}

/** Цена закупки у поставщика (из связи) или себестоимость */
export function getSupplierListPrice(product: Product): number {
  const supplierPrice = (product as ProductWithPrice).ProductSupplier?.supplierPrice;
  return Number(supplierPrice ?? product.costPrice ?? 0);
}

/** Поиск по названию / артикулу в каталоге поставщика */
export function filterProductsBySearch<T extends Product>(products: T[], search: string): T[] {
  const tokens = search.trim().toLocaleLowerCase('ru-RU').split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return products;

  return products.filter((product) => {
    const searchableValues = [
      product.name,
      product.article,
      product.internalName,
      product.kaspiName,
      product.kaspiArticle,
    ].map((value) => (value || '').toLocaleLowerCase('ru-RU'));

    return tokens.every((token) => searchableValues.some((value) => value.includes(token)));
  });
}

function normalizeOrderQuantity(quantity: number): number {
  return Number.isFinite(quantity) && quantity >= 1 ? Math.floor(quantity) : 1;
}

export function getMainOrderLineQuantities(lines: OrderLineForm[]): Record<number, number> {
  return lines.reduce<Record<number, number>>((quantities, line) => {
    if (!line.productVariationId) {
      quantities[line.productId] = line.quantity;
    }
    return quantities;
  }, {});
}

export function updateMainOrderLineQuantity(
  lines: OrderLineForm[],
  productId: number,
  quantity: number
): OrderLineForm[] {
  const normalizedQuantity = normalizeOrderQuantity(quantity);
  return lines.map((line) => (
    line.productId === productId && !line.productVariationId
      ? { ...line, quantity: normalizedQuantity }
      : line
  ));
}

export type SupplierSuggestion = {
  supplierId: number;
  supplier: Supplier;
  matchedProductCount: number;
  totalProductCount: number;
};

export function getSupplierSuggestions(lines: OrderLineForm[]): SupplierSuggestion[] {
  const selectedProducts = new Map<number, Product>();
  for (const line of lines) {
    if (line.product) selectedProducts.set(line.productId, line.product);
  }

  const suggestions = new Map<number, SupplierSuggestion>();
  selectedProducts.forEach((product) => {
    for (const supplier of product.suppliers || []) {
      const current = suggestions.get(supplier.id);
      suggestions.set(supplier.id, {
        supplierId: supplier.id,
        supplier,
        matchedProductCount: (current?.matchedProductCount || 0) + 1,
        totalProductCount: selectedProducts.size,
      });
    }
  });

  return Array.from(suggestions.values()).sort(
    (a, b) =>
      b.matchedProductCount - a.matchedProductCount ||
      a.supplier.name.localeCompare(b.supplier.name)
  );
}
