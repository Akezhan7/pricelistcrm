const { sequelize } = require('./models');

async function runMigration() {
  try {
    console.log('🔄 Начинаем миграцию unique constraint для markets.name...');
    
    // Проверяем существование constraint
    const constraintCheck = await sequelize.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'markets' 
      AND constraint_name = 'markets_name_key'
      AND constraint_type = 'UNIQUE';
    `);
    
    if (constraintCheck[0].length > 0) {
      console.log('📝 Удаляем старый UNIQUE constraint...');
      await sequelize.query('ALTER TABLE markets DROP CONSTRAINT markets_name_key;');
      console.log('✅ Constraint удален');
    } else {
      console.log('ℹ️  Constraint markets_name_key уже удален');
    }
    
    // Проверяем существование индекса
    const indexCheck = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'markets' 
      AND indexname = 'markets_name_active_unique';
    `);
    
    if (indexCheck[0].length === 0) {
      console.log('📝 Создаем частичный UNIQUE индекс для активных рынков...');
      await sequelize.query(`
        CREATE UNIQUE INDEX markets_name_active_unique 
        ON markets (name) 
        WHERE is_active = true;
      `);
      console.log('✅ Индекс создан');
    } else {
      console.log('ℹ️  Индекс markets_name_active_unique уже существует');
    }
    
    console.log('✅ Миграция успешно завершена!');
    console.log('📌 Теперь можно создавать рынки с одинаковыми названиями после удаления старых');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка миграции:', error.message);
    process.exit(1);
  }
}

runMigration();
