const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderItem = sequelize.define('OrderItem', {
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
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
    },
    comment: 'Количество товара в заявке',
  },
  priceAtPurchase: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
    comment: 'Цена товара на момент создания заявки',
  },
  totalPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
    comment: 'Общая стоимость (quantity * priceAtPurchase)',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Заметки по конкретному товару в заявке',
  },
}, {
  tableName: 'order_items',
  timestamps: true,
  indexes: [
    {
      fields: ['order_id'],
      name: 'order_items_order_id_idx',
    },
    {
      fields: ['product_id'],
      name: 'order_items_product_id_idx',
    },
    {
      fields: ['order_id', 'product_id'],
      name: 'order_items_order_product_idx',
    },
  ],
  hooks: {
    // Автоматический расчет totalPrice перед сохранением
    beforeValidate: (orderItem) => {
      if (orderItem.quantity && orderItem.priceAtPurchase) {
        orderItem.totalPrice = parseFloat(orderItem.quantity) * parseFloat(orderItem.priceAtPurchase);
      }
    },
  },
});

module.exports = OrderItem;
