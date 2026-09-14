const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductDesignerKpiEntry = sequelize.define('ProductDesignerKpiEntry', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  productId: { type: DataTypes.INTEGER, allowNull: false },
  lifecycleRunNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  designerId: { type: DataTypes.INTEGER, allowNull: false },
  reviewedByUserId: { type: DataTypes.INTEGER, allowNull: false },
  weight: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: 0.01,
    },
  },
  creditedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'product_designer_kpi_entries',
  timestamps: true,
  indexes: [{
    fields: ['product_id', 'lifecycle_run_number'],
    unique: true,
    name: 'uniq_product_designer_kpi_run',
  }],
});

module.exports = ProductDesignerKpiEntry;
