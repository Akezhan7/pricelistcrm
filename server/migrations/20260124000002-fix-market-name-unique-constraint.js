'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Проверяем существование constraint перед удалением
    const [constraints] = await queryInterface.sequelize.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'markets' 
      AND constraint_name = 'markets_name_key';
    `);
    
    // Удаляем старый UNIQUE constraint на name, если он существует
    if (constraints.length > 0) {
      await queryInterface.removeConstraint('markets', 'markets_name_key');
      console.log('✅ Удален constraint markets_name_key');
    } else {
      console.log('⏭️  Constraint markets_name_key не существует, пропускаем');
    }
    
    // Проверяем, не существует ли уже индекс
    const [indexes] = await queryInterface.sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'markets' 
      AND indexname = 'markets_name_active_unique';
    `);
    
    // Создаем частичный UNIQUE индекс только для активных рынков
    // Это позволит иметь несколько неактивных записей с одним именем,
    // но только одна активная запись с данным именем
    if (indexes.length === 0) {
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX markets_name_active_unique 
        ON markets (name) 
        WHERE is_active = true;
      `);
      console.log('✅ Создан индекс markets_name_active_unique');
    } else {
      console.log('⏭️  Индекс markets_name_active_unique уже существует, пропускаем');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Удаляем частичный индекс
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS markets_name_active_unique;
    `);
    
    // Восстанавливаем обычный UNIQUE constraint
    await queryInterface.addConstraint('markets', {
      fields: ['name'],
      type: 'unique',
      name: 'markets_name_key'
    });
  }
};
