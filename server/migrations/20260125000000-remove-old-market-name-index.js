'use strict';

/**
 * Миграция: Удаление старого уникального индекса markets_name_unique
 * Причина: Конфликт между обычным уникальным индексом и частичным индексом
 * После этой миграции будет работать только markets_name_active_unique (частичный)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Проверяем существование старого индекса
      const indexes = await queryInterface.showIndex('markets');
      const oldIndexExists = indexes.some(idx => idx.name === 'markets_name_unique');

      if (oldIndexExists) {
        console.log('🔄 Удаляем старый индекс markets_name_unique...');
        await queryInterface.removeIndex('markets', 'markets_name_unique');
        console.log('✅ Старый индекс успешно удален');
      } else {
        console.log('⏭️  Индекс markets_name_unique уже удален');
      }

      // Проверяем наличие частичного индекса (должен существовать из предыдущей миграции)
      const partialIndexExists = await queryInterface.sequelize.query(
        `SELECT indexname FROM pg_indexes 
         WHERE tablename = 'markets' AND indexname = 'markets_name_active_unique';`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      if (partialIndexExists.length === 0) {
        console.log('⚠️  Частичный индекс не найден! Создаем...');
        await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX markets_name_active_unique 
          ON markets (name) 
          WHERE is_active = true;
        `);
        console.log('✅ Частичный индекс создан');
      } else {
        console.log('✅ Частичный индекс markets_name_active_unique существует');
      }
    } catch (error) {
      console.error('❌ Ошибка в миграции:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Откат: восстанавливаем старый индекс
    console.log('⬇️  Откат: восстанавливаем старый индекс');
    
    // Удаляем частичный индекс
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS markets_name_active_unique;
    `);

    // Создаем обычный уникальный индекс
    await queryInterface.addIndex('markets', ['name'], {
      unique: true,
      name: 'markets_name_unique',
    });
  }
};
