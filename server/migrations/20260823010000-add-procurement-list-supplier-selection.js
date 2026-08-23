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
    if (!(await columnExists(queryInterface, 'procurement_list_items', 'selected_supplier_id'))) {
      await queryInterface.addColumn('procurement_list_items', 'selected_supplier_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'suppliers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    if (!(await columnExists(queryInterface, 'procurement_list_items', 'purchase_price'))) {
      await queryInterface.addColumn('procurement_list_items', 'purchase_price', {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      });
    }

    if (!(await indexExists(queryInterface, 'idx_procurement_list_items_selected_supplier'))) {
      await queryInterface.addIndex(
        'procurement_list_items',
        ['selected_supplier_id'],
        { name: 'idx_procurement_list_items_selected_supplier' }
      );
    }
  },

  async down(queryInterface) {
    if (await indexExists(queryInterface, 'idx_procurement_list_items_selected_supplier')) {
      await queryInterface.removeIndex(
        'procurement_list_items',
        'idx_procurement_list_items_selected_supplier'
      );
    }
    if (await columnExists(queryInterface, 'procurement_list_items', 'purchase_price')) {
      await queryInterface.removeColumn('procurement_list_items', 'purchase_price');
    }
    if (await columnExists(queryInterface, 'procurement_list_items', 'selected_supplier_id')) {
      await queryInterface.removeColumn('procurement_list_items', 'selected_supplier_id');
    }
  },
};
