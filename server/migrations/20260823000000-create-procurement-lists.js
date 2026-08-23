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

module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, 'procurement_lists'))) {
      await queryInterface.createTable('procurement_lists', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        status: {
          type: DataTypes.STRING(24),
          allowNull: false,
          defaultValue: 'open',
        },
        created_by_user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        processed_at: { type: DataTypes.DATE, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
    }

    if (!(await tableExists(queryInterface, 'procurement_list_items'))) {
      await queryInterface.createTable('procurement_list_items', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        procurement_list_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'procurement_lists', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        product_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        requested_quantity: { type: DataTypes.INTEGER, allowNull: false },
        observed_stock: { type: DataTypes.INTEGER, allowNull: true },
        notes: { type: DataTypes.TEXT, allowNull: true },
        added_by_user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
    }

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_procurement_lists_open
      ON procurement_lists (status)
      WHERE status = 'open';
    `);
    if (!(await indexExists(queryInterface, 'uniq_procurement_list_items_product'))) {
      await queryInterface.addIndex(
        'procurement_list_items',
        ['procurement_list_id', 'product_id'],
        { name: 'uniq_procurement_list_items_product', unique: true }
      );
    }
    if (!(await indexExists(queryInterface, 'idx_procurement_list_items_list_created'))) {
      await queryInterface.addIndex(
        'procurement_list_items',
        ['procurement_list_id', 'created_at'],
        { name: 'idx_procurement_list_items_list_created' }
      );
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'procurement_list_items')) {
      await queryInterface.dropTable('procurement_list_items');
    }
    if (await tableExists(queryInterface, 'procurement_lists')) {
      await queryInterface.dropTable('procurement_lists');
    }
  },
};
