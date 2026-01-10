export interface Product {
  id: number;
  name: string;
  article: string;
  // Новые поля для Kaspi и внутреннего использования
  internalName?: string; // Внутреннее название (маска для сотрудников)
  kaspiName?: string; // Официальное название Kaspi
  kaspiArticle?: string; // Артикул Kaspi
  // Управление остатками
  currentStock?: number; // Текущий остаток на складе
  minStock?: number; // Минимальный порог остатков
  categoryId?: number; // FK к категории
  category?: Category; // Связь с категорией
  // Основные поля
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

// ===============================
// Категории товаров
// ===============================

export interface Category {
  id: number;
  name: string;
  description?: string;
  parentId?: number;
  parent?: Category;
  subcategories?: Category[];
  isActive: boolean;
  productsCount?: number; // Количество товаров в категории
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
  // Статистика по статусам
  created: number;            // Создана
  sentToSupplier: number;     // Отправлена поставщику
  confirmed: number;          // Подтверждена + Частично подтверждена
  inCollection: number;       // В сборе
  collected: number;          // Забрана
  received: number;           // Принята на складе
  closed: number;             // Закрыта
  // Агрегированные показатели
  pending: number;            // Ожидают (созданы + отправлены)
  inProgress: number;         // В работе (подтверждены + в сборе + забраны)
  completed: number;          // Завершены (приняты + закрыты)
  // Финансовые показатели
  totalAmount: string;
  totalPaid: string;
  totalDebt: string;
  // Старые поля для обратной совместимости (удалить позже)
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

// ===============================
// История остатков (Stock History)
// ===============================

export type StockChangeType = 
  | 'receipt'           // Приёмка
  | 'sale'              // Продажа
  | 'manual_increase'   // Ручное увеличение
  | 'manual_decrease'   // Ручное уменьшение
  | 'correction'        // Корректировка
  | 'return'            // Возврат
  | 'write_off';        // Списание

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

// ===============================
// Подтверждение заявок (Order Confirmation)
// ===============================

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

// ===============================
// Задания сборщикам (Collector Tasks)
// ===============================

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

// ===============================
// Приёмка товара (Warehouse Receipt)
// ===============================

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
  discrepancy: number; // expected - received
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

// ===============================
// Аналитика остатков
// ===============================

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
  stockPercentage: number; // currentStock / minStock * 100
  image?: string;
}

export interface StockAnalytics {
  critical: StockAnalyticsItem[];   // currentStock = 0
  low: StockAnalyticsItem[];        // currentStock <= minStock
  medium: StockAnalyticsItem[];     // currentStock <= minStock * 2
  good: StockAnalyticsItem[];       // currentStock > minStock * 2
  stats: {
    totalProducts: number;
    criticalCount: number;
    lowCount: number;
    mediumCount: number;
    goodCount: number;
  };
}

// ===============================
// Автоформирование закупа
// ===============================

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
  suggestedQuantity: number; // Рекомендуемое количество для заказа
  priority: 'critical' | 'high' | 'medium'; // Приоритет закупки
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
  estimatedAmount: number; // Примерная сумма заказа
}

export interface PurchaseSuggestions {
  suggestions: PurchaseSuggestionBySupplier[];
  totalProducts: number;
  totalSuppliers: number;
}

// ===============================
// WhatsApp интеграция
// ===============================

export interface WhatsAppMessage {
  phoneNumber: string;
  message: string;
  deepLink: string; // wa.me link
}

export interface SendPhotoToSupplierDto {
  supplierId: number;
  message?: string;
}
