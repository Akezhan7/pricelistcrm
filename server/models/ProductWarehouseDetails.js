const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductWarehouseDetails = sequelize.define('ProductWarehouseDetails', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  productId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  sector: { type: DataTypes.STRING(80), allowNull: false },
  shelf: { type: DataTypes.STRING(80), allowNull: false },
  cell: { type: DataTypes.STRING(80), allowNull: false },
  weight: { type: DataTypes.DECIMAL(10, 3), allowNull: true, validate: { min: 0 } },
  length: { type: DataTypes.DECIMAL(10, 2), allowNull: true, validate: { min: 0 } },
  width: { type: DataTypes.DECIMAL(10, 2), allowNull: true, validate: { min: 0 } },
  height: { type: DataTypes.DECIMAL(10, 2), allowNull: true, validate: { min: 0 } },
  notes: { type: DataTypes.TEXT, allowNull: true },
  updatedBy: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'product_warehouse_details',
  timestamps: true,
});

module.exports = ProductWarehouseDetails;
