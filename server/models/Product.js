const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200],
    },
  },
  article: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 50],
    },
  },
  costPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
    comment: 'Себестоимость',
  },
  sellingPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
    comment: 'Цена продажи',
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Путь к изображению товара',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  indexes: [
    {
      fields: ['article'],
      unique: true,
      name: 'products_article_unique',
    },
    {
      fields: ['name'],
      name: 'products_name_idx',
    },
    {
      fields: ['is_active'],
      name: 'products_is_active_idx',
    },
    {
      fields: ['cost_price'],
      name: 'products_cost_price_idx',
    },
    {
      fields: ['selling_price'],
      name: 'products_selling_price_idx',
    },
  ],
});

module.exports = Product;
