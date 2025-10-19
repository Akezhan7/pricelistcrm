const { DataTypes, Op } = require('sequelize'); // ИСПРАВЛЕНО: Добавлен импорт Op для работы с оператором not equal
const sequelize = require('../config/database');

const ProductVariation = sequelize.define('ProductVariation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Связь с основным товаром',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200],
    },
    comment: 'Название вариации (например, "Размер XL", "Цвет красный")',
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100],
    },
    comment: 'Значение вариации (например, "XL", "красный", "50см")',
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
    comment: 'Цена данной вариации товара',
  },
  costPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0,
    },
    comment: 'Себестоимость данной вариации (если отличается от основного товара)',
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      len: [1, 100],
    },
    comment: 'Уникальный артикул вариации (например, "LEGO-001-XL")',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Активна ли данная вариация',
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Порядок сортировки вариаций',
  },
}, {
  indexes: [
    // Составной индекс для быстрого поиска вариаций товара
    {
      fields: ['product_id', 'is_active'],
      name: 'product_variation_product_active_idx',
    },
    {
      fields: ['product_id'],
      name: 'product_variation_product_id_idx',
    },
    // Индекс для уникального SKU
    {
      unique: true,
      fields: ['sku'],
      where: {
        sku: { [Op.ne]: null }
      },
      name: 'product_variation_sku_unique',
    },
    {
      fields: ['sort_order'],
      name: 'product_variation_sort_order_idx',
    },
    {
      fields: ['is_active'],
      name: 'product_variation_is_active_idx',
    },
  ],
});

module.exports = ProductVariation;
