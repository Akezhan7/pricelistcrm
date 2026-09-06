const { DataTypes, QueryTypes } = require('sequelize');

async function columnExists(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(table, columnName);
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
    if (!(await columnExists(queryInterface, 'product_suppliers', 'is_preferred'))) {
      await queryInterface.addColumn('product_suppliers', 'is_preferred', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE product_suppliers AS product_supplier
      SET is_preferred = true
      FROM (
        SELECT product_id, MIN(id) AS id
        FROM product_suppliers
        GROUP BY product_id
        HAVING COUNT(*) = 1
      ) AS sole_supplier
      WHERE product_supplier.id = sole_supplier.id
    `);

    if (!(await indexExists(queryInterface, 'uniq_product_suppliers_preferred'))) {
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX uniq_product_suppliers_preferred
        ON product_suppliers (product_id)
        WHERE is_preferred = true
      `);
    }
  },

  async down(queryInterface) {
    if (await indexExists(queryInterface, 'uniq_product_suppliers_preferred')) {
      await queryInterface.removeIndex('product_suppliers', 'uniq_product_suppliers_preferred');
    }
    if (await columnExists(queryInterface, 'product_suppliers', 'is_preferred')) {
      await queryInterface.removeColumn('product_suppliers', 'is_preferred');
    }
  },
};
