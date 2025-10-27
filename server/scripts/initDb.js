const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, User, Sector, Row } = require('../models');
const { runMigrations } = require('./runMigrations');

// Начальные данные для секторов
const DEFAULT_SECTORS = [
  {
    name: 'Сектор A',
    code: 'A',
    productType: 'Игрушки',
    color: '#ec4899',
    icon: '🧸',
    description: 'Детские игрушки и развлечения',
    position: { x: 10, y: 10, width: 20, height: 25 },
    sortOrder: 1
  },
  {
    name: 'Сектор B',
    code: 'B',
    productType: 'Стройматериалы',
    color: '#f97316',
    icon: '🔨',
    description: 'Строительные материалы и инструменты',
    position: { x: 35, y: 10, width: 20, height: 25 },
    sortOrder: 2
  },
  {
    name: 'Сектор C',
    code: 'C',
    productType: 'Посуда',
    color: '#3b82f6',
    icon: '🍽️',
    description: 'Кухонная посуда и принадлежности',
    position: { x: 10, y: 40, width: 25, height: 25 },
    sortOrder: 3
  },
  {
    name: 'Сектор D',
    code: 'D',
    productType: 'Текстиль',
    color: '#8b5cf6',
    icon: '🧵',
    description: 'Ткани, одежда, постельное белье',
    position: { x: 40, y: 40, width: 25, height: 20 },
    sortOrder: 4
  }
];

async function initializeDatabase() {
  try {
    console.log('🔌 Подключение к базе данных...');
    await sequelize.authenticate();
    console.log('✅ Успешное подключение к базе данных');

    // ВАЖНО: Используем миграции вместо sync({ force: true })
    console.log('\n📊 Запуск миграций для создания/обновления структуры БД...');
    await runMigrations();
    console.log('✅ Структура БД актуальна');

    // Создание администратора по умолчанию (если не существует)
    console.log('\n👤 Проверка наличия администратора...');
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
    const adminExists = await User.findOne({ where: { email: adminEmail } });
    
    if (!adminExists) {
      console.log('Создание администратора по умолчанию...');
      await User.create({
        name: process.env.DEFAULT_ADMIN_NAME || 'Администратор',
        email: adminEmail,
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
        role: 'admin',
      });
      console.log('✅ Администратор создан');
      console.log(`   📧 Email: ${adminEmail}`);
      console.log(`   🔑 Password: ${process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'}`);
    } else {
      console.log('✅ Администратор уже существует');
    }

    // Создание начальных секторов (если нужно)
    console.log('\n🗺️  Проверка наличия секторов...');
    const existingSectors = await Sector.count();
    
    if (existingSectors === 0) {
      console.log('Создание начальных секторов...');
      
      for (const sectorData of DEFAULT_SECTORS) {
        await Sector.create(sectorData);
        console.log(`  ✓ Создан сектор: ${sectorData.name}`);
      }
      
      // Создание примеров рядов
      console.log('Создание примеров рядов...');
      const sectors = await Sector.findAll();
      
      for (const sector of sectors) {
        // Создаём 3-5 рядов для каждого сектора
        const rowCount = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 1; i <= rowCount; i++) {
          await Row.create({
            sectorId: sector.id,
            name: `${sector.code}${i}`,
            code: i.toString(),
            totalSpaces: 10 + Math.floor(Math.random() * 20), // 10-30 мест
            occupiedSpaces: Math.floor(Math.random() * 15), // 0-15 занято
            sortOrder: i
          });
        }
        
        // Обновляем количество рядов в секторе
        await sector.update({ rowsCount: rowCount });
        console.log(`  ✓ Создано ${rowCount} рядов для сектора ${sector.name}`);
      }
    } else {
      console.log('✅ Сектора уже существуют');
    }

    console.log('\n🎉 База данных успешно инициализирована!');
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error);
    process.exit(1);
  }
}

// Запуск если файл вызван напрямую
if (require.main === module) {
  initializeDatabase().then(() => {
    process.exit(0);
  });
}

module.exports = initializeDatabase;
