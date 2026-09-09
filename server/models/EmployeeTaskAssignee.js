const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmployeeTaskAssignee = sequelize.define('EmployeeTaskAssignee', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  taskId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'collaborator' },
}, {
  tableName: 'employee_task_assignees',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { unique: true, fields: ['task_id', 'user_id'], name: 'uniq_employee_task_assignee' },
    { fields: ['user_id', 'task_id'], name: 'idx_employee_task_assignee_user' },
  ],
});

module.exports = EmployeeTaskAssignee;
