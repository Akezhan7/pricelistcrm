const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WarehouseReceipt = sequelize.define('WarehouseReceipt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID заявки',
  },
  receivedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID пользователя, принявшего товар на складе',
  },
  receiptType: {
    type: DataTypes.ENUM('full', 'partial'),
    allowNull: false,
    defaultValue: 'full',
    comment: 'Тип приёмки: полная или частичная',
  },
  receivedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Дата и время приёмки',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Примечания по приёмке',
  },
}, {
  tableName: 'warehouse_receipts',
  timestamps: true,
  indexes: [
    {
      fields: ['order_id'],
      name: 'warehouse_receipts_order_id_idx',
    },
    {
      fields: ['received_by'],
      name: 'warehouse_receipts_received_by_idx',
    },
    {
      fields: ['receipt_type'],
      name: 'warehouse_receipts_receipt_type_idx',
    },
    {
      fields: ['received_at'],
      name: 'warehouse_receipts_received_at_idx',
    },
  ],
});

module.exports = WarehouseReceipt;
