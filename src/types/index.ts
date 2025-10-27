export interface Product {
  id: number;
  name: string;
  article: string;
  costPrice: number;
  sellingPrice: number;
  image?: string;
  description?: string;
  isActive: boolean;
  suppliers?: SupplierWithPrice[];
  variations?: ProductVariation[]; // Добавляем поддержку вариаций
  createdAt: string;
  updatedAt: string;
}

// Новые интерфейсы для секторов и рядов
export interface Sector {
  id: number;
  name: string;
  code: string;
  productType: string;
  color: string;
  icon?: string;
  description?: string;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rowsCount: number;
  isActive: boolean;
  sortOrder: number;
  rows?: Row[];
  suppliers?: Supplier[];
  createdAt: string;
  updatedAt: string;
}

export interface Row {
  id: number;
  sectorId: number;
  name: string;
  code: string;
  totalSpaces: number;
  occupiedSpaces: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  notes?: string;
  isActive: boolean;
  sortOrder: number;
  sector?: Sector;
  suppliers?: Supplier[];
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: number;
  name: string;
  address: string;
  phone: string;
  // optional structured location on the market
  row?: string | number;
  container?: string | number;
  whatsapp?: string;
  containerImage?: string;
  sector?: string;
  mapPosition?: {
    x: number;
    y: number;
  };
  notes?: string;
  debt: number;
  isActive: boolean;
  // Новые поля для связи с секторами и рядами
  sectorId?: number;
  rowId?: number;
  sectorInfo?: Sector;
  rowInfo?: Row;
  products?: ProductWithPrice[];
  createdAt: string;
  updatedAt: string;
}

export interface SupplierWithPrice extends Supplier {
  ProductSupplier: {
    supplierPrice: number;
    quantity: number;
    isAvailable: boolean;
    notes?: string;
  };
}

export interface ProductWithPrice extends Product {
  ProductSupplier: {
    supplierPrice: number;
    quantity: number;
    isAvailable: boolean;
    notes?: string;
  };
}

export interface ProductSupplier {
  id: number;
  productId: number;
  supplierId: number;
  supplierPrice: number;
  quantity: number;
  isAvailable: boolean;
  notes?: string;
}

// Тип для вариаций товаров
export interface ProductVariation {
  id: number;
  productId: number;
  name: string; // Например: 'Размер', 'Цвет'
  value: string; // Например: 'XL', 'красный'
  price: number; // Цена данной вариации
  costPrice?: number; // Себестоимость (опционально)
  sku?: string; // Уникальный артикул вариации
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ===============================
// Типы для модуля заявок (Orders)
// ===============================

export type OrderStatus = 'В работе' | 'На точке' | 'В пути' | 'На складе';
export type PaymentStatus = 'Не оплачено' | 'Частично оплачено' | 'Оплачено';

export interface Order {
  id: number;
  orderNumber: string;
  supplierId: number;
  supplier?: {
    id: number;
    name: string;
    phone: string;
    whatsapp?: string;
    address?: string;
  };
  expectedDeliveryDate?: string;
  deliveryLocation: string;
  totalAmount: string | number;
  paidAmount: string | number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdBy: number;
  creator?: {
    id: number;
    name: string;
    email?: string;
  };
  items?: OrderItem[];
  statusHistory?: OrderStatusHistory[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productVariationId?: number | null;
  product?: {
    id: number;
    name: string;
    article: string;
    image?: string;
    costPrice?: number | string;
    sellingPrice?: number | string;
  };
  variation?: {
    id: number;
    name: string;
    value: string;
    price: number | string;
    sku?: string;
  };
  quantity: number;
  priceAtPurchase: string | number;
  totalPrice: string | number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderStatusHistory {
  id: number;
  orderId: number;
  oldStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedBy: number;
  changer?: {
    id: number;
    name: string;
  };
  comment?: string;
  changedAt: string;
}

export interface CreateOrderDto {
  supplierId: number;
  expectedDeliveryDate?: string;
  deliveryLocation?: string;
  notes?: string;
  items: Array<{
    productId: number;
    productVariationId?: number;
    quantity: number;
    priceAtPurchase: number;
    notes?: string;
  }>;
}

export interface UpdateOrderDto {
  expectedDeliveryDate?: string;
  deliveryLocation?: string;
  notes?: string;
  items?: Array<{
    productId: number;
    productVariationId?: number;
    quantity: number;
    priceAtPurchase: number;
    notes?: string;
  }>;
}

export interface ChangeOrderStatusDto {
  status: OrderStatus;
  comment?: string;
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  supplierId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface OrderStats {
  inProgress: number;
  atLocation: number;
  inTransit: number;
  atWarehouse: number;
  totalAmount: string;
  totalPaid: string;
  totalDebt: string;
}

export interface OrdersResponse {
  orders: Order[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
  stats: OrderStats;
}

// ===============================
// Типы для истории цен (Price History)
// ===============================

export type PriceType = 'costPrice' | 'sellingPrice';

export interface PriceHistory {
  id: number;
  productId: number;
  product?: {
    id: number;
    name: string;
    article: string;
    costPrice: string | number;
    sellingPrice: string | number;
  };
  oldPrice: string | number;
  newPrice: string | number;
  priceType: PriceType;
  changeReason?: string;
  changedBy: number;
  changer?: {
    id: number;
    name: string;
    email?: string;
  };
  orderId?: number;
  order?: {
    id: number;
    orderNumber: string;
  };
  changedAt: string;
}

export interface PriceHistoryStats {
  totalChanges: number;
  currentCostPrice: number;
  currentSellingPrice: number;
  firstCostPrice?: number;
  firstSellingPrice?: number;
  costPriceChange?: number;
  costPriceChangePercent?: string;
  sellingPriceChange?: number;
  sellingPriceChangePercent?: string;
}

export interface PriceHistoryResponse {
  product: {
    id: number;
    name: string;
    article: string;
    currentCostPrice: string | number;
    currentSellingPrice: string | number;
  };
  history: PriceHistory[];
  stats: PriceHistoryStats;
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface PriceAnalytics {
  mostChangedProducts: Array<{
    productId: number;
    changeCount: number;
    product: {
      id: number;
      name: string;
      article: string;
      costPrice: string | number;
      sellingPrice: string | number;
    };
  }>;
  biggestPriceChanges: Array<PriceHistory & {
    priceDiff: number;
    percentChange: string;
    absPercentChange: number;
  }>;
  recentChanges: PriceHistory[];
}

export interface UpdatePriceDto {
  productId: number;
  newCostPrice?: number;
  newSellingPrice?: number;
  reason?: string;
}

export interface UpdatePricesFromOrderDto {
  priceUpdates: UpdatePriceDto[];
}

export interface UpdatePricesResponse {
  order: {
    id: number;
    orderNumber: string;
  };
  updatedProducts: Array<{
    id: number;
    name: string;
    article: string;
    oldCostPrice: number;
    newCostPrice: number;
    oldSellingPrice: number;
    newSellingPrice: number;
  }>;
}


