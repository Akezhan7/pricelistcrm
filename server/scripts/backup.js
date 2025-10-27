require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

const execPromise = util.promisify(exec);

// Директория для бэкапов
const backupDir = path.join(__dirname, '../backups');

// Создать папку для бэкапов, если не существует
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log('✅ Создана папка для бэкапов:', backupDir);
}

/**
 * Создание резервной копии PostgreSQL базы данных
 */
async function createBackup() {
  try {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .substring(0, 19);
    
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
    
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      database: process.env.DB_NAME || 'crm3_db',
      password: process.env.DB_PASSWORD || 'postgres',
    };

    console.log('🔄 Создание резервной копии базы данных...');
    console.log(`📊 База: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
    console.log(`💾 Файл: ${backupFile}`);

    // Команда для создания бэкапа (pg_dump)
    // -F c = custom format (сжатый и быстрее восстанавливается)
    // -b = include large objects
    // -v = verbose
    const command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -F c -b -v -f "${backupFile}"`;
    
    // Устанавливаем пароль через переменную окружения
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    
    await execPromise(command, { env });
    
    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('✅ Резервная копия создана успешно!');
    console.log(`📦 Размер: ${fileSizeMB} MB`);
    console.log(`📁 Путь: ${backupFile}`);
    
    // Очистка старых бэкапов (старше N дней)
    await cleanOldBackups();
    
    return backupFile;
  } catch (error) {
    console.error('❌ Ошибка создания бэкапа:', error.message);
    
    // Если pg_dump не установлен
    if (error.message.includes('pg_dump')) {
      console.error('\n💡 Установите PostgreSQL client tools:');
      console.error('   Windows: https://www.postgresql.org/download/windows/');
      console.error('   Linux: sudo apt-get install postgresql-client');
      console.error('   macOS: brew install postgresql');
    }
    
    throw error;
  }
}

/**
 * Восстановление базы данных из бэкапа
 * @param {string} backupFile - Путь к файлу бэкапа
 */
async function restoreBackup(backupFile) {
  try {
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Файл бэкапа не найден: ${backupFile}`);
    }

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      database: process.env.DB_NAME || 'crm3_db',
      password: process.env.DB_PASSWORD || 'postgres',
    };

    console.log('🔄 Восстановление базы данных из бэкапа...');
    console.log(`📊 База: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
    console.log(`💾 Файл: ${backupFile}`);
    console.log('⚠️  ВНИМАНИЕ: Все текущие данные будут заменены!');

    // Команда для восстановления (pg_restore)
    // -c = clean (drop objects before recreating)
    // -d = database name
    const command = `pg_restore -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -c -v "${backupFile}"`;
    
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    
    await execPromise(command, { env });
    
    console.log('✅ База данных восстановлена успешно!');
  } catch (error) {
    console.error('❌ Ошибка восстановления бэкапа:', error.message);
    throw error;
  }
}

/**
 * Очистка старых бэкапов (старше указанного количества дней)
 * @param {number} daysToKeep - Количество дней для хранения бэкапов (по умолчанию 7)
 */
async function cleanOldBackups(daysToKeep = 7) {
  try {
    const files = fs.readdirSync(backupDir);
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    for (const file of files) {
      if (!file.startsWith('backup-')) continue;
      
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtimeMs < cutoffTime) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`🗑️  Удален старый бэкап: ${file}`);
      }
    }
    
    if (deletedCount > 0) {
      console.log(`✅ Очищено старых бэкапов: ${deletedCount}`);
    }
  } catch (error) {
    console.error('⚠️  Ошибка очистки старых бэкапов:', error.message);
    // Не прерываем выполнение, если очистка не удалась
  }
}

/**
 * Список всех доступных бэкапов
 */
function listBackups() {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          created: stats.mtime,
        };
      })
      .sort((a, b) => b.created - a.created); // От новых к старым

    console.log('\n📋 Доступные бэкапы:\n');
    
    if (files.length === 0) {
      console.log('ℹ️  Бэкапов не найдено');
    } else {
      files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name}`);
        console.log(`   📦 Размер: ${file.sizeMB} MB`);
        console.log(`   📅 Создан: ${file.created.toLocaleString('ru-RU')}`);
        console.log(`   📁 Путь: ${file.path}\n`);
      });
    }
    
    return files;
  } catch (error) {
    console.error('❌ Ошибка получения списка бэкапов:', error.message);
    return [];
  }
}

// CLI интерфейс
if (require.main === module) {
  const command = process.argv[2];
  const arg = process.argv[3];

  (async () => {
    try {
      switch (command) {
        case 'create':
          await createBackup();
          break;
        
        case 'restore':
          if (!arg) {
            console.error('❌ Укажите путь к файлу бэкапа');
            console.error('💡 Использование: npm run backup:restore <путь_к_файлу>');
            process.exit(1);
          }
          await restoreBackup(arg);
          break;
        
        case 'list':
          listBackups();
          break;
        
        case 'clean':
          const days = parseInt(arg) || 7;
          await cleanOldBackups(days);
          console.log(`✅ Очищены бэкапы старше ${days} дней`);
          break;
        
        default:
          console.log('📚 Использование:');
          console.log('  npm run backup:create      - Создать новый бэкап');
          console.log('  npm run backup:restore <file> - Восстановить из бэкапа');
          console.log('  npm run backup:list        - Показать все бэкапы');
          console.log('  npm run backup:clean [days] - Очистить старые бэкапы (по умолчанию 7 дней)');
          break;
      }
      
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  })();
}

module.exports = {
  createBackup,
  restoreBackup,
  cleanOldBackups,
  listBackups,
};
