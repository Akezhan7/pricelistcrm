'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_orders_status" ADD VALUE IF NOT EXISTS 'Отменена';
    `);

    await queryInterface.sequelize.query(`
      UPDATE suppliers AS supplier
      SET debt = COALESCE((
        SELECT SUM(GREATEST(orders.total_amount - orders.paid_amount, 0))
        FROM orders
        WHERE orders.supplier_id = supplier.id
          AND orders.is_active = true
          AND orders.status IN ('Принята на складе', 'Закрыта')
      ), 0);
    `);
  },

  async down() {
    console.log('Статус "Отменена" оставлен в enum_orders_status: PostgreSQL не удаляет ENUM-значения безопасно.');
  },
};
