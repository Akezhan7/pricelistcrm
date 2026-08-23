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
    if (!(await columnExists(queryInterface, 'procurement_list_items', 'order_item_id'))) {
      await queryInterface.addColumn('procurement_list_items', 'order_item_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'order_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }

    if (!(await indexExists(queryInterface, 'uniq_procurement_list_items_order_item'))) {
      await queryInterface.addIndex(
        'procurement_list_items',
        ['order_item_id'],
        { name: 'uniq_procurement_list_items_order_item', unique: true }
      );
    }
  },

  async down(queryInterface) {
    if (await indexExists(queryInterface, 'uniq_procurement_list_items_order_item')) {
      await queryInterface.removeIndex(
        'procurement_list_items',
        'uniq_procurement_list_items_order_item'
      );
    }
    if (await columnExists(queryInterface, 'procurement_list_items', 'order_item_id')) {
      await queryInterface.removeColumn('procurement_list_items', 'order_item_id');
    }
  },
};
