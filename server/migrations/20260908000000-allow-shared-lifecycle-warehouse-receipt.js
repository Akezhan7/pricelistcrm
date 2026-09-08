const { QueryTypes } = require('sequelize');

async function constraintExists(queryInterface, constraintName) {
  const rows = await queryInterface.sequelize.query(
    `SELECT constraint_name FROM information_schema.table_constraints
     WHERE table_schema = 'public'
       AND table_name = 'product_lifecycle_purchases'
       AND constraint_name = :constraintName`,
    { replacements: { constraintName }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

async function indexExists(queryInterface, indexName) {
  const rows = await queryInterface.sequelize.query(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = :indexName`,
    { replacements: { indexName }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

const UNIQUE_NAME = 'product_lifecycle_purchases_warehouse_receipt_id_key';

module.exports = {
  async up(queryInterface) {
    if (await constraintExists(queryInterface, UNIQUE_NAME)) {
      await queryInterface.removeConstraint('product_lifecycle_purchases', UNIQUE_NAME);
    }
    if (await indexExists(queryInterface, UNIQUE_NAME)) {
      await queryInterface.removeIndex('product_lifecycle_purchases', UNIQUE_NAME);
    }
  },

  async down(queryInterface) {
    if (!(await indexExists(queryInterface, UNIQUE_NAME))) {
      await queryInterface.addIndex(
        'product_lifecycle_purchases',
        ['warehouse_receipt_id'],
        { name: UNIQUE_NAME, unique: true }
      );
    }
  },
};
