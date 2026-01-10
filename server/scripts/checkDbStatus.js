require('dotenv').config();
const sequelize = require('../config/database');

async function checkDbStatus() {
  try {
    console.log('🔄 Подключение к базе данных...');
    await sequelize.authenticate();
    console.log('✅ Подключено к БД\n');

    // Получаем список таблиц
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 Таблицы в БД:');
    if (tables.length === 0) {
      console.log('  (пусто - таблиц нет)');
    } else {
      tables.forEach(t => console.log('  - ' + t.table_name));
    }
    console.log('');

    // Проверяем таблицу миграций
    try {
      const [meta] = await sequelize.query(`SELECT name FROM sequelize_meta ORDER BY name`);
      console.log('📋 Выполненные миграции (sequelize_meta):');
      if (meta.length === 0) {
        console.log('  (пусто - миграций нет)');
      } else {
        meta.forEach(m => console.log('  ✓ ' + m.name));
      }
    } catch (e) {
      console.log('⚠️  Таблица sequelize_meta не существует');
    }
    console.log('');

    // Проверяем существование ключевых таблиц для новых миграций
    const keyTables = ['categories', 'order_confirmations', 'collector_tasks', 'warehouse_receipts', 'warehouse_receipt_items'];
    console.log('🔍 Проверка новых таблиц:');
    for (const table of keyTables) {
      const exists = tables.some(t => t.table_name === table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    }
    console.log('');

    // Проверяем поля products
    try {
      const [columns] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        ORDER BY ordinal_position
      `);
      console.log('📦 Поля в таблице products:');
      columns.forEach(c => console.log('  - ' + c.column_name));
      
      const newFields = ['internal_name', 'kaspi_name', 'kaspi_article', 'current_stock', 'min_stock', 'category_id'];
      const missingFields = newFields.filter(f => !columns.some(c => c.column_name === f));
      if (missingFields.length > 0) {
        console.log('\n⚠️  Отсутствующие новые поля в products:');
        missingFields.forEach(f => console.log('  - ' + f));
      } else {
        console.log('\n✅ Все новые поля в products присутствуют');
      }
    } catch (e) {
      console.log('⚠️  Таблица products не существует');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    process.exit(1);
  }
}

checkDbStatus();
