const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const {
  MARKETPLACE_LISTING_STATUS_VALUES,
  MARKETPLACE_VALUES,
} = require('../services/productMarketplaceService');

const ProductMarketplaceListing = sequelize.define('ProductMarketplaceListing', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Product linked to this marketplace listing',
  },
  marketplace: {
    type: DataTypes.STRING(40),
    allowNull: false,
    validate: {
      isIn: [MARKETPLACE_VALUES],
    },
  },
  status: {
    type: DataTypes.STRING(40),
    allowNull: false,
    validate: {
      isIn: [MARKETPLACE_LISTING_STATUS_VALUES],
    },
  },
  sku: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  marketplaceArticle: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  marketplaceName: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    validate: {
      min: 0,
    },
  },
  url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  managedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Marketplace manager who last updated this listing',
  },
}, {
  tableName: 'product_marketplace_listings',
  timestamps: true,
  indexes: [
    {
      fields: ['product_id'],
      name: 'idx_product_marketplace_listings_product',
    },
    {
      fields: ['marketplace'],
      name: 'idx_product_marketplace_listings_marketplace',
    },
    {
      fields: ['status'],
      name: 'idx_product_marketplace_listings_status',
    },
    {
      fields: ['managed_by'],
      name: 'idx_product_marketplace_listings_managed_by',
    },
    {
      fields: ['product_id', 'marketplace'],
      name: 'uq_product_marketplace_listings_product_marketplace',
      unique: true,
    },
  ],
});

module.exports = ProductMarketplaceListing;
