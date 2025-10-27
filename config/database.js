const { Sequelize } = require('sequelize');

// Конфигурация подключения к PostgreSQL
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'crm3_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  
  // Пул соединений для оптимальной производительности
  pool: {
    max: 5,              // Максимальное количество соединений в пуле
    min: 0,              // Минимальное количество соединений в пуле
    acquire: 30000,      // Максимальное время (в мс) ожидания соединения
    idle: 10000,         // Максимальное время (в мс) простоя соединения перед освобождением
  },
  
  // Логирование SQL запросов (отключено по умолчанию)
  // Включите через переменную окружения DB_LOGGING=true
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  
  // Настройки по умолчанию для всех моделей
  define: {
    timestamps: true,    // Автоматически добавлять createdAt и updatedAt
    underscored: true,   // Использовать snake_case для имен столбцов
    freezeTableName: false, // Не замораживать имена таблиц (множественное число)
  },
  
  // Дополнительные настройки для PostgreSQL
  dialectOptions: {
    // Таймауты
    statement_timeout: 30000, // 30 секунд на выполнение запроса
    idle_in_transaction_session_timeout: 60000, // 60 секунд для транзакции
  },
});

module.exports = sequelize;
