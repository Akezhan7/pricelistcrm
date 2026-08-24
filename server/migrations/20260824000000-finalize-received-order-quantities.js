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
    if (!(await columnExists(queryInterface, 'order_items', 'ordered_quantity'))) {
      await queryInterface.addColumn('order_items', 'ordered_quantity', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }
    if (!(await columnExists(queryInterface, 'warehouse_receipt_items', 'order_item_id'))) {
      await queryInterface.addColumn('warehouse_receipt_items', 'order_item_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'order_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }
    if (!(await indexExists(queryInterface, 'warehouse_receipt_items_order_item_idx'))) {
      await queryInterface.addIndex(
        'warehouse_receipt_items',
        ['order_item_id'],
        { name: 'warehouse_receipt_items_order_item_idx' }
      );
    }
  },

  async down(queryInterface) {
    if (await indexExists(queryInterface, 'warehouse_receipt_items_order_item_idx')) {
      await queryInterface.removeIndex(
        'warehouse_receipt_items',
        'warehouse_receipt_items_order_item_idx'
      );
    }
    if (await columnExists(queryInterface, 'warehouse_receipt_items', 'order_item_id')) {
      await queryInterface.removeColumn('warehouse_receipt_items', 'order_item_id');
    }
    if (await columnExists(queryInterface, 'order_items', 'ordered_quantity')) {
      await queryInterface.removeColumn('order_items', 'ordered_quantity');
    }
  },
};
