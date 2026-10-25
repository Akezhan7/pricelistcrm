/**
 * Раньше пара (закупочный лист, товар) была уникальной, включая уже оформленные в заявку позиции.
 * Пока в открытом листе есть неготовые позиции, лист не закрывается, и товар, который уже заказали
 * из него, нельзя было добавить повторно (ошибка «уже оформлен», хотя в листе его не видно).
 * Теперь уникальна только позиция, ещё не оформленная в заявку.
 */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.query('DROP INDEX IF EXISTS uniq_procurement_list_items_product');
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_procurement_list_items_pending_product
      ON procurement_list_items (procurement_list_id, product_id)
      WHERE order_item_id IS NULL
    `);
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.query('DROP INDEX IF EXISTS uniq_procurement_list_items_pending_product');
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_procurement_list_items_product
      ON procurement_list_items (procurement_list_id, product_id)
    `);
  },
};
