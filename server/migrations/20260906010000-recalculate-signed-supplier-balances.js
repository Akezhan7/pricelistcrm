module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE suppliers AS supplier
      SET debt = ROUND((
        COALESCE((
          SELECT SUM(CASE WHEN orders.type = 'return' THEN -orders.total_amount ELSE orders.total_amount END)
          FROM orders
          WHERE orders.supplier_id = supplier.id
            AND orders.is_active = true
            AND orders.status IN ('Принята на складе', 'Закрыта')
        ), 0)
        - COALESCE((
          SELECT SUM(payments.amount)
          FROM payments
          WHERE payments.supplier_id = supplier.id
        ), 0)
      )::numeric, 2)
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE suppliers
      SET debt = GREATEST(debt, 0)
    `);
  },
};
