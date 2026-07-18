const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmployeeTaskHistory = sequelize.define('EmployeeTaskHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  taskId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  actorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  action: {
    type: DataTypes.STRING(60),
    allowNull: false,
  },
  fromStatus: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  toStatus: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'employee_task_history',
  timestamps: false,
  indexes: [
    { fields: ['task_id', 'created_at'], name: 'idx_employee_task_history_task_created' },
    { fields: ['actor_id'], name: 'idx_employee_task_history_actor' },
    { fields: ['action'], name: 'idx_employee_task_history_action' },
  ],
});

module.exports = EmployeeTaskHistory;
