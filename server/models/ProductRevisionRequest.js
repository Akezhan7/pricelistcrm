const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const {
  PRODUCT_REVISION_STATUS_VALUES,
} = require('../services/productReviewService');

const ProductRevisionRequest = sequelize.define('ProductRevisionRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Product card that needs revision',
  },
  requestedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Reviewer who requested revision',
  },
  assignedDesignerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Designer responsible for resolving revision',
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  status: {
    type: DataTypes.STRING(40),
    allowNull: false,
    validate: {
      isIn: [PRODUCT_REVISION_STATUS_VALUES],
    },
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'product_revision_requests',
  timestamps: true,
  indexes: [
    {
      fields: ['product_id'],
      name: 'idx_product_revision_requests_product',
    },
    {
      fields: ['requested_by'],
      name: 'idx_product_revision_requests_requested_by',
    },
    {
      fields: ['assigned_designer_id'],
      name: 'idx_product_revision_requests_designer',
    },
    {
      fields: ['status'],
      name: 'idx_product_revision_requests_status',
    },
    {
      fields: ['product_id', 'status', 'created_at'],
      name: 'idx_product_revision_requests_product_status_created',
    },
  ],
});

module.exports = ProductRevisionRequest;
