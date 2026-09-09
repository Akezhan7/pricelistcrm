const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmployeeTaskAttachment = sequelize.define('EmployeeTaskAttachment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  taskId: { type: DataTypes.INTEGER, allowNull: false },
  uploadedByUserId: { type: DataTypes.INTEGER, allowNull: false },
  originalName: { type: DataTypes.STRING(255), allowNull: false },
  storedName: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  mimeType: { type: DataTypes.STRING(120), allowNull: false },
  size: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'employee_task_attachments',
  timestamps: true,
  updatedAt: false,
  indexes: [{ fields: ['task_id', 'created_at'], name: 'idx_employee_task_attachment_task' }],
});

module.exports = EmployeeTaskAttachment;
