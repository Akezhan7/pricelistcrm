const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CollectorTask = sequelize.define('CollectorTask', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID заявки на сбор',
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID пользователя-сборщика (Баха, Бауржан и др.)',
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Статус задания: ожидает / в работе / завершено',
  },
  isCollected: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Товар собран и забран',
  },
  collectedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Дата и время сбора товара',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Заметки сборщика',
  },
}, {
  tableName: 'collector_tasks',
  timestamps: true,
  indexes: [
    {
      fields: ['order_id'],
      name: 'collector_tasks_order_id_idx',
    },
    {
      fields: ['assigned_to'],
      name: 'collector_tasks_assigned_to_idx',
    },
    {
      fields: ['status'],
      name: 'collector_tasks_status_idx',
    },
    {
      fields: ['is_collected'],
      name: 'collector_tasks_is_collected_idx',
    },
    {
      fields: ['assigned_to', 'status'],
      name: 'collector_tasks_user_status_idx',
    },
  ],
});

module.exports = CollectorTask;
