const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Market = sequelize.define('Market', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    // unique: true - УБРАНО: используем частичный индекс из миграции
    // Частичный индекс markets_name_active_unique работает только для is_active = true
    validate: {
      notEmpty: true,
      len: [1, 100],
    },
    comment: 'Название рынка (например, "Байсат", "Ялянь")',
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 255],
    },
    comment: 'Полный адрес рынка',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Описание, особенности рынка',
  },
  workingHours: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Часы работы (например, "8:00-20:00")',
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Контактный телефон администрации рынка',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Дополнительные заметки',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Активен ли рынок',
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Порядок сортировки в списках',
  },
}, {
  tableName: 'markets',
  timestamps: true,
  underscored: true,
  indexes: [
    // ВАЖНО: Уникальность name обеспечивается частичным индексом markets_name_active_unique
    // в миграции (только для is_active = true). Это позволяет иметь несколько
    // неактивных записей с одинаковым именем, но только одну активную.
    {
      fields: ['is_active'],
      name: 'markets_is_active_idx',
    },
    {
      fields: ['sort_order'],
      name: 'markets_sort_order_idx',
    },
  ],
});

module.exports = Market;
