const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const {
  PRODUCT_ASSET_TYPE_VALUES,
} = require('../services/productAssetService');

const ProductAsset = sequelize.define('ProductAsset', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Product linked to this asset',
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User who uploaded this asset',
  },
  revisionRequestId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Revision request linked to this asset',
  },
  assetType: {
    type: DataTypes.STRING(40),
    allowNull: false,
    validate: {
      isIn: [PRODUCT_ASSET_TYPE_VALUES],
    },
    comment: 'Stable product asset type',
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Stored file path',
  },
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Original uploaded file name',
  },
  mimeType: {
    type: DataTypes.STRING(120),
    allowNull: true,
    comment: 'Uploaded file MIME type',
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Uploaded file size in bytes',
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'product_assets',
  timestamps: true,
  indexes: [
    {
      fields: ['product_id'],
      name: 'idx_product_assets_product',
    },
    {
      fields: ['asset_type'],
      name: 'idx_product_assets_type',
    },
    {
      fields: ['uploaded_by'],
      name: 'idx_product_assets_uploaded_by',
    },
    {
      fields: ['revision_request_id'],
      name: 'idx_product_assets_revision_request',
    },
    {
      fields: ['is_active'],
      name: 'idx_product_assets_is_active',
    },
    {
      fields: ['product_id', 'asset_type', 'sort_order'],
      name: 'idx_product_assets_product_type_order',
    },
  ],
});

module.exports = ProductAsset;
