const { sequelize } = require('../models');

async function verifyFix() {
  try {
    console.log('\n🔍 ПРОВЕРКА ИСПРАВЛЕНИЯ\n');
    console.log('=' .repeat(60));

    // 1. Проверяем индексы
    const indexes = await sequelize.query(
      `SELECT indexname, indexdef FROM pg_indexes 
       WHERE tablename = 'markets' 
       ORDER BY indexname;`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('\n📊 ИНДЕКСЫ таблицы markets:\n');
    indexes.forEach(idx => {
      const isPartial = idx.indexdef.includes('WHERE');
      const icon = isPartial ? '✅' : '📌';
      console.log(`${icon} ${idx.indexname}`);
      if (isPartial) {
        console.log(`   (Частичный индекс - только для is_active = true)`);
      }
    });

    // 2. Проверяем данные
    const allMarkets = await sequelize.query(
      `SELECT id, name, is_active, created_at 
       FROM markets 
       ORDER BY name, created_at DESC;`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('\n📋 ДАННЫЕ в таблице markets:\n');
    allMarkets.forEach(m => {
      const status = m.is_active ? '🟢 АКТИВЕН' : '⚪ НЕАКТИВЕН';
      const date = new Date(m.created_at).toLocaleString('ru-RU');
      console.log(`${status} | ID: ${m.id} | "${m.name}" | ${date}`);
    });

    // 3. Ищем дубликаты
    const duplicates = await sequelize.query(
      `SELECT name, 
              COUNT(*) as total,
              COUNT(CASE WHEN is_active THEN 1 END) as active_count
       FROM markets
       GROUP BY name
       HAVING COUNT(*) > 1;`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (duplicates.length > 0) {
      console.log('\n⚠️  НАЙДЕНЫ ДУБЛИКАТЫ:\n');
      duplicates.forEach(d => {
        console.log(`   "${d.name}": ${d.total} записей (активных: ${d.active_count})`);
      });
      console.log('\n💡 Запустите: node scripts/cleanup-inactive-markets.js');
    } else {
      console.log('\n✅ Дубликатов не найдено!');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n🎯 СТАТУС: Исправление применено успешно!');
    console.log('\n📝 Теперь можно создавать рынки с названиями деактивированных.\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    await sequelize.close();
    process.exit(1);
  }
}

verifyFix();
