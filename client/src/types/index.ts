export interface Product {
  id: number;
  name: string;
  article: string;
  internalName?: string;
  kaspiName?: string;
  kaspiArticle?: string;
  currentStock?: number;
  minStock?: number;
  categoryId?: number;
  category?: Category;
  costPrice: number;
  sellingPrice: number;
  image?: string;
  description?: string;
  isActive: boolean;
  suppliers?: SupplierWithPrice[];
  variations?: ProductVariation[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  parentId?: number;
  parent?: Category;
  subcategories?: Category[];
  isActive: boolean;
  productsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Market {
  id: number;
  name: string;
  address?: string;
  description?: string;
  workingHours?: string;
  contactPhone?: string;
  notes?: string;
  isActive: boolean;
  sortOrder: number;
  sectors?: Sector[];
  suppliers?: Supplier[];
  supplierCount?: number;
  sectorCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sector {
  id: number;
  marketId?: number;
  market?: Market;
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
  marketId?: number;
  market?: Market;
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

export interface ProductVariation {
  id: number;
  productId: number;
  name: string;
  value: string;
  price: number;
  costPrice?: number;
  sku?: string;
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

export type OrderStatus = 
  | 'Создана'
  | 'Отправлена поставщику'
  | 'Частично подтверждена'
  | 'Подтверждена'
  | 'В сборе'
  | 'Забрана'
  | 'Принята на складе'
  | 'Закрыта';

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
    internalName?: string;
    kaspiName?: string;
    kaspiArticle?: string;
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
  created: number;
  sentToSupplier: number;
  confirmed: number;
  inCollection: number;
  collected: number;
  received: number;
  closed: number;
  pending: number;
  inProgress: number;
  completed: number;
  totalAmount: string;
  totalPaid: string;
  totalDebt: string;
  atLocation?: number;
  inTransit?: number;
  atWarehouse?: number;
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

export type StockChangeType =
  | 'receipt'
  | 'sale'
  | 'manual_increase'
  | 'manual_decrease'
  | 'correction'
  | 'return'
  | 'write_off';

export interface StockHistory {
  id: number;
  productId: number;
  product?: {
    id: number;
    name: string;
    internalName?: string;
    article: string;
  };
  oldStock: number;
  newStock: number;
  changeAmount: number;
  changeType: StockChangeType;
  userId?: number;
  user?: {
    id: number;
    name: string;
  };
  orderId?: number;
  order?: {
    id: number;
    orderNumber: string;
  };
  reason?: string;
  notes?: string;
  createdAt: string;
}

export interface StockHistoryResponse {
  product: {
    id: number;
    name: string;
    internalName?: string;
    article: string;
    currentStock: number;
    minStock: number;
  };
  history: StockHistory[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface OrderConfirmation {
  id: number;
  orderId: number;
  productId: number;
  product?: {
    id: number;
    name: string;
    internalName?: string;
    article: string;
  };
  requestedQuantity: number;
  confirmedQuantity: number;
  isAvailable: boolean;
  supplierComment?: string;
  createdAt: string;
}

export interface PartialConfirmationDto {
  items: Array<{
    productId: number;
    confirmedQuantity: number;
    isAvailable: boolean;
    supplierComment?: string;
  }>;
}


export type CollectorTaskStatus = 'pending' | 'in_progress' | 'completed';

export interface CollectorTask {
  id: number;
  orderId: number;
  order?: {
    id: number;
    orderNumber: string;
    totalAmount: number;
    supplier?: {
      id: number;
      name: string;
      address: string;
      phone: string;
      sectorId?: number;
      rowId?: number;
    };
    items?: OrderItem[];
  };
  assignedTo: number;
  assignee?: {
    id: number;
    name: string;
  };
  status: CollectorTaskStatus;
  isCollected: boolean;
  collectedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectorTasksResponse {
  tasks: CollectorTask[];
  stats: {
    pending: number;
    inProgress: number;
    completed: number;
  };
  pagination?: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface AssignCollectorDto {
  collectorId: number;
  notes?: string;
}

export interface UpdateCollectorTaskDto {
  status?: CollectorTaskStatus;
  notes?: string;
}

export type WarehouseReceiptType = 'full' | 'partial';

export interface WarehouseReceiptItem {
  id: number;
  receiptId: number;
  productId: number;
  product?: {
    id: number;
    name: string;
    internalName?: string;
    article: string;
  };
  expectedQuantity: number;
  receivedQuantity: number;
  discrepancy: number;
  notes?: string;
}

export interface WarehouseReceipt {
  id: number;
  orderId: number;
  order?: {
    id: number;
    orderNumber: string;
    supplier?: {
      id: number;
      name: string;
    };
  };
  receivedBy: number;
  receiver?: {
    id: number;
    name: string;
  };
  receiptType: WarehouseReceiptType;
  receivedAt: string;
  notes?: string;
  items?: WarehouseReceiptItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReceiveOrderDto {
  receiptType: 'full' | 'partial';
  items: Array<{
    productId: number;
    expectedQuantity: number;
    receivedQuantity: number;
    notes?: string;
  }>;
  notes?: string;
}

export interface PendingReceiptOrder extends Order {
  collectorTask?: CollectorTask;
}

export type StockStatus = 'critical' | 'low' | 'medium' | 'good';

export interface StockAnalyticsItem {
  id: number;
  name: string;
  internalName?: string;
  article: string;
  categoryId?: number;
  category?: {
    id: number;
    name: string;
  };
  currentStock: number;
  minStock: number;
  stockStatus: StockStatus;
  stockPercentage: number;
  image?: string;
}

export interface StockAnalytics {
  critical: StockAnalyticsItem[];
  low: StockAnalyticsItem[];
  medium: StockAnalyticsItem[];
  good: StockAnalyticsItem[];
  stats: {
    totalProducts: number;
    criticalCount: number;
    lowCount: number;
    mediumCount: number;
    goodCount: number;
  };
}

export interface PurchaseSuggestionItem {
  productId: number;
  product: {
    id: number;
    name: string;
    internalName?: string;
    article: string;
    currentStock: number;
    minStock: number;
    categoryId?: number;
    category?: {
      id: number;
      name: string;
    };
  };
  suggestedQuantity: number;
  priority: 'critical' | 'high' | 'medium';
}

export interface PurchaseSuggestionBySupplier {
  supplierId: number;
  supplier: {
    id: number;
    name: string;
    address: string;
    phone: string;
    whatsapp?: string;
  };
  items: PurchaseSuggestionItem[];
  totalItems: number;
  estimatedAmount: number;
}

export interface PurchaseSuggestions {
  suggestions: PurchaseSuggestionBySupplier[];
  totalProducts: number;
  totalSuppliers: number;
}

export interface WhatsAppMessage {
  phoneNumber: string;
  message: string;
  deepLink: string;
}

export interface SendPhotoToSupplierDto {
  supplierId: number;
  message?: string;
}
