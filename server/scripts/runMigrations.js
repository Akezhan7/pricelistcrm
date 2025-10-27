require('dotenv').config();
const { Umzug, SequelizeStorage } = require('umzug');
const sequelize = require('../config/database');
const path = require('path');

/**
 * Система миграций с использованием Umzug
 * Обеспечивает безопасное обновление структуры БД без потери данных
 */

const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, '../migrations/*.js'),
    resolve: ({ name, path: migrationPath, context }) => {
      // Используем стандартный формат миграций Sequelize
      const migration = require(migrationPath);
      return {
        name,
        up: async () => migration.up(context, sequelize.constructor),
        down: async () => migration.down(context, sequelize.constructor),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ 
    sequelize,
    tableName: 'sequelize_meta', // Таблица для отслеживания миграций
  }),
  logger: console,
});

/**
 * Запуск всех pending миграций
 */
async function runMigrations() {
  try {
    console.log('🔄 Проверка подключения к базе данных...');
    await sequelize.authenticate();
    console.log('✅ Подключение установлено');

    console.log('\n🔄 Запуск миграций...');
    const migrations = await umzug.up();

    if (migrations.length === 0) {
      console.log('ℹ️  Новых миграций нет. База данных актуальна.');
    } else {
      console.log(`\n✅ Успешно выполнено миграций: ${migrations.length}`);
      migrations.forEach((migration) => {
        console.log(`  ✓ ${migration.name}`);
      });
    }

    console.log('\n🎉 Миграции завершены успешно!');
  } catch (error) {
    console.error('\n❌ Ошибка выполнения миграций:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Откат последней миграции
 */
async function rollbackMigration() {
  try {
    console.log('🔄 Откат последней миграции...');
    const migration = await umzug.down();
    
    if (migration) {
      console.log(`✅ Откат выполнен: ${migration.name}`);
    } else {
      console.log('ℹ️  Нет миграций для отката');
    }
  } catch (error) {
    console.error('❌ Ошибка отката миграции:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Откат всех миграций
 */
async function rollbackAll() {
  try {
    console.log('🔄 Откат всех миграций...');
    await umzug.down({ to: 0 });
    console.log('✅ Все миграции откачены');
  } catch (error) {
    console.error('❌ Ошибка отката миграций:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Показать статус миграций
 */
async function showStatus() {
  try {
    const executed = await umzug.executed();
    const pending = await umzug.pending();

    console.log('\n📊 Статус миграций:\n');
    
    if (executed.length > 0) {
      console.log('✅ Выполненные миграции:');
      executed.forEach((m) => console.log(`  ✓ ${m.name}`));
    } else {
      console.log('ℹ️  Выполненных миграций нет');
    }

    console.log('');

    if (pending.length > 0) {
      console.log('⏳ Ожидающие миграции:');
      pending.forEach((m) => console.log(`  ○ ${m.name}`));
    } else {
      console.log('✅ Все миграции выполнены');
    }

    console.log('');
  } catch (error) {
    console.error('❌ Ошибка получения статуса:', error);
    process.exit(1);
  }
}

// CLI интерфейс
if (require.main === module) {
  const command = process.argv[2];

  (async () => {
    switch (command) {
      case 'up':
        await runMigrations();
        break;
      case 'down':
        await rollbackMigration();
        break;
      case 'down:all':
        await rollbackAll();
        break;
      case 'status':
        await showStatus();
        break;
      default:
        // По умолчанию запускаем миграции
        await runMigrations();
        break;
    }
    
    await sequelize.close();
    process.exit(0);
  })();
}

module.exports = {
  runMigrations,
  rollbackMigration,
  rollbackAll,
  showStatus,
  umzug,
};
