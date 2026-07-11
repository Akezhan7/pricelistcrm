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
    if (!(await tableExists(queryInterface, 'product_designer_kpi_entries'))) {
      await queryInterface.createTable('product_designer_kpi_entries', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        product_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        designer_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        reviewed_by_user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        weight: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        credited_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
    }

    await addIndexIfMissing(queryInterface, 'product_designer_kpi_entries', ['designer_id', 'credited_at'], {
      name: 'idx_product_designer_kpi_entries_designer_credited',
    });
    await addIndexIfMissing(queryInterface, 'product_designer_kpi_entries', ['credited_at'], {
      name: 'idx_product_designer_kpi_entries_credited_at',
    });
    await addIndexIfMissing(queryInterface, 'product_designer_kpi_entries', ['reviewed_by_user_id'], {
      name: 'idx_product_designer_kpi_entries_reviewer',
    });
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'product_designer_kpi_entries')) {
      await queryInterface.dropTable('product_designer_kpi_entries');
    }
  },
};
