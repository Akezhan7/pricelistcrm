const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductActionHistory = sequelize.define('ProductActionHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Product card affected by this action',
  },
  actorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User who performed the action',
  },
  actionType: {
    type: DataTypes.STRING(80),
    allowNull: false,
    comment: 'Stable action key',
  },
  fromStatus: {
    type: DataTypes.STRING(40),
    allowNull: true,
    comment: 'Lifecycle status before action',
  },
  toStatus: {
    type: DataTypes.STRING(40),
    allowNull: true,
    comment: 'Lifecycle status after action',
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Human-readable action summary',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Action-specific structured data',
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Action time',
  },
}, {
  tableName: 'product_action_history',
  timestamps: false,
  indexes: [
    {
      fields: ['product_id'],
      name: 'idx_product_action_history_product',
    },
    {
      fields: ['actor_id'],
      name: 'idx_product_action_history_actor',
    },
    {
      fields: ['action_type'],
      name: 'idx_product_action_history_action',
    },
    {
      fields: ['created_at'],
      name: 'idx_product_action_history_created',
    },
    {
      fields: ['product_id', 'created_at'],
      name: 'idx_product_action_history_product_created',
    },
  ],
});

module.exports = ProductActionHistory;
