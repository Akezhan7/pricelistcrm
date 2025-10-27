const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sector = sequelize.define('Sector', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 50],
    },
    comment: 'Название сектора (например, "Сектор A")',
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 10],
    },
    comment: 'Код сектора (например, "A", "B", "C")',
  },
  productType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100],
    },
    comment: 'Тип продукции (например, "Стройматериалы", "Посуда", "Игрушки")',
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '#6b7280',
    validate: {
      is: /^#[0-9A-F]{6}$/i,
    },
    comment: 'Цвет сектора в hex формате',
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Иконка сектора (emoji или название иконки)',
  },
  position: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Позиция сектора на карте {x: number, y: number, width: number, height: number}',
  },
  rowsCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Количество рядов в секторе',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Активен ли сектор',
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Порядок сортировки',
  },
}, {
  indexes: [
    {
      fields: ['code'],
      unique: true,
      name: 'sectors_code_unique',
    },
    {
      fields: ['name'],
      unique: true,
      name: 'sectors_name_unique',
    },
    {
      fields: ['product_type'],
      name: 'sectors_product_type_idx',
    },
    {
      fields: ['is_active'],
      name: 'sectors_is_active_idx',
    },
    {
      fields: ['sort_order'],
      name: 'sectors_sort_order_idx',
    },
  ],
});

module.exports = Sector;
