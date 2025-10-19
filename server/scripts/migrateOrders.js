require('dotenv').config();
const {
  sequelize,
  User,
  Product,
  Supplier,
  ProductSupplier,
  ProductVariation,
  Sector,
  Row,
  Order,
  OrderItem,
  OrderStatusHistory,
  Payment,
  PriceHistory,
} = require('../models');

/**
 * Скрипт миграции для добавления новых таблиц в систему заявок
 * Этот скрипт безопасно добавляет новые таблицы без потери существующих данных
 */

const migrateDatabase = async () => {
  try {
    console.log('🚀 Начало миграции базы данных...\n');

    // Проверка подключения
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено\n');

    // Получаем список существующих таблиц
    const [existingTables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tableNames = existingTables.map(t => t.table_name);
    console.log('📋 Существующие таблицы:', tableNames.join(', '), '\n');

    // Список новых таблиц для создания
    const newTables = [
      { name: 'orders', model: Order, description: 'Заявки' },
      { name: 'order_items', model: OrderItem, description: 'Товары в заявках' },
      { name: 'order_status_history', model: OrderStatusHistory, description: 'История статусов' },
      { name: 'payments', model: Payment, description: 'Платежи' },
      { name: 'price_history', model: PriceHistory, description: 'История цен' },
    ];

    console.log('🔨 Создание новых таблиц...\n');

    // Создаем только те таблицы, которых еще нет
    for (const table of newTables) {
      if (!tableNames.includes(table.name)) {
        console.log(`  ⏳ Создание таблицы "${table.name}" (${table.description})...`);
        await table.model.sync({ force: false });
        console.log(`  ✅ Таблица "${table.name}" успешно создана`);
      } else {
        console.log(`  ℹ️  Таблица "${table.name}" уже существует, пропускаем`);
      }
    }

    console.log('\n🔄 Обновление enum для ролей пользователей...');
    
    // Обновляем enum для ролей (если нужно)
    try {
      await sequelize.query(`
        DO $$ 
        BEGIN
          -- Проверяем, нужно ли обновлять enum
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'accountant' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_Users_role')
          ) THEN
            -- Удаляем старый enum
            ALTER TABLE "Users" ALTER COLUMN role DROP DEFAULT;
            ALTER TABLE "Users" ALTER COLUMN role TYPE VARCHAR(50);
            DROP TYPE IF EXISTS "enum_Users_role";
            
            -- Создаем новый enum с расширенным списком ролей
            CREATE TYPE "enum_Users_role" AS ENUM ('admin', 'operator', 'accountant', 'purchase_manager', 'warehouse_operator', 'driver');
            
            -- Применяем новый enum
            ALTER TABLE "Users" ALTER COLUMN role TYPE "enum_Users_role" USING role::text::"enum_Users_role";
            ALTER TABLE "Users" ALTER COLUMN role SET DEFAULT 'operator'::"enum_Users_role";
            
            RAISE NOTICE 'Enum для ролей успешно обновлен';
          ELSE
            RAISE NOTICE 'Enum для ролей уже содержит новые значения';
          END IF;
        END $$;
      `);
      console.log('✅ Роли пользователей обновлены');
    } catch (error) {
      console.log('⚠️  Роли пользователей уже актуальны или произошла ошибка:', error.message);
    }

    console.log('\n✅ Миграция успешно завершена!');
    console.log('\n📊 Итоговая статистика:');
    
    // Получаем финальный список таблиц
    const [finalTables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`  - Всего таблиц: ${finalTables.length}`);
    console.log('  - Таблицы:', finalTables.map(t => t.table_name).join(', '));

    console.log('\n🎉 База данных готова к работе с системой заявок!');
    
  } catch (error) {
    console.error('\n❌ Ошибка миграции:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('\n👋 Соединение с базой данных закрыто');
  }
};

// Запускаем миграцию
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('\n✨ Миграция завершена успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Миграция завершилась с ошибкой:', error);
      process.exit(1);
    });
}

module.exports = migrateDatabase;
