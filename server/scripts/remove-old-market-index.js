require('dotenv').config();
const { sequelize } = require('../models');

async function removeOldIndex() {
  try {
    console.log('Проверяем индексы таблицы markets...');
    
    // Показываем все индексы
    const [indexes] = await sequelize.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'markets'
      ORDER BY indexname;
    `);
    
    console.log('Найденные индексы:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
      console.log(`    ${idx.indexdef}`);
    });
    
    // Удаляем старый индекс
    console.log('\nУдаляем markets_name_unique...');
    await sequelize.query('DROP INDEX IF EXISTS markets_name_unique CASCADE;');
    console.log('✅ Выполнено');
    
    // Показываем индексы после удаления
    const [indexesAfter] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'markets'
      ORDER BY indexname;
    `);
    
    console.log('\nИндексы после удаления:');
    indexesAfter.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error.message);
    console.error(error);
    process.exit(1);
  }
}

removeOldIndex();
