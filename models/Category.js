const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100],
    },
    comment: 'Название категории',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Описание категории',
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID родительской категории для вложенных категорий',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Активна ли категория',
  },
}, {
  tableName: 'categories',
  timestamps: true,
  indexes: [
    {
      fields: ['name'],
      name: 'categories_name_idx',
    },
    {
      fields: ['parent_id'],
      name: 'categories_parent_id_idx',
    },
    {
      fields: ['is_active'],
      name: 'categories_is_active_idx',
    },
  ],
});

module.exports = Category;
