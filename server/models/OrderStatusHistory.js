const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID заявки',
  },
  oldStatus: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Предыдущий статус (null при создании заявки)',
  },
  newStatus: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Новый статус',
  },
  changedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID пользователя, который изменил статус',
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Комментарий к изменению статуса',
  },
  changedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Время изменения статуса',
  },
}, {
  tableName: 'order_status_history',
  timestamps: false, // Используем свое поле changedAt
  indexes: [
    {
      fields: ['order_id'],
      name: 'order_status_history_order_id_idx',
    },
    {
      fields: ['changed_by'],
      name: 'order_status_history_changed_by_idx',
    },
    {
      fields: ['changed_at'],
      name: 'order_status_history_changed_at_idx',
    },
    {
      fields: ['order_id', 'changed_at'],
      name: 'order_status_history_order_time_idx',
    },
  ],
});

module.exports = OrderStatusHistory;
