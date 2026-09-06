const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Supplier = sequelize.define('Supplier', {
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
      len: [1, 100],
    },
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200],
    },
    comment: 'Адрес (например, "Юсуф, 24 ряд")',
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [10, 20],
    },
  },
  whatsapp: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'WhatsApp номер (может отличаться от основного телефона)',
  },
  containerImage: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Фотография контейнера для ориентации',
  },
  sector: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Сектор на карте (игрушки, стройматериалы, посуда и т.д.)',
  },
  mapPosition: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Позиция на карте {x: number, y: number}',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Дополнительные заметки',
  },
  debt: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Задолженность перед поставщиком',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  sectorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID сектора, в котором находится поставщик',
  },
  rowId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID ряда, в котором находится поставщик',
  },
  row: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Номер ряда (для совместимости с существующими данными)',
  },
  container: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Номер контейнера (для совместимости с существующими данными)',
  },
  marketId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID рынка, на котором находится поставщик',
  },
}, {
  indexes: [
    {
      fields: ['name'],
      name: 'suppliers_name_idx',
    },
    {
      fields: ['phone'],
      name: 'suppliers_phone_idx',
    },
    {
      fields: ['sector_id'],
      name: 'suppliers_sector_id_idx',
    },
    {
      fields: ['row_id'],
      name: 'suppliers_row_id_idx',
    },
    {
      fields: ['is_active'],
      name: 'suppliers_is_active_idx',
    },
    {
      fields: ['debt'],
      name: 'suppliers_debt_idx',
    },
  ],
});

module.exports = Supplier;
