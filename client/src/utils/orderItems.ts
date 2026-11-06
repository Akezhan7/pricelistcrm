import type { Product, ProductVariation, ProductWithPrice, Supplier } from '../types';

/** Строка товара в форме создания заявки / возврата */
export type OrderLineForm = {
  productId: number;
  product?: Product;
  productVariationId?: number | null;
  selectedVariation?: ProductVariation | null;
  quantity: number;
  priceAtPurchase: number;
  /** Цена строки при открытии заявки на правку — для сравнения, если список поставщиков товара не загружен */
  initialPrice?: number;
  /** Сохранить цену строки у поставщика (по умолчанию да) */
  rememberSupplierPrice?: boolean;
  notes?: string;
  uniqueKey?: string;
};

type RememberPriceLine = Pick<
  OrderLineForm,
  'product' | 'productVariationId' | 'priceAtPurchase' | 'initialPrice' | 'rememberSupplierPrice'
>;

/**
 * Предлагать ли сохранить цену строки у поставщика: цена отличается от записанной у поставщика
 * либо поставщик к товару ещё не привязан. Вариации и возвраты цену поставщика не меняют.
 */
export function shouldOfferRememberPrice(line: RememberPriceLine, supplierId: number | null | undefined): boolean {
  if (!supplierId || line.productVariationId || !(line.priceAtPurchase > 0)) return false;

  const suppliers = line.product?.suppliers;
  if (suppliers) {
    const link = suppliers.find((supplier) => supplier.id === supplierId);
    return !link || Number(link.ProductSupplier.supplierPrice) !== line.priceAtPurchase;
  }
  return line.initialPrice !== undefined && line.initialPrice !== line.priceAtPurchase;
}

/** Значение флага для отправки на сервер: true только если галочка была показана и стоит */
export function getRememberPriceFlag(line: RememberPriceLine, supplierId: number | null | undefined): boolean {
  return shouldOfferRememberPrice(line, supplierId) && line.rememberSupplierPrice !== false;
}

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
