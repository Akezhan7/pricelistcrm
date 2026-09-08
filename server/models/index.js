const sequelize = require('../config/database');
const User = require('./User');
const Product = require('./Product');
const Supplier = require('./Supplier');
const ProductSupplier = require('./ProductSupplier');
const ProductVariation = require('./ProductVariation');
const Market = require('./Market');
const Sector = require('./Sector');
const Row = require('./Row');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const OrderStatusHistory = require('./OrderStatusHistory');
const OrderSettlementHistory = require('./OrderSettlementHistory');
const OrderCorrection = require('./OrderCorrection');
const Payment = require('./Payment');
const PriceHistory = require('./PriceHistory');

// Новые модели для системы закупок и склада
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

// Импортируем связи (все связи определены в associations.js)
require('./associations');

module.exports = {
  sequelize,
  User,
  Product,
  Supplier,
  ProductSupplier,
  ProductVariation,
  Market,
  Sector,
  Row,
  Order,
  OrderItem,
  OrderStatusHistory,
  OrderSettlementHistory,
  OrderCorrection,
  Payment,
  PriceHistory,
  // Новые модели
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
  ProcurementList,
  ProcurementListItem,
};
