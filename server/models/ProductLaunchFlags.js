const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductLaunchFlags = sequelize.define('ProductLaunchFlags', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  productId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  advertisingStarted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  promotionStarted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  reviewBonusEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
  updatedBy: { type: DataTypes.INTEGER, allowNull: true },
  completedBy: { type: DataTypes.INTEGER, allowNull: true },
  completedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'product_launch_flags',
  timestamps: true,
});

module.exports = ProductLaunchFlags;
