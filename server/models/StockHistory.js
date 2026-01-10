const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * История изменений остатков товаров
 * Логирует все операции изменения currentStock в Product
 */
const StockHistory = sequelize.define('StockHistory', {
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
  oldStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Старый остаток',
  },
  newStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Новый остаток',
  },
  changeAmount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Величина изменения (может быть отрицательной)',
  },
  changeType: {
    type: DataTypes.ENUM(
      'receipt', // Приёмка товара
      'sale', // Продажа
      'manual_increase', // Ручное увеличение
      'manual_decrease', // Ручное уменьшение
      'correction', // Коррекция (инвентаризация)
      'return', // Возврат товара
      'write_off' // Списание
    ),
    allowNull: false,
    defaultValue: 'manual_increase',
    comment: 'Тип операции изменения остатка',
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID пользователя, выполнившего операцию',
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID заявки (если изменение связано с заявкой)',
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Причина изменения остатка',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Дополнительные заметки',
  },
}, {
  tableName: 'stock_histories',
  timestamps: true,
  updatedAt: false, // Только createdAt, updatedAt не нужен для истории
  indexes: [
    {
      name: 'idx_stock_history_product',
      fields: ['product_id'],
    },
    {
      name: 'idx_stock_history_user',
      fields: ['user_id'],
    },
    {
      name: 'idx_stock_history_order',
      fields: ['order_id'],
    },
    {
      name: 'idx_stock_history_type',
      fields: ['change_type'],
    },
    {
      name: 'idx_stock_history_created',
      fields: ['created_at'],
    },
  ],
});

module.exports = StockHistory;
