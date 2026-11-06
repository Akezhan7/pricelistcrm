const { DataTypes, QueryTypes } = require('sequelize');

async function tableExists(queryInterface, tableName) {
  const rows = await queryInterface.sequelize.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :tableName`,
    { replacements: { tableName }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

const userReference = {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: { model: 'users', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'SET NULL',
};

module.exports = {
  async up(queryInterface) {
    if (await tableExists(queryInterface, 'product_dumping')) return;

    await queryInterface.createTable('product_dumping', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      min_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      max_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      updated_by: userReference,
      connected_by: userReference,
      connected_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('product_dumping', ['connected_at'], {
      name: 'idx_product_dumping_connected_at',
    });
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'product_dumping')) {
      await queryInterface.dropTable('product_dumping');
    }
  },
};
