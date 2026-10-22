const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SupplierBalanceAdjustment = sequelize.define('SupplierBalanceAdjustment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID поставщика',
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Поправка к балансу со знаком: плюс — больше должны поставщику, минус — меньше',
  },
  balanceBefore: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Баланс до поправки',
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Баланс после поправки',
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { notEmpty: true },
    comment: 'Причина поправки',
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Кто внёс поправку (null — перенос при миграции)',
  },
}, {
  tableName: 'supplier_balance_adjustments',
  timestamps: true,
  indexes: [
    { fields: ['supplier_id'], name: 'idx_supplier_balance_adjustments_supplier' },
  ],
});

module.exports = SupplierBalanceAdjustment;
