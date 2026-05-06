'use strict';

/**
 * Миграция: Добавление market_id в sectors и suppliers
 * Привязка секторов и поставщиков к конкретным рынкам
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Проверяем существование market_id в sectors
    const sectorsTable = await queryInterface.describeTable('sectors');
    
    if (!sectorsTable.market_id) {
      // Добавление market_id в sectors
      await queryInterface.addColumn('sectors', 'market_id', {
        type: Sequelize.INTEGER,
        allowNull: true, // null для обратной совместимости
        references: {
          model: 'markets',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'ID рынка, к которому принадлежит сектор',
      });

      await queryInterface.addIndex('sectors', ['market_id'], {
        name: 'sectors_market_id_idx',
      });
      
      console.log('✅ Добавлен market_id в sectors');
    } else {
      console.log('⏭️  market_id в sectors уже существует');
    }

    // Проверяем существование market_id в suppliers
    const suppliersTable = await queryInterface.describeTable('suppliers');
    
    if (!suppliersTable.market_id) {
      // Добавление market_id в suppliers
      await queryInterface.addColumn('suppliers', 'market_id', {
        type: Sequelize.INTEGER,
        allowNull: true, // null для обратной совместимости
        references: {
          model: 'markets',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'ID рынка, на котором находится поставщик',
      });

      await queryInterface.addIndex('suppliers', ['market_id'], {
        name: 'suppliers_market_id_idx',
      });
      
      console.log('✅ Добавлен market_id в suppliers');
    } else {
      console.log('⏭️  market_id в suppliers уже существует');
    }

    // Получаем ID рынка "Байсат" для миграции существующих данных
    const [markets] = await queryInterface.sequelize.query(
      "SELECT id FROM markets WHERE name = 'Байсат' LIMIT 1"
    );

    if (markets && markets.length > 0) {
      const baysatId = markets[0].id;

      // Обновляем все существующие секторы - привязываем к Байсату
      await queryInterface.sequelize.query(
        `UPDATE sectors SET market_id = ${baysatId} WHERE market_id IS NULL`
      );

      // Обновляем всех существующих поставщиков - привязываем к Байсату
      await queryInterface.sequelize.query(
        `UPDATE suppliers SET market_id = ${baysatId} WHERE market_id IS NULL`
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // Удаление индексов
    await queryInterface.removeIndex('sectors', 'sectors_market_id_idx');
    await queryInterface.removeIndex('suppliers', 'suppliers_market_id_idx');

    // Удаление колонок
    await queryInterface.removeColumn('sectors', 'market_id');
    await queryInterface.removeColumn('suppliers', 'market_id');
  },
};
