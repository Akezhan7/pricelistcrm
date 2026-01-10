const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderConfirmation = sequelize.define('OrderConfirmation', {
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
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID товара',
  },
  requestedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
    },
    comment: 'Запрошенное количество',
  },
  confirmedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Подтверждённое количество поставщиком',
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Есть ли товар в наличии у поставщика',
  },
  supplierComment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Комментарий поставщика',
  },
}, {
  tableName: 'order_confirmations',
  timestamps: true,
  indexes: [
    {
      fields: ['order_id'],
      name: 'order_confirmations_order_id_idx',
    },
    {
      fields: ['product_id'],
      name: 'order_confirmations_product_id_idx',
    },
    {
      fields: ['order_id', 'product_id'],
      name: 'order_confirmations_order_product_idx',
    },
    {
      fields: ['is_available'],
      name: 'order_confirmations_is_available_idx',
    },
  ],
});

module.exports = OrderConfirmation;
