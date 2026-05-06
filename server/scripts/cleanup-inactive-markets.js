const { sequelize } = require('../models');

/**
 * Скрипт для очистки дублирующихся неактивных рынков
 * Запуск: node scripts/cleanup-inactive-markets.js
 */

async function cleanupInactiveMarkets() {
  try {
    console.log('\n🔍 Поиск дублирующихся неактивных рынков...\n');

    // Находим дубликаты (несколько записей с одинаковым именем и is_active = false)
    const duplicates = await sequelize.query(`
      SELECT 
        name,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY created_at DESC) as ids,
        ARRAY_AGG(created_at ORDER BY created_at DESC) as dates
      FROM markets
      WHERE is_active = false
      GROUP BY name
      HAVING COUNT(*) > 1
      ORDER BY name;
    `, { type: sequelize.QueryTypes.SELECT });

    if (duplicates.length === 0) {
      console.log('✅ Дубликатов не найдено!\n');
      await sequelize.close();
      return;
    }

    console.log(`⚠️  Найдено ${duplicates.length} групп дубликатов:\n`);
    
    let totalDeleted = 0;

    for (const dup of duplicates) {
      console.log(`📦 Рынок: "${dup.name}"`);
      console.log(`   Количество записей: ${dup.count}`);
      
      const ids = dup.ids;
      const dates = dup.dates;
      
      // Оставляем самую новую запись, остальные удаляем
      const keepId = ids[0];
      const deleteIds = ids.slice(1);
      
      console.log(`   ✅ Оставляем: ID ${keepId} (${dates[0]})`);
      
      if (deleteIds.length > 0) {
        console.log(`   🗑️  Удаляем: ${deleteIds.map((id, i) => `ID ${id} (${dates[i + 1]})`).join(', ')}`);
        
        // Физическое удаление старых дубликатов
        await sequelize.query(`
          DELETE FROM markets WHERE id IN (${deleteIds.join(',')});
        `);
        
        totalDeleted += deleteIds.length;
      }
      
      console.log('');
    }

    console.log(`\n✅ Очистка завершена! Удалено записей: ${totalDeleted}\n`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    await sequelize.close();
    process.exit(1);
  }
}

cleanupInactiveMarkets();
