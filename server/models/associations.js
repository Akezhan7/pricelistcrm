// Файл для определения связей между моделями
const Market = require('./Market');
const Sector = require('./Sector');
const Row = require('./Row');
const Supplier = require('./Supplier');
const Product = require('./Product');
const ProductSupplier = require('./ProductSupplier');
const ProductVariation = require('./ProductVariation');
const User = require('./User');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const OrderStatusHistory = require('./OrderStatusHistory');
const OrderSettlementHistory = require('./OrderSettlementHistory');
const Payment = require('./Payment');
const PriceHistory = require('./PriceHistory');
const Category = require('./Category');
const OrderConfirmation = require('./OrderConfirmation');
const CollectorTask = require('./CollectorTask');
const WarehouseReceipt = require('./WarehouseReceipt');
const WarehouseReceiptItem = require('./WarehouseReceiptItem');
const StockHistory = require('./StockHistory');
const ProductActionHistory = require('./ProductActionHistory');
const ProductAsset = require('./ProductAsset');
const ProductRevisionRequest = require('./ProductRevisionRequest');
const ProductMarketplaceListing = require('./ProductMarketplaceListing');
const ProductLifecyclePurchase = require('./ProductLifecyclePurchase');
const ProductWarehouseDetails = require('./ProductWarehouseDetails');
const ProductLaunchFlags = require('./ProductLaunchFlags');
const ProductDesignerKpiEntry = require('./ProductDesignerKpiEntry');
const EmployeeTask = require('./EmployeeTask');
const EmployeeTaskHistory = require('./EmployeeTaskHistory');
const EmployeeTaskComment = require('./EmployeeTaskComment');
const ProcurementList = require('./ProcurementList');
const ProcurementListItem = require('./ProcurementListItem');

// Связи между рынками и секторами
Market.hasMany(Sector, {
  foreignKey: 'marketId',
  as: 'sectors',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Sector.belongsTo(Market, {
  foreignKey: 'marketId',
  as: 'market',
});

// Связи между рынками и поставщиками
Market.hasMany(Supplier, {
  foreignKey: 'marketId',
  as: 'suppliers',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

Supplier.belongsTo(Market, {
  foreignKey: 'marketId',
  as: 'market',
});

// Связи между секторами и рядами
Sector.hasMany(Row, {
  foreignKey: 'sectorId',
  as: 'rows',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Row.belongsTo(Sector, {
  foreignKey: 'sectorId',
  as: 'sector',
});

// Связи между секторами/рядами и поставщиками
Sector.hasMany(Supplier, {
  foreignKey: 'sectorId',
  as: 'suppliers',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

Supplier.belongsTo(Sector, {
  foreignKey: 'sectorId',
  as: 'sectorInfo',
});

Row.hasMany(Supplier, {
  foreignKey: 'rowId',
  as: 'suppliers',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

Supplier.belongsTo(Row, {
  foreignKey: 'rowId',
  as: 'rowInfo',
});

// Связи между товарами и поставщиками (многие ко многим через ProductSupplier)
Product.belongsToMany(Supplier, {
  through: ProductSupplier,
  foreignKey: 'productId',
  otherKey: 'supplierId',
  as: 'suppliers',
});

Supplier.belongsToMany(Product, {
  through: ProductSupplier,
  foreignKey: 'supplierId',
  otherKey: 'productId',
  as: 'products',
});

// Прямые связи для ProductSupplier
ProductSupplier.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});

ProductSupplier.belongsTo(Supplier, {
  foreignKey: 'supplierId',
  as: 'supplier',
});

Product.hasMany(ProductSupplier, {
  foreignKey: 'productId',
  as: 'productSuppliers',
});

Supplier.hasMany(ProductSupplier, {
  foreignKey: 'supplierId',
  as: 'supplierProducts',
});

// Связи для заявок (Orders)
Order.belongsTo(Supplier, {
  foreignKey: 'supplierId',
  as: 'supplier',
  onDelete: 'RESTRICT', // Нельзя удалить поставщика, если у него есть заявки
  onUpdate: 'CASCADE',
});

Supplier.hasMany(Order, {
  foreignKey: 'supplierId',
  as: 'orders',
});

Order.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(Order, {
  foreignKey: 'createdBy',
  as: 'createdOrders',
});

// Связи для товаров в заявках (OrderItems)
Order.hasMany(OrderItem, {
  foreignKey: 'orderId',
  as: 'items',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

OrderItem.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order',
});

OrderItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

Product.hasMany(OrderItem, {
  foreignKey: 'productId',
  as: 'orderItems',
});

// Связь с вариацией товара (опциональная)
OrderItem.belongsTo(ProductVariation, {
  foreignKey: 'productVariationId',
  as: 'variation',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

ProductVariation.hasMany(OrderItem, {
  foreignKey: 'productVariationId',
  as: 'orderItems',
});

// Связи для истории статусов заявок
Order.hasMany(OrderStatusHistory, {
  foreignKey: 'orderId',
  as: 'statusHistory',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

OrderStatusHistory.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order',
});

OrderStatusHistory.belongsTo(User, {
  foreignKey: 'changedBy',
  as: 'changer',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

Order.hasMany(OrderSettlementHistory, {
  foreignKey: 'orderId',
  as: 'settlementHistory',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

OrderSettlementHistory.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order',
});

OrderSettlementHistory.belongsTo(User, {
  foreignKey: 'changedBy',
  as: 'changer',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(OrderSettlementHistory, {
  foreignKey: 'changedBy',
  as: 'orderSettlementChanges',
});

User.hasMany(OrderStatusHistory, {
  foreignKey: 'changedBy',
  as: 'statusChanges',
});

// Связи для платежей
Payment.belongsTo(Supplier, {
  foreignKey: 'supplierId',
  as: 'supplier',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

Supplier.hasMany(Payment, {
  foreignKey: 'supplierId',
  as: 'payments',
});

Payment.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(Payment, {
  foreignKey: 'createdBy',
  as: 'createdPayments',
});

// Связи для истории цен
PriceHistory.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Product.hasMany(PriceHistory, {
  foreignKey: 'productId',
  as: 'priceHistory',
});

PriceHistory.belongsTo(User, {
  foreignKey: 'changedBy',
  as: 'changer',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(PriceHistory, {
  foreignKey: 'changedBy',
  as: 'priceChanges',
});

PriceHistory.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

Order.hasMany(PriceHistory, {
  foreignKey: 'orderId',
  as: 'priceChanges',
});

// Связи для вариаций товаров
Product.hasMany(ProductVariation, {
  foreignKey: 'productId',
  as: 'variations',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

ProductVariation.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});

// Связи для категорий (с поддержкой вложенности)
Category.hasMany(Product, {
  foreignKey: 'categoryId',
  as: 'products',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

Product.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category',
});

ProcurementList.belongsTo(User, {
  foreignKey: 'createdByUserId',
  as: 'creator',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(ProcurementList, {
  foreignKey: 'createdByUserId',
  as: 'createdProcurementLists',
});

ProcurementList.hasMany(ProcurementListItem, {
  foreignKey: 'procurementListId',
  as: 'items',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

ProcurementListItem.belongsTo(ProcurementList, {
  foreignKey: 'procurementListId',
  as: 'list',
});

ProcurementListItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

Product.hasMany(ProcurementListItem, {
  foreignKey: 'productId',
  as: 'procurementListItems',
});

ProcurementListItem.belongsTo(Supplier, {
  foreignKey: 'selectedSupplierId',
  as: 'selectedSupplier',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

Supplier.hasMany(ProcurementListItem, {
  foreignKey: 'selectedSupplierId',
  as: 'procurementListItems',
});

ProcurementListItem.belongsTo(OrderItem, {
  foreignKey: 'orderItemId',
  as: 'generatedOrderItem',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

OrderItem.hasOne(ProcurementListItem, {
  foreignKey: 'orderItemId',
  as: 'procurementListItem',
});

ProcurementListItem.belongsTo(User, {
  foreignKey: 'addedByUserId',
  as: 'addedBy',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(ProcurementListItem, {
  foreignKey: 'addedByUserId',
  as: 'addedProcurementListItems',
});

Product.belongsTo(User, {
  foreignKey: 'assignedToUserId',
  as: 'assignedTo',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

User.hasMany(Product, {
  foreignKey: 'assignedToUserId',
  as: 'assignedProducts',
});

Product.belongsTo(User, {
  foreignKey: 'designerId',
  as: 'designer',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

User.hasMany(Product, {
  foreignKey: 'designerId',
  as: 'designedProducts',
});

Product.belongsTo(User, {
  foreignKey: 'marketplaceManagerId',
  as: 'marketplaceManager',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

User.hasMany(Product, {
  foreignKey: 'marketplaceManagerId',
  as: 'marketplaceManagedProducts',
});

Product.belongsTo(User, {
  foreignKey: 'createdByUserId',
  as: 'createdByUser',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

User.hasMany(Product, {
  foreignKey: 'createdByUserId',
  as: 'createdProducts',
});

Product.belongsTo(User, {
  foreignKey: 'reviewedByUserId',
  as: 'reviewedByUser',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

User.hasMany(Product, {
  foreignKey: 'reviewedByUserId',
  as: 'reviewedProducts',
});

Category.hasMany(Category, {
  foreignKey: 'parentId',
  as: 'subcategories',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

Category.belongsTo(Category, {
  foreignKey: 'parentId',
  as: 'parent',
});

// Связи для подтверждений заявок от поставщиков
Order.hasMany(OrderConfirmation, {
  foreignKey: 'orderId',
  as: 'confirmations',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

OrderConfirmation.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order',
});

OrderConfirmation.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Product.hasMany(OrderConfirmation, {
  foreignKey: 'productId',
  as: 'confirmations',
});

// Связи для заданий сборщикам
Order.hasMany(CollectorTask, {
  foreignKey: 'orderId',
  as: 'collectorTasks',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

CollectorTask.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order',
});

CollectorTask.belongsTo(User, {
  foreignKey: 'assignedTo',
  as: 'collector',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(CollectorTask, {
  foreignKey: 'assignedTo',
  as: 'collectorTasks',
});

// Связи для приёмки на складе
Order.hasMany(WarehouseReceipt, {
  foreignKey: 'orderId',
  as: 'warehouseReceipts',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

WarehouseReceipt.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order',
});

WarehouseReceipt.belongsTo(User, {
  foreignKey: 'receivedBy',
  as: 'receiver',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(WarehouseReceipt, {
  foreignKey: 'receivedBy',
  as: 'receivedWarehouseReceipts',
});

// Связи для позиций приёмки
WarehouseReceipt.hasMany(WarehouseReceiptItem, {
  foreignKey: 'receiptId',
  as: 'items',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

WarehouseReceiptItem.belongsTo(WarehouseReceipt, {
  foreignKey: 'receiptId',
  as: 'receipt',
});

WarehouseReceiptItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Product.hasMany(WarehouseReceiptItem, {
  foreignKey: 'productId',
  as: 'receiptItems',
});

// Связи для истории остатков товаров
Product.hasMany(StockHistory, {
  foreignKey: 'productId',
  as: 'stockHistory',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

StockHistory.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});

StockHistory.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

User.hasMany(StockHistory, {
  foreignKey: 'userId',
  as: 'stockChanges',
});

StockHistory.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

Order.hasMany(StockHistory, {
  foreignKey: 'orderId',
  as: 'stockChanges',
});

// Связи для lifecycle-истории товара
Product.hasMany(ProductActionHistory, {
  foreignKey: 'productId',
  as: 'actionHistory',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

ProductActionHistory.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});

ProductActionHistory.belongsTo(User, {
  foreignKey: 'actorId',
  as: 'actor',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

User.hasMany(ProductActionHistory, {
  foreignKey: 'actorId',
  as: 'productActionHistory',
});

// Связи для файлов карточки товара
Product.hasMany(ProductAsset, {
  foreignKey: 'productId',
  as: 'assets',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

ProductAsset.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});

ProductAsset.belongsTo(User, {
  foreignKey: 'uploadedBy',
  as: 'uploader',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

User.hasMany(ProductAsset, {
  foreignKey: 'uploadedBy',
  as: 'uploadedProductAssets',
});

// Revision requests for review corrections
Product.hasMany(ProductRevisionRequest, {
  foreignKey: 'productId',
  as: 'revisionRequests',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

ProductRevisionRequest.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});

ProductRevisionRequest.belongsTo(User, {
  foreignKey: 'requestedBy',
  as: 'requester',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(ProductRevisionRequest, {
  foreignKey: 'requestedBy',
  as: 'requestedProductRevisions',
});

ProductRevisionRequest.belongsTo(User, {
  foreignKey: 'assignedDesignerId',
  as: 'assignedDesigner',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

User.hasMany(ProductRevisionRequest, {
  foreignKey: 'assignedDesignerId',
  as: 'assignedProductRevisions',
});

ProductRevisionRequest.hasMany(ProductAsset, {
  foreignKey: 'revisionRequestId',
  as: 'attachments',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

ProductAsset.belongsTo(ProductRevisionRequest, {
  foreignKey: 'revisionRequestId',
  as: 'revisionRequest',
});

// Marketplace listings for Kaspi and future marketplaces
Product.hasMany(ProductMarketplaceListing, {
  foreignKey: 'productId',
  as: 'marketplaceListings',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

ProductMarketplaceListing.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});

ProductMarketplaceListing.belongsTo(User, {
  foreignKey: 'managedBy',
  as: 'manager',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

User.hasMany(ProductMarketplaceListing, {
  foreignKey: 'managedBy',
  as: 'managedMarketplaceListings',
});

Product.hasOne(ProductLifecyclePurchase, {
  foreignKey: 'productId',
  as: 'lifecyclePurchase',
  onDelete: 'CASCADE',
});
ProductLifecyclePurchase.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
ProductLifecyclePurchase.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
ProductLifecyclePurchase.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Order.hasMany(ProductLifecyclePurchase, {
  foreignKey: 'orderId',
  as: 'lifecyclePurchases',
  onDelete: 'RESTRICT',
});
ProductLifecyclePurchase.belongsTo(OrderItem, { foreignKey: 'orderItemId', as: 'orderItem' });
ProductLifecyclePurchase.belongsTo(WarehouseReceipt, {
  foreignKey: 'warehouseReceiptId',
  as: 'warehouseReceipt',
});
ProductLifecyclePurchase.belongsTo(User, { foreignKey: 'purchasedBy', as: 'purchaser' });
ProductLifecyclePurchase.belongsTo(User, { foreignKey: 'arrivedBy', as: 'arrivalConfirmer' });

Product.hasOne(ProductWarehouseDetails, {
  foreignKey: 'productId',
  as: 'warehouseDetails',
  onDelete: 'CASCADE',
});
ProductWarehouseDetails.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
ProductWarehouseDetails.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

Product.hasOne(ProductLaunchFlags, {
  foreignKey: 'productId',
  as: 'launchFlags',
  onDelete: 'CASCADE',
});
ProductLaunchFlags.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
ProductLaunchFlags.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });
ProductLaunchFlags.belongsTo(User, { foreignKey: 'completedBy', as: 'completer' });

Product.hasOne(ProductDesignerKpiEntry, {
  foreignKey: 'productId',
  as: 'designerKpiEntry',
  onDelete: 'CASCADE',
});
ProductDesignerKpiEntry.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
ProductDesignerKpiEntry.belongsTo(User, { foreignKey: 'designerId', as: 'designer' });
ProductDesignerKpiEntry.belongsTo(User, { foreignKey: 'reviewedByUserId', as: 'reviewer' });
User.hasMany(ProductDesignerKpiEntry, {
  foreignKey: 'designerId',
  as: 'designerKpiEntries',
});
User.hasMany(ProductDesignerKpiEntry, {
  foreignKey: 'reviewedByUserId',
  as: 'reviewedDesignerKpiEntries',
});

EmployeeTask.belongsTo(User, {
  foreignKey: 'createdByUserId',
  as: 'creator',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(EmployeeTask, {
  foreignKey: 'createdByUserId',
  as: 'createdEmployeeTasks',
});

EmployeeTask.belongsTo(User, {
  foreignKey: 'assignedToUserId',
  as: 'assignee',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(EmployeeTask, {
  foreignKey: 'assignedToUserId',
  as: 'assignedEmployeeTasks',
});

EmployeeTask.hasMany(EmployeeTaskHistory, {
  foreignKey: 'taskId',
  as: 'history',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

EmployeeTaskHistory.belongsTo(EmployeeTask, {
  foreignKey: 'taskId',
  as: 'task',
});

EmployeeTaskHistory.belongsTo(User, {
  foreignKey: 'actorId',
  as: 'actor',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

User.hasMany(EmployeeTaskHistory, {
  foreignKey: 'actorId',
  as: 'employeeTaskHistory',
});

EmployeeTask.hasMany(EmployeeTaskComment, {
  foreignKey: 'taskId',
  as: 'comments',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

EmployeeTaskComment.belongsTo(EmployeeTask, {
  foreignKey: 'taskId',
  as: 'task',
});

EmployeeTaskComment.belongsTo(User, {
  foreignKey: 'authorId',
  as: 'author',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(EmployeeTaskComment, {
  foreignKey: 'authorId',
  as: 'employeeTaskComments',
});

module.exports = {
  Market,
  Sector,
  Row,
  Supplier,
  Product,
  ProductSupplier,
  ProductVariation,
  User,
  Order,
  OrderItem,
  OrderStatusHistory,
  Payment,
  PriceHistory,
  Category,
  OrderConfirmation,
  CollectorTask,
  WarehouseReceipt,
  WarehouseReceiptItem,
  StockHistory,
  ProductActionHistory,
  ProductAsset,
  ProductRevisionRequest,
  ProductMarketplaceListing,
  ProductLifecyclePurchase,
  ProductWarehouseDetails,
  ProductLaunchFlags,
  ProductDesignerKpiEntry,
  EmployeeTask,
  EmployeeTaskHistory,
  EmployeeTaskComment,
};
