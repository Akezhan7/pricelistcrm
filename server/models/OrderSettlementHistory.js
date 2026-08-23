const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { ORDER_SETTLEMENT_TYPES } = require('../services/orderSettlementService');

const OrderSettlementHistory = sequelize.define('OrderSettlementHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderId: { type: DataTypes.INTEGER, allowNull: false },
  oldSettlementType: {
    type: DataTypes.STRING(24),
    allowNull: false,
    validate: { isIn: [Object.values(ORDER_SETTLEMENT_TYPES)] },
  },
  newSettlementType: {
    type: DataTypes.STRING(24),
    allowNull: false,
    validate: { isIn: [Object.values(ORDER_SETTLEMENT_TYPES)] },
  },
  changedBy: { type: DataTypes.INTEGER, allowNull: false },
  comment: { type: DataTypes.TEXT, allowNull: true },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'order_settlement_history',
  timestamps: false,
  indexes: [{
    fields: ['order_id', 'created_at'],
    name: 'order_settlement_history_order_created_idx',
  }],
});

module.exports = OrderSettlementHistory;
