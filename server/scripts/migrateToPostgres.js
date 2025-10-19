/**
 * Скрипт миграции данных из SQLite в PostgreSQL
 * 
 * Использование:
 * 1. Убедитесь, что PostgreSQL запущен и база данных создана
 * 2. Обновите .env с настройками PostgreSQL
 * 3. Запустите: node server/scripts/migrateToPostgres.js
 * 
 * Скрипт:
 * - Читает данные из SQLite (database.sqlite)
 * - Создает структуру таблиц в PostgreSQL
 * - Переносит все данные
 * - Сохраняет связи между таблицами
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');

// Модели
const User = require('../models/User');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const ProductSupplier = require('../models/ProductSupplier');
const ProductVariation = require('../models/ProductVariation');
const Sector = require('../models/Sector');
const Row = require('../models/Row');

// Подключение к SQLite (источник)
const sqliteDb = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.SQLITE_PATH || path.join(__dirname, '../../database.sqlite'),
  logging: false,
});

// Подключение к PostgreSQL (назначение)
const postgresDb = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'crm3_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  logging: false,
});

// Определяем модели для SQLite
const sqliteModels = {
  User: sqliteDb.define('User', User.rawAttributes, { tableName: 'Users' }),
  Product: sqliteDb.define('Product', Product.rawAttributes, { tableName: 'Products' }),
  Supplier: sqliteDb.define('Supplier', Supplier.rawAttributes, { tableName: 'Suppliers' }),
  ProductSupplier: sqliteDb.define('ProductSupplier', ProductSupplier.rawAttributes, { tableName: 'ProductSuppliers' }),
  ProductVariation: sqliteDb.define('ProductVariation', ProductVariation.rawAttributes, { tableName: 'ProductVariations' }),
  Sector: sqliteDb.define('Sector', Sector.rawAttributes, { tableName: 'Sectors' }),
  Row: sqliteDb.define('Row', Row.rawAttributes, { tableName: 'Rows' }),
};

// Определяем модели для PostgreSQL
const postgresModels = {
  User: postgresDb.define('User', User.rawAttributes, { tableName: 'Users' }),
  Product: postgresDb.define('Product', Product.rawAttributes, { tableName: 'Products' }),
  Supplier: postgresDb.define('Supplier', Supplier.rawAttributes, { tableName: 'Suppliers' }),
  ProductSupplier: postgresDb.define('ProductSupplier', ProductSupplier.rawAttributes, { tableName: 'ProductSuppliers' }),
  ProductVariation: postgresDb.define('ProductVariation', ProductVariation.rawAttributes, { tableName: 'ProductVariations' }),
  Sector: postgresDb.define('Sector', Sector.rawAttributes, { tableName: 'Sectors' }),
  Row: postgresDb.define('Row', Row.rawAttributes, { tableName: 'Rows' }),
};

/**
 * Миграция данных для одной таблицы
 */
async function migrateTable(modelName, description) {
  try {
    console.log(`\n📦 Миграция ${description}...`);
    
    const sourceModel = sqliteModels[modelName];
    const targetModel = postgresModels[modelName];
    
    // Читаем данные из SQLite
    const data = await sourceModel.findAll({ raw: true });
    
    if (data.length === 0) {
      console.log(`   ℹ️  Нет данных для миграции`);
      return { success: true, count: 0 };
    }
    
    console.log(`   📊 Найдено записей: ${data.length}`);
    
    // Вставляем данные в PostgreSQL пакетами
    const batchSize = 100;
    let migratedCount = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      // Обрабатываем каждую запись
      const processedBatch = batch.map(record => {
        // Копируем запись
        const newRecord = { ...record };
        
        // Убираем bcrypt хуки для User (пароли уже захешированы)
        if (modelName === 'User') {
          // Пароли уже захешированы в SQLite, просто копируем
        }
        
        return newRecord;
      });
      
      await targetModel.bulkCreate(processedBatch, {
        updateOnDuplicate: Object.keys(targetModel.rawAttributes),
      });
      
      migratedCount += batch.length;
      console.log(`   ✓ Перенесено: ${migratedCount}/${data.length}`);
    }
    
    console.log(`   ✅ ${description} успешно перенесены`);
    return { success: true, count: migratedCount };
    
  } catch (error) {
    console.error(`   ❌ Ошибка миграции ${description}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Основная функция миграции
 */
async function migrate() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   МИГРАЦИЯ ДАННЫХ: SQLite → PostgreSQL              ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  
  const startTime = Date.now();
  const results = {};
  
  try {
    // 1. Проверка подключения к SQLite
    console.log('\n🔍 Проверка подключения к SQLite...');
    await sqliteDb.authenticate();
    console.log('✓ SQLite подключен');
    
    // 2. Проверка подключения к PostgreSQL
    console.log('\n🔍 Проверка подключения к PostgreSQL...');
    await postgresDb.authenticate();
    console.log('✓ PostgreSQL подключен');
    
    // 3. Создание структуры таблиц в PostgreSQL
    console.log('\n🏗️  Создание структуры таблиц в PostgreSQL...');
    await postgresDb.sync({ force: true }); // ВНИМАНИЕ: Удаляет существующие таблицы!
    console.log('✓ Структура таблиц создана');
    
    // 4. Миграция данных в правильном порядке (учитываем внешние ключи)
    
    // Независимые таблицы (без FK)
    results.users = await migrateTable('User', 'Пользователи');
    results.products = await migrateTable('Product', 'Товары');
    results.sectors = await migrateTable('Sector', 'Секторы');
    
    // Таблицы с FK на секторы
    results.rows = await migrateTable('Row', 'Ряды');
    
    // Таблицы с FK на секторы и ряды
    results.suppliers = await migrateTable('Supplier', 'Поставщики');
    
    // Связующие таблицы
    results.productSuppliers = await migrateTable('ProductSupplier', 'Связи товар-поставщик');
    results.productVariations = await migrateTable('ProductVariation', 'Вариации товаров');
    
    // 5. Подведение итогов
    console.log('\n' + '═'.repeat(60));
    console.log('📊 ИТОГИ МИГРАЦИИ');
    console.log('═'.repeat(60));
    
    let totalRecords = 0;
    let successfulTables = 0;
    let failedTables = 0;
    
    for (const [key, result] of Object.entries(results)) {
      if (result.success) {
        console.log(`✅ ${key.padEnd(20)} ${result.count} записей`);
        totalRecords += result.count;
        successfulTables++;
      } else {
        console.log(`❌ ${key.padEnd(20)} ОШИБКА: ${result.error}`);
        failedTables++;
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('═'.repeat(60));
    console.log(`\n🎉 Миграция завершена за ${duration}с`);
    console.log(`   Успешно: ${successfulTables} таблиц, ${totalRecords} записей`);
    
    if (failedTables > 0) {
      console.log(`   ⚠️  Ошибок: ${failedTables} таблиц`);
      console.log('\n💡 Проверьте ошибки выше и повторите миграцию');
    } else {
      console.log(`\n✨ Все данные успешно перенесены!`);
      console.log(`\n📝 Следующие шаги:`);
      console.log(`   1. Проверьте данные в PostgreSQL`);
      console.log(`   2. Обновите .env для работы с PostgreSQL`);
      console.log(`   3. Запустите приложение: npm run dev`);
    }
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  } finally {
    // Закрываем подключения
    await sqliteDb.close();
    await postgresDb.close();
  }
}

// Запуск миграции
if (require.main === module) {
  migrate().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Ошибка при выполнении миграции:', error);
    process.exit(1);
  });
}

module.exports = migrate;
