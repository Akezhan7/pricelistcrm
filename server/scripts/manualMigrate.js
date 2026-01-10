require('dotenv').config();
const sequelize = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigrationsManually() {
  try {
    console.log('🔄 Подключение к БД...');
    await sequelize.authenticate();
    console.log('✅ Подключено\n');

    // Создаём таблицу для отслеживания миграций
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS sequelize_meta (
        name VARCHAR(255) PRIMARY KEY
      );
    `);

    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.js'))
      .sort();

    console.log(`📂 Найдено миграций: ${migrationFiles.length}\n`);

    for (const file of migrationFiles) {
      // Проверяем выполнена ли миграция
      const [results] = await sequelize.query(
        `SELECT name FROM sequelize_meta WHERE name = ?`,
        { replacements: [file] }
      );

      if (results.length > 0) {
        console.log(`⏭️  Пропускаем: ${file} (уже выполнена)`);
        continue;
      }

      console.log(`🔄 Выполняем: ${file}`);
      
      const migration = require(path.join(migrationsDir, file));
      const queryInterface = sequelize.getQueryInterface();
      
      await migration.up(queryInterface, sequelize.constructor);
      
      // Записываем в таблицу
      await sequelize.query(
        `INSERT INTO sequelize_meta (name) VALUES (?)`,
        { replacements: [file] }
      );
      
      console.log(`✅ Завершено: ${file}\n`);
    }

    console.log('🎉 Все миграции успешно применены!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigrationsManually();
