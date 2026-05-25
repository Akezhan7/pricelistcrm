'use strict';

/**
 * Добавляет колонку payments.receipt_url для хранения пути к чеку (изображение или PDF).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('payments');
    if (!tableDesc.receipt_url) {
      console.log('🔄 Добавляем колонку payments.receipt_url...');
      await queryInterface.addColumn('payments', 'receipt_url', {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Путь к файлу чека (например /uploads/receipt-...)',
      });
      console.log('  ✅ Колонка payments.receipt_url добавлена');
    } else {
      console.log('  ⏭️  Колонка payments.receipt_url уже существует');
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('payments');
    if (tableDesc.receipt_url) {
      await queryInterface.removeColumn('payments', 'receipt_url');
      console.log('✅ Колонка payments.receipt_url удалена');
    }
  },
};
