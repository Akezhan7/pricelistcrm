const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmployeeTaskComment = sequelize.define('EmployeeTaskComment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  taskId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  authorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 4000],
    },
  },
}, {
  tableName: 'employee_task_comments',
  timestamps: true,
  indexes: [
    { fields: ['task_id', 'created_at'], name: 'idx_employee_task_comments_task_created' },
    { fields: ['author_id'], name: 'idx_employee_task_comments_author' },
  ],
});

module.exports = EmployeeTaskComment;
