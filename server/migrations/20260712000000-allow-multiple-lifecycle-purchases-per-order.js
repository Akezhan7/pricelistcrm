const { QueryTypes } = require('sequelize');

async function tableExists(queryInterface, tableName) {
  const rows = await queryInterface.sequelize.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :tableName`,
    { replacements: { tableName }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

async function constraintExists(queryInterface, constraintName) {
  const rows = await queryInterface.sequelize.query(
    `SELECT constraint_name FROM information_schema.table_constraints
     WHERE table_schema = 'public' AND table_name = 'product_lifecycle_purchases'
       AND constraint_name = :constraintName`,
    { replacements: { constraintName }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

async function indexExists(queryInterface, indexName) {
  const rows = await queryInterface.sequelize.query(
    'SELECT indexname FROM pg_indexes WHERE schemaname = :schema AND indexname = :indexName',
    { replacements: { schema: 'public', indexName }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

async function removeConstraintIfExists(queryInterface, constraintName) {
  if (await constraintExists(queryInterface, constraintName)) {
    await queryInterface.removeConstraint('product_lifecycle_purchases', constraintName);
  }
}

async function removeIndexIfExists(queryInterface, indexName) {
  if (await indexExists(queryInterface, indexName)) {
    await queryInterface.removeIndex('product_lifecycle_purchases', indexName);
  }
}

module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, 'product_lifecycle_purchases'))) return;

    await removeConstraintIfExists(queryInterface, 'product_lifecycle_purchases_order_id_key');
    await removeIndexIfExists(queryInterface, 'product_lifecycle_purchases_order_id_key');
    await removeIndexIfExists(queryInterface, 'product_lifecycle_purchases_order_id');
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, 'product_lifecycle_purchases'))) return;

    if (!(await indexExists(queryInterface, 'product_lifecycle_purchases_order_id_key'))) {
      await queryInterface.addIndex('product_lifecycle_purchases', ['order_id'], {
        name: 'product_lifecycle_purchases_order_id_key',
        unique: true,
      });
    }
  },
};
