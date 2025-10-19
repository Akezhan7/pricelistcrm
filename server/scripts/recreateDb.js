require('dotenv').config({ path: '../../.env' });
const fs = require('fs');
const path = require('path');
const { sequelize, User } = require('../models');

async function recreateDatabase() {
  try {
    // Путь к файлу базы данных
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');
    
    // Удаляем старый файл базы данных, если он существует
    if (fs.existsSync(dbPath)) {
      console.log('Удаление старого файла базы данных...');
      fs.unlinkSync(dbPath);
      console.log('✓ Старый файл базы данных удален');
    }

    console.log('Подключение к базе данных...');
    await sequelize.authenticate();
    console.log('✓ Успешное подключение к базе данных');

    console.log('Синхронизация моделей с принудительным пересозданием таблиц...');
    await sequelize.sync({ force: true });
    console.log('✓ Модели синхронизированы, все таблицы пересозданы');

    // Создание администратора по умолчанию
    console.log('Создание администратора по умолчанию...');
    await User.create({
      name: process.env.DEFAULT_ADMIN_NAME || 'Администратор',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
      role: 'admin',
    });
    console.log('✓ Администратор создан');
    console.log(`   Email: ${process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com'}`);
    console.log(`   Password: ${process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'}`);

    console.log('\n🎉 База данных успешно пересоздана с правильной структурой!');
    console.log('✅ Теперь все индексы и поля используют правильные названия (snake_case для SQLite)');
    console.log('✅ Добавлена поддержка ProductVariation модели');
    console.log('✅ Исправлены индексы в ProductSupplier модели');
    
  } catch (error) {
    console.error('❌ Ошибка пересоздания базы данных:', error);
    process.exit(1);
  }
}

// Запуск если файл вызван напрямую
if (require.main === module) {
  recreateDatabase().then(() => {
    process.exit(0);
  });
}

module.exports = recreateDatabase;
