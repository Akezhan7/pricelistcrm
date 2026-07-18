const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const {
  EMPLOYEE_TASK_PRIORITIES,
  EMPLOYEE_TASK_STATUSES,
} = require('../services/employeeTaskService');

const EmployeeTask = sequelize.define('EmployeeTask', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING(160),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 160],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM(...Object.values(EMPLOYEE_TASK_STATUSES)),
    allowNull: false,
    defaultValue: EMPLOYEE_TASK_STATUSES.NEW,
  },
  priority: {
    type: DataTypes.ENUM(...Object.values(EMPLOYEE_TASK_PRIORITIES)),
    allowNull: false,
    defaultValue: EMPLOYEE_TASK_PRIORITIES.NORMAL,
  },
  createdByUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  assignedToUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'employee_tasks',
  timestamps: true,
  indexes: [
    { fields: ['assigned_to_user_id', 'status'], name: 'idx_employee_tasks_assignee_status' },
    { fields: ['created_by_user_id'], name: 'idx_employee_tasks_creator' },
    { fields: ['status'], name: 'idx_employee_tasks_status' },
    { fields: ['due_date'], name: 'idx_employee_tasks_due_date' },
  ],
});

module.exports = EmployeeTask;
