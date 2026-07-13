const { DataTypes, QueryTypes } = require('sequelize');

async function tableExists(queryInterface, tableName) {
  const rows = await queryInterface.sequelize.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :tableName`,
    { replacements: { tableName }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

async function indexExists(queryInterface, indexName) {
  const rows = await queryInterface.sequelize.query(
    'SELECT indexname FROM pg_indexes WHERE indexname = :indexName',
    { replacements: { indexName }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

async function addIndexIfMissing(queryInterface, tableName, columns, options) {
  if (!(await indexExists(queryInterface, options.name))) {
    await queryInterface.addIndex(tableName, columns, options);
  }
}

module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, 'product_lifecycle_purchases'))) {
      await queryInterface.createTable('product_lifecycle_purchases', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        product_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        supplier_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'suppliers', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        order_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'orders', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        order_item_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'order_items', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        warehouse_receipt_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          unique: true,
          references: { model: 'warehouse_receipts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        quantity: { type: DataTypes.INTEGER, allowNull: false },
        purchase_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        purchased_at: { type: DataTypes.DATE, allowNull: false },
        purchased_by: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        received_quantity: { type: DataTypes.INTEGER, allowNull: true },
        arrived_at: { type: DataTypes.DATE, allowNull: true },
        arrived_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        notes: { type: DataTypes.TEXT, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
    }

    if (!(await tableExists(queryInterface, 'product_warehouse_details'))) {
      await queryInterface.createTable('product_warehouse_details', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        product_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        sector: { type: DataTypes.STRING(80), allowNull: false },
        shelf: { type: DataTypes.STRING(80), allowNull: false },
        cell: { type: DataTypes.STRING(80), allowNull: false },
        weight: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
        length: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        width: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        height: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        notes: { type: DataTypes.TEXT, allowNull: true },
        updated_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
    }

    await addIndexIfMissing(queryInterface, 'product_lifecycle_purchases', ['supplier_id'], {
      name: 'idx_product_lifecycle_purchases_supplier',
    });
    await addIndexIfMissing(queryInterface, 'product_lifecycle_purchases', ['purchased_at'], {
      name: 'idx_product_lifecycle_purchases_purchased_at',
    });
    await addIndexIfMissing(queryInterface, 'product_lifecycle_purchases', ['arrived_at'], {
      name: 'idx_product_lifecycle_purchases_arrived_at',
    });
    await addIndexIfMissing(queryInterface, 'product_warehouse_details', ['sector', 'shelf', 'cell'], {
      name: 'idx_product_warehouse_details_location',
    });
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'product_warehouse_details')) {
      await queryInterface.dropTable('product_warehouse_details');
    }
    if (await tableExists(queryInterface, 'product_lifecycle_purchases')) {
      await queryInterface.dropTable('product_lifecycle_purchases');
    }
  },
};
