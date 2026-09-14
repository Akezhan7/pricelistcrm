export type ProductLifecycleStatus =
  | 'new'
  | 'assigned_to_designer'
  | 'content_created'
  | 'review'
  | 'revision'
  | 'marketplace'
  | 'purchase'
  | 'warehouse'
  | 'in_sale'
  | 'archived';

export interface LifecycleUserRef {
  id: number;
  name: string;
  email?: string;
}

export interface ProductPermissions {
  allowedActions: string[];
  editableFields: string[];
  canEditCard: boolean;
  responsibleRoleLabel?: string | null;
}

export interface ProductResponsibility {
  user?: LifecycleUserRef | null;
  roleLabel?: string | null;
}

export type ProductHistorySource = 'action' | 'price' | 'stock';

export interface ProductHistoryAttachment {
  id: number;
  originalName?: string | null;
  filePath: string;
  mimeType?: string | null;
}

export interface ProductHistoryRevision {
  id: number;
  comment: string;
  status: string;
  resolvedAt?: string | null;
  attachments: ProductHistoryAttachment[];
}

export interface ProductHistoryEvent {
  id: string;
  source: ProductHistorySource;
  productId: number;
  actionType: string;
  category: string;
  actor?: LifecycleUserRef | null;
  occurredAt: string;
  fromStatus?: ProductLifecycleStatus | null;
  toStatus?: ProductLifecycleStatus | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  revision?: ProductHistoryRevision | null;
}

export interface ProductHistoryPage {
  events: ProductHistoryEvent[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

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
  lifecycleStatus?: ProductLifecycleStatus;
  lifecycleStartedAt?: string | null;
  lifecycleCompletedAt?: string | null;
  lifecycleRunNumber?: number;
  lifecycleRoute?: ProductLifecycleRouteStage[] | null;
  lifecycleRouteIndex?: number | null;
  lifecycleRunReason?: string | null;
  assignedToUserId?: number | null;
  assignedTo?: LifecycleUserRef;
  designerId?: number | null;
  designer?: LifecycleUserRef;
  marketplaceManagerId?: number | null;
  marketplaceManager?: LifecycleUserRef;
  lifecyclePurchase?: ProductLifecyclePurchase | null;
  warehouseDetails?: ProductWarehouseDetails | null;
  launchFlags?: ProductLaunchFlags | null;
  createdByUserId?: number | null;
  createdByUser?: LifecycleUserRef;
  reviewedByUserId?: number | null;
  reviewedByUser?: LifecycleUserRef;
  kpiWeight?: number | string | null;
  launchNotes?: string | null;
  permissions?: ProductPermissions;
  responsibility?: ProductResponsibility;
  isActive: boolean;
  suppliers?: SupplierWithPrice[];
  marketplaceListings?: Array<Pick<
    ProductMarketplaceListing,
    'id' | 'marketplace' | 'productCode'
  >>;
  variations?: ProductVariation[];
  createdAt: string;
  updatedAt: string;
}

export type ProductLifecycleRouteStage =
  | 'design'
  | 'marketplace'
  | 'purchase'
  | 'warehouse'
  | 'sale_launch';

export interface ProductWorkflowAction {
  nextActionKey: string;
  nextActionLabel: string;
  nextActionEnabled: boolean;
  ownerLabel: string;
}

export interface ProductWorkflowItem extends Product {
  workflow: ProductWorkflowAction;
  viewerScope: string;
}

export interface DesignerKpiEntry {
  id: number;
  weight: number;
  creditedAt: string;
  product: {
    id: number;
    name: string;
    article: string;
  } | null;
  reviewer: {
    id: number;
    name: string;
  } | null;
}

export interface DesignerKpiRow {
  designer: {
    id: number;
    name: string;
    email?: string | null;
  };
  totalCards: number;
  totalWeight: number;
  entries: DesignerKpiEntry[];
}

export interface DesignerKpiReport {
  period: {
    from: string;
    to: string;
  };
  summary: {
    totalCards: number;
    totalWeight: number;
    designerCount: number;
  };
  designers: DesignerKpiRow[];
}

export type EmployeeTaskStatus =
  | 'new'
  | 'in_progress'
  | 'review'
  | 'returned'
  | 'done'
  | 'cancelled';

export type EmployeeTaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type EmployeeTaskAction =
  | 'start'
  | 'submit_review'
  | 'approve'
  | 'return'
  | 'cancel';

export interface EmployeeTaskUser {
  id: number;
  name: string;
  email?: string;
  role: string;
  isActive?: boolean;
  assignmentRole?: 'primary' | 'collaborator';
}

export interface EmployeeTaskAttachment {
  id: number;
  taskId: number;
  uploadedByUserId: number;
  originalName: string;
  mimeType: string;
  size: number;
  uploader?: EmployeeTaskUser;
  createdAt: string;
}

export interface EmployeeTaskHistoryEntry {
  id: number;
  taskId: number;
  actorId?: number | null;
  actor?: EmployeeTaskUser | null;
  action: string;
  fromStatus?: EmployeeTaskStatus | null;
  toStatus?: EmployeeTaskStatus | null;
  comment?: string | null;
  createdAt: string;
}

export interface EmployeeTaskComment {
  id: number;
  taskId: number;
  authorId: number;
  author?: EmployeeTaskUser;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeTask {
  id: number;
  title: string;
  description?: string | null;
  status: EmployeeTaskStatus;
  priority: EmployeeTaskPriority;
  createdByUserId: number;
  assignedToUserId: number;
  creator?: EmployeeTaskUser;
  assignee?: EmployeeTaskUser;
  assignees: EmployeeTaskUser[];
  dueDate?: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  allowedActions: EmployeeTaskAction[];
  history?: EmployeeTaskHistoryEntry[];
  comments?: EmployeeTaskComment[];
  attachments?: EmployeeTaskAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeTasksResponse {
  tasks: EmployeeTask[];
  stats: Partial<Record<EmployeeTaskStatus, number>>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateEmployeeTaskDto {
  title: string;
  description?: string;
  assignedToUserId: number;
  collaboratorUserIds?: number[];
  priority?: EmployeeTaskPriority;
  dueDate?: string;
  comment?: string;
}

export interface UpdateEmployeeTaskDto {
  title?: string;
  description?: string | null;
  assignedToUserId?: number;
  collaboratorUserIds?: number[];
  priority?: EmployeeTaskPriority;
  dueDate?: string | null;
  comment?: string;
}

export interface EmployeeTaskFilters {
  scope?: 'all' | 'assigned' | 'created';
  search?: string;
  status?: EmployeeTaskStatus | '';
  priority?: EmployeeTaskPriority | '';
  assignedToUserId?: number | '';
  createdByUserId?: number | '';
  overdue?: boolean;
  page?: number;
  limit?: number;
}

export type ProductAssetType =
  | 'product_photo'
  | 'slide_jpg'
  | 'psd_source'
  | 'revision_attachment'
  | 'patent_file'
  | 'other';

export interface ProductAsset {
  id: number;
  productId: number;
  uploadedBy?: number | null;
  uploader?: LifecycleUserRef;
  revisionRequestId?: number | null;
  assetType: ProductAssetType;
  filePath: string;
  thumbnailPath?: string | null;
  previewPath?: string | null;
  originalName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  sortOrder: number;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductRevisionStatus = 'open' | 'resolved' | 'cancelled';

export interface ProductRevisionRequest {
  id: number;
  productId: number;
  requestedBy: number;
  requester?: LifecycleUserRef;
  assignedDesignerId?: number | null;
  assignedDesigner?: LifecycleUserRef;
  comment: string;
  status: ProductRevisionStatus;
  resolvedAt?: string | null;
  attachments?: ProductAsset[];
  createdAt: string;
  updatedAt: string;
}

export type MarketplaceKey =
  | 'kaspi'
  | 'halyk'
  | 'forte'
  | 'ozon'
  | 'wildberries'
  | 'other';

export type MarketplaceListingStatus =
  | 'not_started'
  | 'placing'
  | 'moderation'
  | 'published'
  | 'in_sale'
  | 'blocked'
  | 'removed';

export interface ProductMarketplaceListing {
  id: number;
  productId: number;
  marketplace: MarketplaceKey;
  status: MarketplaceListingStatus;
  sku?: string | null;
  productCode?: string | null;
  marketplaceArticle?: string | null;
  marketplaceName?: string | null;
  price?: string | number | null;
  url?: string | null;
  description?: string | null;
  managedBy?: number | null;
  manager?: LifecycleUserRef;
  createdAt: string;
  updatedAt: string;
}

export interface ProductLifecyclePurchase {
  id: number;
  productId: number;
  supplierId: number;
  supplier?: { id: number; name: string };
  orderId: number;
  order?: { id: number; orderNumber: string; status: OrderStatus };
  orderItemId: number;
  warehouseReceiptId?: number | null;
  quantity: number;
  purchasePrice: string | number;
  purchasedAt: string;
  purchasedBy: number;
  receivedQuantity?: number | null;
  arrivedAt?: string | null;
  arrivedBy?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWarehouseDetails {
  id: number;
  productId: number;
  sector: string;
  shelf: string;
  cell: string;
  weight?: string | number | null;
  length?: string | number | null;
  width?: string | number | null;
  height?: string | number | null;
  notes?: string | null;
  updatedBy?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductLaunchFlags {
  id?: number;
  productId: number;
  internalAdvertisingStarted: boolean;
  externalAdvertisingStarted: boolean;
  reviewBonusEnabled: boolean;
  sellerBonusEnabled: boolean;
  notes?: string | null;
  updatedBy?: number | null;
  completedBy?: number | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  | 'Доставка'
  | 'В сборе'
  | 'Забрана'
  | 'Принята на складе'
  | 'Закрыта'
  | 'Отменена';

export type OrderType = 'purchase' | 'return';
export type OrderSettlementType = 'standard' | 'consignment';

export type PaymentStatus = 'Не оплачено' | 'Частично оплачено' | 'Оплачено';

export interface Order {
  id: number;
  orderNumber: string;
  supplierId: number | null;
  supplier?: {
    id: number;
    name: string;
    phone: string;
    whatsapp?: string;
    address?: string;
  };
  type?: OrderType;
  settlementType: OrderSettlementType;
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
  settlementHistory?: OrderSettlementHistory[];
  corrections?: OrderCorrection[];
  editPolicy?: OrderEditPolicy;
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
  orderedQuantity?: number | null;
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

export interface OrderSettlementHistory {
  id: number;
  orderId: number;
  oldSettlementType: OrderSettlementType;
  newSettlementType: OrderSettlementType;
  changedBy: number;
  changer?: {
    id: number;
    name: string;
  };
  comment?: string;
  createdAt: string;
}

export interface OrderEditPolicy {
  mode: 'edit' | 'correction' | 'blocked';
  canEdit: boolean;
  canDelete: boolean;
  canChangeSupplier: boolean;
  supplierChangeRequiresReason: boolean;
  requiresReason: boolean;
  reason?: string | null;
  hasReceipts: boolean;
  hasPayments: boolean;
}

export interface OrderCorrectionSnapshot {
  totalAmount: string;
  paymentStatus: PaymentStatus;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    priceAtPurchase: number;
    totalPrice: string;
  }>;
}

export interface OrderCorrection {
  id: number;
  orderId: number;
  correctionType: 'pre_receipt_edit' | 'post_receipt_correction';
  reason: string;
  beforeData: OrderCorrectionSnapshot;
  afterData: OrderCorrectionSnapshot;
  changedBy: number;
  changer?: { id: number; name: string };
  createdAt: string;
}

export interface CreateOrderDto {
  supplierId: number | null;
  type?: OrderType;
  settlementType?: OrderSettlementType;
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
  supplierId?: number | null;
  settlementType?: OrderSettlementType;
  expectedDeliveryDate?: string;
  deliveryLocation?: string;
  notes?: string;
  correctionReason?: string;
  items?: Array<{
    id?: number;
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

export interface OrderStatusOptions {
  currentStatus: OrderStatus;
  availableStatuses: OrderStatus[];
  canReceiveAtWarehouse: boolean;
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  supplierId?: number;
  type?: OrderType;
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
  delivery?: number;
  received: number;
  closed: number;
  cancelled: number;
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
  orderItemId?: number | null;
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
    orderItemId: number;
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
  kaspiName?: string;
  kaspiArticle?: string;
  marketplaceListings?: Array<Pick<
    ProductMarketplaceListing,
    'id' | 'marketplace' | 'productCode'
  >>;
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
