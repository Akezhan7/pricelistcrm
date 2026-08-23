const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { PROCUREMENT_LIST_STATUSES } = require('../services/procurementListService');

const ProcurementList = sequelize.define('ProcurementList', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  status: {
    type: DataTypes.STRING(24),
    allowNull: false,
    defaultValue: PROCUREMENT_LIST_STATUSES.OPEN,
    validate: { isIn: [Object.values(PROCUREMENT_LIST_STATUSES)] },
  },
  createdByUserId: { type: DataTypes.INTEGER, allowNull: false },
  processedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'procurement_lists',
  timestamps: true,
});

module.exports = ProcurementList;
