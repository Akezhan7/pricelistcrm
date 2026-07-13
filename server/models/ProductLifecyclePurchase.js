const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductLifecyclePurchase = sequelize.define('ProductLifecyclePurchase', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  productId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  supplierId: { type: DataTypes.INTEGER, allowNull: false },
  orderId: { type: DataTypes.INTEGER, allowNull: false },
  orderItemId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  warehouseReceiptId: { type: DataTypes.INTEGER, allowNull: true, unique: true },
  quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  purchasePrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0 } },
  purchasedAt: { type: DataTypes.DATE, allowNull: false },
  purchasedBy: { type: DataTypes.INTEGER, allowNull: false },
  receivedQuantity: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0 } },
  arrivedAt: { type: DataTypes.DATE, allowNull: true },
  arrivedBy: { type: DataTypes.INTEGER, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'product_lifecycle_purchases',
  timestamps: true,
});

module.exports = ProductLifecyclePurchase;
