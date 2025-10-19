// Файл для определения связей между моделями
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
const Payment = require('./Payment');
const PriceHistory = require('./PriceHistory');

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

module.exports = {
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
};
