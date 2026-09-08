const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderCorrection = sequelize.define('OrderCorrection', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderId: { type: DataTypes.INTEGER, allowNull: false },
  correctionType: {
    type: DataTypes.STRING(32),
    allowNull: false,
    validate: { isIn: [['pre_receipt_edit', 'post_receipt_correction']] },
  },
  reason: { type: DataTypes.TEXT, allowNull: false },
  beforeData: { type: DataTypes.JSONB, allowNull: false },
  afterData: { type: DataTypes.JSONB, allowNull: false },
  changedBy: { type: DataTypes.INTEGER, allowNull: false },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'order_corrections',
  timestamps: false,
  indexes: [{
    fields: ['order_id', 'created_at'],
    name: 'order_corrections_order_created_idx',
  }],
});

module.exports = OrderCorrection;
