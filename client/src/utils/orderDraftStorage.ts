import type { OrderType, Product } from '../types';
import type { CreateOrderInitialItem, OrderLineForm } from './orderItems';
import { getSupplierListPrice } from './orderItems';

const STORAGE_KEY = 'crm_order_draft_v1';

export type DraftOrigin = 'supplier-panel' | 'modal';

export const DEFAULT_MODAL_RETURN_PATH = '/orders';

/** Минимальный снимок товара для sessionStorage */
export type StoredDraftProduct = Pick<
  Product,
  'id' | 'name' | 'article' | 'costPrice' | 'sellingPrice' | 'image' | 'internalName' | 'isActive'
> & {
  ProductSupplier?: {
    supplierPrice: number;
    quantity?: number;
    isAvailable?: boolean;
    notes?: string;
  };
};

export interface StoredOrderLine {
  productId: number;
  product: StoredDraftProduct;
  productVariationId?: number | null;
  quantity: number;
  priceAtPurchase: number;
  notes?: string;
}

export interface OrderDraft {
  supplierId: number;
  supplierName: string;
  type: OrderType;
  origin: DraftOrigin;
  lines: StoredOrderLine[];
  deliveryLocation: string;
  expectedDeliveryDate: string;
  notes: string;
  returnPath: string;
  updatedAt: number;
}

export interface OrderDraftModalFields {
  supplierId: number | null;
  supplierName: string;
  type: OrderType;
  lines: OrderLineForm[];
  deliveryLocation: string;
  expectedDeliveryDate: string;
  notes: string;
}

export function normalizeAppPath(path: string): string {
  return path === '/dashboard' ? '/' : path;
}

export function inferDraftOrigin(returnPath: string): DraftOrigin {
  const path = normalizeAppPath(returnPath);
  if (path === '/' || path.startsWith('/suppliers')) {
    return 'supplier-panel';
  }
  return 'modal';
}

/** Черновик с панели поставщика: пользователь уже на странице подбора */
export function isDraftResumeLocation(draft: OrderDraft, pathname: string): boolean {
  if (draft.origin === 'modal') return false;
  return normalizeAppPath(pathname) === normalizeAppPath(draft.returnPath);
}

export function productToStored(product: Product): StoredDraftProduct {
  const withPrice = product as StoredDraftProduct;
  return {
    id: product.id,
    name: product.name,
    article: product.article,
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    image: product.image,
    internalName: product.internalName,
    isActive: product.isActive,
    ProductSupplier: withPrice.ProductSupplier
      ? {
          supplierPrice: Number(withPrice.ProductSupplier.supplierPrice),
          quantity: withPrice.ProductSupplier.quantity,
          isAvailable: withPrice.ProductSupplier.isAvailable,
          notes: withPrice.ProductSupplier.notes,
        }
      : undefined,
  };
}

export function storedToProduct(stored: StoredDraftProduct): Product {
  return stored as Product;
}

export function initialItemsToLines(items: CreateOrderInitialItem[]): StoredOrderLine[] {
  return items.map((item) => ({
    productId: item.product.id,
    product: productToStored(item.product),
    productVariationId: null,
    quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
    priceAtPurchase:
      typeof item.priceAtPurchase === 'number'
        ? item.priceAtPurchase
        : getSupplierListPrice(item.product),
    notes: item.notes ?? '',
  }));
}

export function linesToInitialItems(lines: StoredOrderLine[]): CreateOrderInitialItem[] {
  return lines
    .filter((line) => !line.productVariationId)
    .map((line) => ({
      product: storedToProduct(line.product),
      quantity: line.quantity,
      priceAtPurchase: line.priceAtPurchase,
      notes: line.notes,
    }));
}

export function orderLineFormToStored(line: OrderLineForm): StoredOrderLine {
  return {
    productId: line.productId,
    product: productToStored(line.product!),
    productVariationId: line.productVariationId ?? null,
    quantity: line.quantity,
    priceAtPurchase: line.priceAtPurchase,
    notes: line.notes,
  };
}

export function storedToOrderLineForm(line: StoredOrderLine): OrderLineForm {
  return {
    productId: line.productId,
    product: storedToProduct(line.product),
    productVariationId: line.productVariationId ?? null,
    selectedVariation: null,
    quantity: line.quantity,
    priceAtPurchase: line.priceAtPurchase,
    notes: line.notes ?? '',
    uniqueKey: `draft-${line.productId}-${line.productVariationId ?? 'main'}`,
  };
}

export function calcDraftTotal(draft: OrderDraft): number {
  return draft.lines.reduce((sum, line) => sum + line.quantity * line.priceAtPurchase, 0);
}

export function countDraftProducts(draft: OrderDraft): number {
  return draft.lines.filter((l) => !l.productVariationId).length;
}

function normalizeLoadedDraft(raw: OrderDraft): OrderDraft | null {
  if (!raw || typeof raw.supplierId !== 'number' || !Array.isArray(raw.lines)) {
    return null;
  }
  const returnPath = normalizeAppPath(raw.returnPath || DEFAULT_MODAL_RETURN_PATH);
  return {
    ...raw,
    origin: raw.origin ?? inferDraftOrigin(returnPath),
    returnPath,
  };
}

export function loadOrderDraft(): OrderDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeLoadedDraft(JSON.parse(raw) as OrderDraft);
  } catch {
    return null;
  }
}

export function saveOrderDraft(draft: OrderDraft | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!draft) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota errors
  }
}

export function createEmptyDraft(
  partial: Pick<OrderDraft, 'supplierId' | 'supplierName' | 'type' | 'origin' | 'returnPath'> &
    Partial<Pick<OrderDraft, 'lines' | 'deliveryLocation' | 'expectedDeliveryDate' | 'notes'>>
): OrderDraft {
  return {
    supplierId: partial.supplierId,
    supplierName: partial.supplierName,
    type: partial.type,
    origin: partial.origin,
    lines: partial.lines ?? [],
    deliveryLocation: partial.deliveryLocation ?? 'Точка Байсад',
    expectedDeliveryDate: partial.expectedDeliveryDate ?? '',
    notes: partial.notes ?? '',
    returnPath: normalizeAppPath(partial.returnPath),
    updatedAt: Date.now(),
  };
}

function storedLinesEqual(a: StoredOrderLine[], b: StoredOrderLine[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Синхронизация полей формы модалки; origin и returnPath не меняются */
export function applyModalFieldsToDraft(
  prev: OrderDraft | null,
  fields: OrderDraftModalFields
): OrderDraft | null {
  const nextLines = fields.lines.map(orderLineFormToStored);
  const nextSupplierId = fields.supplierId ?? 0;

  if (!prev) {
    if (nextLines.length === 0 && !nextSupplierId) return null;
    return createEmptyDraft({
      supplierId: nextSupplierId,
      supplierName: fields.supplierName,
      type: fields.type,
      origin: 'modal',
      returnPath: DEFAULT_MODAL_RETURN_PATH,
      lines: nextLines,
      deliveryLocation: fields.deliveryLocation,
      expectedDeliveryDate: fields.expectedDeliveryDate,
      notes: fields.notes,
    });
  }

  const unchanged =
    prev.supplierId === nextSupplierId &&
    prev.supplierName === fields.supplierName &&
    prev.type === fields.type &&
    prev.deliveryLocation === fields.deliveryLocation &&
    prev.expectedDeliveryDate === fields.expectedDeliveryDate &&
    prev.notes === fields.notes &&
    storedLinesEqual(prev.lines, nextLines);

  if (unchanged) return prev;

  return {
    ...prev,
    supplierId: nextSupplierId,
    supplierName: fields.supplierName,
    type: fields.type,
    lines: nextLines,
    deliveryLocation: fields.deliveryLocation,
    expectedDeliveryDate: fields.expectedDeliveryDate,
    notes: fields.notes,
    updatedAt: Date.now(),
  };
}
