const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductDumping = sequelize.define('ProductDumping', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  productId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  minPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  maxPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  updatedBy: { type: DataTypes.INTEGER, allowNull: true },
  connectedBy: { type: DataTypes.INTEGER, allowNull: true },
  connectedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'product_dumping',
  timestamps: true,
});

module.exports = ProductDumping;
