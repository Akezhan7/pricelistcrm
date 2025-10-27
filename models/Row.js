const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Row = sequelize.define('Row', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  sectorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID сектора, к которому принадлежит ряд',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50],
    },
    comment: 'Название ряда (например, "A1", "A2")',
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 20],
    },
    comment: 'Код ряда (например, "1", "2", "3")',
  },
  totalSpaces: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Общее количество мест/ячей в ряду',
  },
  occupiedSpaces: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Количество занятых мест',
  },
  position: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Позиция ряда относительно сектора {x: number, y: number, width: number, height: number}',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Активен ли ряд',
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ['sector_id', 'code'],
      name: 'unique_sector_row_code'
    },
    {
      fields: ['sector_id'],
      name: 'rows_sector_id_idx',
    },
    {
      fields: ['is_active'],
      name: 'rows_is_active_idx',
    },
    {
      fields: ['sort_order'],
      name: 'rows_sort_order_idx',
    },
  ]
});

module.exports = Row;
