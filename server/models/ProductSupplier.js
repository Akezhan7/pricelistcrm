const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductSupplier = sequelize.define('ProductSupplier', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  supplierPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
    comment: 'Цена поставщика за этот товар',
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Количество товара в наличии у поставщика',
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Доступен ли товар у поставщика',
  },
  isPreferred: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Заметки по конкретному товару у поставщика',
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ['product_id', 'supplier_id'],
      name: 'product_supplier_unique_idx',
    },
    {
      fields: ['product_id'],
      name: 'product_supplier_product_id_idx',
    },
    {
      fields: ['supplier_id'],
      name: 'product_supplier_supplier_id_idx',
    },
    {
      fields: ['supplier_price'],
      name: 'product_supplier_price_idx',
    },
    {
      fields: ['is_available'],
      name: 'product_supplier_available_idx',
    },
  ],
});

module.exports = ProductSupplier;
