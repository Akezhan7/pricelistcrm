'use strict';

/**
 * ТЕСТОВАЯ МИГРАЦИЯ
 * Добавляем поле email в таблицу suppliers
 * Это демонстрация как безопасно добавлять поля БЕЗ потери данных
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('➕ Добавляем поле email в таблицу suppliers...');
    
    await queryInterface.addColumn('suppliers', 'email', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Email поставщика для связи',
    });
    
    // Добавляем индекс для быстрого поиска по email
    await queryInterface.addIndex('suppliers', ['email'], {
      name: 'suppliers_email_idx',
    });
    
    console.log('✅ Поле email успешно добавлено');
  },

  async down(queryInterface, Sequelize) {
    console.log('➖ Удаляем поле email из таблицы suppliers...');
    
    // Сначала удаляем индекс
    await queryInterface.removeIndex('suppliers', 'suppliers_email_idx');
    
    // Потом удаляем поле
    await queryInterface.removeColumn('suppliers', 'email');
    
    console.log('✅ Поле email успешно удалено');
  }
};
