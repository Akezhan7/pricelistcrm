const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PriceHistory = sequelize.define('PriceHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID товара',
  },
  oldPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
    comment: 'Старая цена',
  },
  newPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
    comment: 'Новая цена',
  },
  priceType: {
    type: DataTypes.ENUM('costPrice', 'sellingPrice'),
    allowNull: false,
    defaultValue: 'sellingPrice',
    comment: 'Тип цены: себестоимость или цена продажи',
  },
  changeReason: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Причина изменения цены',
  },
  changedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID пользователя, который изменил цену',
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID заявки, в рамках которой изменилась цена (опционально)',
  },
  changedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Время изменения цены',
  },
}, {
  tableName: 'price_history',
  timestamps: false, // Используем свое поле changedAt
  indexes: [
    {
      fields: ['product_id'],
      name: 'price_history_product_id_idx',
    },
    {
      fields: ['changed_by'],
      name: 'price_history_changed_by_idx',
    },
    {
      fields: ['changed_at'],
      name: 'price_history_changed_at_idx',
    },
    {
      fields: ['order_id'],
      name: 'price_history_order_id_idx',
    },
    {
      fields: ['product_id', 'changed_at'],
      name: 'price_history_product_time_idx',
    },
    {
      fields: ['price_type'],
      name: 'price_history_price_type_idx',
    },
  ],
});

module.exports = PriceHistory;
