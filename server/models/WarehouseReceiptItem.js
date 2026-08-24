const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WarehouseReceiptItem = sequelize.define('WarehouseReceiptItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  receiptId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID приёмки',
  },
  orderItemId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Строка заявки, по которой выполнена приёмка',
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID товара',
  },
  expectedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
    },
    comment: 'Ожидаемое количество по заявке',
  },
  receivedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
    },
    comment: 'Фактически полученное количество',
  },
  discrepancy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Расхождение (expected - received)',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Примечания по конкретной позиции',
  },
}, {
  tableName: 'warehouse_receipt_items',
  timestamps: true,
  indexes: [
    {
      fields: ['receipt_id'],
      name: 'warehouse_receipt_items_receipt_id_idx',
    },
    {
      fields: ['product_id'],
      name: 'warehouse_receipt_items_product_id_idx',
    },
    {
      fields: ['order_item_id'],
      name: 'warehouse_receipt_items_order_item_idx',
    },
    {
      fields: ['receipt_id', 'product_id'],
      name: 'warehouse_receipt_items_receipt_product_idx',
    },
  ],
  hooks: {
    // Автоматически вычисляем расхождение перед сохранением
    beforeValidate: (item) => {
      if (item.expectedQuantity !== undefined && item.receivedQuantity !== undefined) {
        item.discrepancy = item.expectedQuantity - item.receivedQuantity;
      }
    },
  },
});

module.exports = WarehouseReceiptItem;
