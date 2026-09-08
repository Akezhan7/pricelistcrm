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
    'SELECT indexname FROM pg_indexes WHERE schemaname = \'public\' AND indexname = :indexName',
    { replacements: { indexName }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, 'order_corrections'))) {
      await queryInterface.createTable('order_corrections', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        order_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'orders', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        correction_type: { type: DataTypes.STRING(32), allowNull: false },
        reason: { type: DataTypes.TEXT, allowNull: false },
        before_data: { type: DataTypes.JSONB, allowNull: false },
        after_data: { type: DataTypes.JSONB, allowNull: false },
        changed_by: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
    }

    if (!(await indexExists(queryInterface, 'order_corrections_order_created_idx'))) {
      await queryInterface.addIndex(
        'order_corrections',
        ['order_id', 'created_at'],
        { name: 'order_corrections_order_created_idx' }
      );
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'order_corrections')) {
      await queryInterface.dropTable('order_corrections');
    }
  },
};
