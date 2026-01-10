const sequelize = require('../config/database');
const User = require('./User');
const Product = require('./Product');
const Supplier = require('./Supplier');
const ProductSupplier = require('./ProductSupplier');
const ProductVariation = require('./ProductVariation');
const Sector = require('./Sector');
const Row = require('./Row');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const OrderStatusHistory = require('./OrderStatusHistory');
const Payment = require('./Payment');
const PriceHistory = require('./PriceHistory');

// Новые модели для системы закупок и склада
const Category = require('./Category');
const OrderConfirmation = require('./OrderConfirmation');
const CollectorTask = require('./CollectorTask');
const WarehouseReceipt = require('./WarehouseReceipt');
const WarehouseReceiptItem = require('./WarehouseReceiptItem');

// Импортируем связи (все связи определены в associations.js)
require('./associations');

module.exports = {
  sequelize,
  User,
  Product,
  Supplier,
  ProductSupplier,
  ProductVariation,
  Sector,
  Row,
  Order,
  OrderItem,
  OrderStatusHistory,
  Payment,
  PriceHistory,
  // Новые модели
  Category,
  OrderConfirmation,
  CollectorTask,
  WarehouseReceipt,
  WarehouseReceiptItem,
};
