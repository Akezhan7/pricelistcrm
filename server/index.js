require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const { sequelize } = require('./models');
const { runMigrations } = require('./scripts/runMigrations');
const { createApiLimiter, createAuthLimiter } = require('./middleware/rateLimit');
const { uploadsDir } = require('./middleware/upload');

// Импорт маршрутов
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const supplierRoutes = require('./routes/suppliers');
const marketRoutes = require('./routes/markets');
const sectorRoutes = require('./routes/sectors');
const rowRoutes = require('./routes/rows');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const priceHistoryRoutes = require('./routes/priceHistory');
const categoryRoutes = require('./routes/categories');
const collectorRoutes = require('./routes/collector');
const warehouseRoutes = require('./routes/warehouse');
const exportRoutes = require('./routes/export');
const analyticsRoutes = require('./routes/analytics');
const taskRoutes = require('./routes/tasks');
const procurementListRoutes = require('./routes/procurementLists');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

if (isProduction) {
  app.set('trust proxy', 1);
}

// Настройка CORS origins
const allowedOrigins = [process.env.CLIENT_URL];
if (!isProduction) {
  allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
}

// CORS - должен быть первым!
app.use(cors({
  origin: function (origin, callback) {
    // Разрешаем запросы без origin (например, мобильные приложения или Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || !isProduction) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type', 
    'Accept',
    'Authorization',
    'Cache-Control'
  ],
  exposedHeaders: ['Authorization'],
  maxAge: 86400 // 24 часа для preflight кэша
}));

// Compression для gzip сжатия ответов (перед другими middleware)
app.use(compression());

// Middleware безопасности
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: isProduction ? undefined : false // CSP только для production
}));

// Мягкий общий лимит для рабочей CRM и строгий лимит только для auth-сценариев.
const apiLimiter = createApiLimiter(isProduction);
const authLimiter = createAuthLimiter(isProduction);

app.use('/api', apiLimiter);

// Парсинг JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Дополнительная обработка preflight запросов
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

// Статические файлы — serve uploads from project root to match multer storage
app.use('/uploads/private-tasks', (_req, res) => res.sendStatus(404));
app.use('/uploads', express.static(uploadsDir, {
  etag: true,
  lastModified: true,
  maxAge: isProduction ? '1y' : 0,
  immutable: isProduction,
}));

// Serve статические файлы клиента в production
if (isProduction) {
  const clientBuildPath = path.join(__dirname, '../client/build');
  app.use(express.static(clientBuildPath));
}

// Health check endpoint (для мониторинга и хостингов)
app.get('/health', async (req, res) => {
  try {
    // Проверка подключения к БД
    await sequelize.authenticate();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      database: 'connected',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      database: 'disconnected',
      error: error.message
    });
  }
});

// Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/collector', collectorRoutes);
app.use('/api/sectors', sectorRoutes);
app.use('/api/rows', rowRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/price-history', priceHistoryRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/procurement-lists', procurementListRoutes);

// Базовый маршрут
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'CRM API для управления товарами и поставщиками',
    version: '1.0.0',
  });
});

// Обработка ошибок 404 для API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API маршрут не найден',
  });
});

// Отдаём index.html для всех остальных маршрутов (поддержка React Router)
// В production из папки build, в development проксируем на клиент
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
} else {
  // В development режиме отправляем инструкцию для настройки клиента
  app.get('*', (req, res) => {
    res.json({
      success: false,
      message: 'В режиме разработки клиент должен быть запущен отдельно на порту 3000',
      hint: 'Запустите клиент командой: cd client && npm start'
    });
  });
}

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);

  // Ошибки валидации Sequelize
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации данных',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // Ошибки уникальности Sequelize
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Запись с такими данными уже существует',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // Ошибки базы данных Sequelize
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      success: false,
      message: 'Ошибка базы данных',
    });
  }

  // Общие ошибки
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Внутренняя ошибка сервера',
  });
});

// Запуск сервера
async function startServer() {
  try {
    // Проверка обязательных переменных окружения
    const requiredEnvVars = ['JWT_SECRET', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      console.error('❌ Отсутствуют обязательные переменные окружения:', missingEnvVars.join(', '));
      console.error('💡 Создайте файл .env на основе .env.example');
      process.exit(1);
    }

    // Проверка JWT_SECRET в production
    if (isProduction && process.env.JWT_SECRET.includes('change-in-production')) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: JWT_SECRET не изменён для production!');
      console.error('💡 Сгенерируйте сильный ключ: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
      process.exit(1);
    }

    // Проверка подключения к базе данных
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено');
    
    // ВАЖНО: Автоматические миграции при старте (в production)
    if (process.env.AUTO_MIGRATE === 'true' || isProduction) {
      console.log('\n📊 Запуск автоматических миграций...');
      await runMigrations();
    } else {
      console.log('ℹ️  Автоматические миграции отключены (установите AUTO_MIGRATE=true)');
    }
    
    // ВАЖНО: НЕ используем sync в production! Только миграции!
    if (!isProduction) {
      // В разработке можем использовать sync для удобства
      await sequelize.sync({ force: false, alter: false });
      console.log('✅ Модели синхронизированы (dev mode)');
    }
    
    // Запуск сервера
    const server = app.listen(PORT, () => {
      console.log('\n🚀 ========================================');
      console.log(`   CRM Сервер запущен успешно!`);
      console.log('   ========================================');
      console.log(`📱 Режим:        ${NODE_ENV.toUpperCase()}`);
      console.log(`🌐 API:          http://localhost:${PORT}/api`);
      console.log(`� Health:       http://localhost:${PORT}/health`);
      console.log(`�🖼️  Uploads:      http://localhost:${PORT}/uploads`);
      console.log(`🌍 Клиент:       ${process.env.CLIENT_URL || 'не задан'}`);
      console.log(`� Админ:        ${process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com'}`);
      console.log('========================================\n');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n⚠️  Получен сигнал ${signal}, начинается корректное завершение...`);
      
      server.close(async () => {
        console.log('✓ HTTP сервер остановлен');
        
        try {
          await sequelize.close();
          console.log('✓ Соединения с БД закрыты');
          process.exit(0);
        } catch (error) {
          console.error('❌ Ошибка при закрытии БД:', error);
          process.exit(1);
        }
      });

      // Принудительное завершение через 10 секунд
      setTimeout(() => {
        console.error('⚠️  Принудительное завершение по таймауту');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

startServer();
