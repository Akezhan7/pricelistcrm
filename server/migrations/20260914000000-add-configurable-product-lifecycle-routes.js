const { DataTypes, QueryTypes } = require('sequelize');

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName);
  if (!Object.prototype.hasOwnProperty.call(table, columnName)) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

module.exports = {
  async up(queryInterface) {
    await addColumnIfMissing(queryInterface, 'products', 'lifecycle_run_number', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await addColumnIfMissing(queryInterface, 'products', 'lifecycle_route', {
      type: DataTypes.JSONB,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'products', 'lifecycle_route_index', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'products', 'lifecycle_run_reason', {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE products
      SET lifecycle_run_number = 1
      WHERE lifecycle_started_at IS NOT NULL
        AND lifecycle_run_number = 0
    `);

    await addColumnIfMissing(
      queryInterface,
      'product_designer_kpi_entries',
      'lifecycle_run_number',
      { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
    );
    await queryInterface.sequelize.query(`
      ALTER TABLE product_designer_kpi_entries
      DROP CONSTRAINT IF EXISTS product_designer_kpi_entries_product_id_key
    `);
    const indexes = await queryInterface.sequelize.query(
      `SELECT indexname FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'product_designer_kpi_entries'`,
      { type: QueryTypes.SELECT }
    );
    if (!indexes.some((index) => index.indexname === 'uniq_product_designer_kpi_run')) {
      await queryInterface.addIndex(
        'product_designer_kpi_entries',
        ['product_id', 'lifecycle_run_number'],
        { unique: true, name: 'uniq_product_designer_kpi_run' }
      );
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.sequelize.query(
      `SELECT indexname FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'product_designer_kpi_entries'`,
      { type: QueryTypes.SELECT }
    );
    if (indexes.some((index) => index.indexname === 'uniq_product_designer_kpi_run')) {
      await queryInterface.removeIndex(
        'product_designer_kpi_entries',
        'uniq_product_designer_kpi_run'
      );
    }
    await queryInterface.addIndex('product_designer_kpi_entries', ['product_id'], {
      unique: true,
      name: 'product_designer_kpi_entries_product_id_key',
    });

    const kpiTable = await queryInterface.describeTable('product_designer_kpi_entries');
    if (Object.prototype.hasOwnProperty.call(kpiTable, 'lifecycle_run_number')) {
      await queryInterface.removeColumn('product_designer_kpi_entries', 'lifecycle_run_number');
    }

    for (const columnName of [
      'lifecycle_run_reason',
      'lifecycle_route_index',
      'lifecycle_route',
      'lifecycle_run_number',
    ]) {
      const table = await queryInterface.describeTable('products');
      if (Object.prototype.hasOwnProperty.call(table, columnName)) {
        await queryInterface.removeColumn('products', columnName);
      }
    }
  },
};
