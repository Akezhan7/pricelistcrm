const { DataTypes, QueryTypes } = require('sequelize');

async function tableExists(queryInterface, tableName) {
  const rows = await queryInterface.sequelize.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :tableName",
    { replacements: { tableName }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

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
    if (!(await columnExists(queryInterface, 'orders', 'settlement_type'))) {
      await queryInterface.addColumn('orders', 'settlement_type', {
        type: DataTypes.STRING(24),
        allowNull: false,
        defaultValue: 'standard',
      });
    }

    if (!(await tableExists(queryInterface, 'order_settlement_history'))) {
      await queryInterface.createTable('order_settlement_history', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        order_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'orders', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        old_settlement_type: { type: DataTypes.STRING(24), allowNull: false },
        new_settlement_type: { type: DataTypes.STRING(24), allowNull: false },
        changed_by: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        comment: { type: DataTypes.TEXT, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
    }

    if (!(await indexExists(queryInterface, 'orders_settlement_type_idx'))) {
      await queryInterface.addIndex(
        'orders',
        ['settlement_type'],
        { name: 'orders_settlement_type_idx' }
      );
    }
    if (!(await indexExists(queryInterface, 'order_settlement_history_order_created_idx'))) {
      await queryInterface.addIndex(
        'order_settlement_history',
        ['order_id', 'created_at'],
        { name: 'order_settlement_history_order_created_idx' }
      );
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'order_settlement_history')) {
      await queryInterface.dropTable('order_settlement_history');
    }
    if (await indexExists(queryInterface, 'orders_settlement_type_idx')) {
      await queryInterface.removeIndex('orders', 'orders_settlement_type_idx');
    }
    if (await columnExists(queryInterface, 'orders', 'settlement_type')) {
      await queryInterface.removeColumn('orders', 'settlement_type');
    }
  },
};
