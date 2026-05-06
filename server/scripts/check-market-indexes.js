const { sequelize } = require('../models');

async function checkIndexes() {
  try {
    const indexes = await sequelize.query(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'markets' ORDER BY indexname;`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('\n📊 Существующие индексы таблицы markets:\n');
    indexes.forEach(idx => {
      console.log(`  🔹 ${idx.indexname}`);
      console.log(`     ${idx.indexdef}\n`);
    });

    // Проверяем данные в таблице
    const markets = await sequelize.query(
      `SELECT id, name, is_active FROM markets ORDER BY id;`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('\n📋 Данные в таблице markets:\n');
    markets.forEach(m => {
      console.log(`  ${m.is_active ? '✅' : '❌'} ID: ${m.id}, Name: ${m.name}`);
    });
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

checkIndexes();
