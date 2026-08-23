const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProcurementListItem = sequelize.define('ProcurementListItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  procurementListId: { type: DataTypes.INTEGER, allowNull: false },
  productId: { type: DataTypes.INTEGER, allowNull: false },
  requestedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, isInt: true },
  },
  observedStock: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0, isInt: true },
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
  selectedSupplierId: { type: DataTypes.INTEGER, allowNull: true },
  purchasePrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    validate: { min: 0 },
  },
  orderItemId: { type: DataTypes.INTEGER, allowNull: true, unique: true },
  addedByUserId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'procurement_list_items',
  timestamps: true,
  indexes: [
    {
      fields: ['procurement_list_id', 'product_id'],
      name: 'uniq_procurement_list_items_product',
      unique: true,
    },
    {
      fields: ['procurement_list_id', 'created_at'],
      name: 'idx_procurement_list_items_list_created',
    },
    {
      fields: ['selected_supplier_id'],
      name: 'idx_procurement_list_items_selected_supplier',
    },
    {
      fields: ['order_item_id'],
      name: 'uniq_procurement_list_items_order_item',
      unique: true,
    },
  ],
});

module.exports = ProcurementListItem;
