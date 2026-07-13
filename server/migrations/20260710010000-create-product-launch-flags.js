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
    if (!(await tableExists(queryInterface, 'product_launch_flags'))) {
      await queryInterface.createTable('product_launch_flags', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        product_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        internal_advertising_started: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        external_advertising_started: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        review_bonus_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        seller_bonus_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        notes: { type: DataTypes.TEXT, allowNull: true },
        updated_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        completed_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        completed_at: { type: DataTypes.DATE, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
    }

    await addIndexIfMissing(queryInterface, 'product_launch_flags', ['completed_at'], {
      name: 'idx_product_launch_flags_completed_at',
    });
    await addIndexIfMissing(queryInterface, 'product_launch_flags', ['updated_by'], {
      name: 'idx_product_launch_flags_updated_by',
    });

    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        UPDATE products p
        SET lifecycle_completed_at = COALESCE(p.lifecycle_completed_at, p.updated_at, NOW())
        WHERE p.lifecycle_status = 'in_sale'
          AND NOT EXISTS (
            SELECT 1
            FROM product_action_history history
            WHERE history.product_id = p.id
              AND history.action_type = 'warehouse_completed'
          );
      `, { transaction });

      await queryInterface.sequelize.query(`
        UPDATE products p
        SET lifecycle_completed_at = NULL
        WHERE p.lifecycle_status = 'in_sale'
          AND EXISTS (
            SELECT 1
            FROM product_action_history history
            WHERE history.product_id = p.id
              AND history.action_type = 'warehouse_completed'
          )
          AND NOT EXISTS (
            SELECT 1
            FROM product_action_history history
            WHERE history.product_id = p.id
              AND history.action_type = 'sale_launch_completed'
          );
      `, { transaction });

      await queryInterface.sequelize.query(`
        INSERT INTO product_launch_flags (
          product_id,
          internal_advertising_started,
          external_advertising_started,
          review_bonus_enabled,
          seller_bonus_enabled,
          completed_at,
          created_at,
          updated_at
        )
        SELECT
          p.id,
          FALSE,
          FALSE,
          FALSE,
          FALSE,
          p.lifecycle_completed_at,
          NOW(),
          NOW()
        FROM products p
        WHERE p.lifecycle_status = 'in_sale'
        ON CONFLICT (product_id) DO NOTHING;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'product_launch_flags')) {
      await queryInterface.dropTable('product_launch_flags');
    }
  },
};
