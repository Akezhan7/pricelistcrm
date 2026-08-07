module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE "orders" ALTER COLUMN "supplier_id" DROP NOT NULL'
    );
  },

  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) AS count FROM orders WHERE supplier_id IS NULL'
    );
    if (Number(rows[0]?.count || 0) > 0) {
      throw new Error('Cannot restore NOT NULL while orders without suppliers exist');
    }

    await queryInterface.sequelize.query(
      'ALTER TABLE "orders" ALTER COLUMN "supplier_id" SET NOT NULL'
    );
  },
};
