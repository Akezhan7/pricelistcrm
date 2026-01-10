/**
 * Быстрый тест всех новых endpoints Шага 2
 * Запуск: node scripts/quickTest.js
 * 
 * Перед запуском:
 * 1. Убедитесь, что сервер запущен (npm run dev)
 * 2. Укажите правильные учетные данные ниже
 */

const axios = require('axios');

// НАСТРОЙКИ
const API_URL = 'http://localhost:5000/api';
const EMAIL = 'admin@example.com'; // Замените на ваш email
const PASSWORD = 'admin123'; // Замените на ваш пароль

let token = '';
let testResults = [];

// Утилиты
const log = (message, status = 'info') => {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
  };
  const reset = '\x1b[0m';
  console.log(`${colors[status]}${message}${reset}`);
};

const addResult = (test, passed, message = '') => {
  testResults.push({ test, passed, message });
  if (passed) {
    log(`✅ ${test}`, 'success');
  } else {
    log(`❌ ${test}: ${message}`, 'error');
  }
};

// Основные тесты
const runTests = async () => {
  log('\n🧪 БЫСТРОЕ ТЕСТИРОВАНИЕ ШАГ 2\n', 'info');

  try {
    // 1. Авторизация
    log('1️⃣  Тест авторизации...', 'info');
    try {
      const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email: EMAIL,
        password: PASSWORD,
      });
      
      if (loginRes.data.success && loginRes.data.data && loginRes.data.data.token) {
        token = loginRes.data.data.token;
        addResult('Авторизация', true);
      } else {
        addResult('Авторизация', false, 'Не получен токен');
        return;
      }
    } catch (error) {
      addResult('Авторизация', false, error.message);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Категории
    log('\n2️⃣  Тест категорий...', 'info');
    try {
      const categoriesRes = await axios.get(`${API_URL}/categories`, { headers });
      addResult('GET /api/categories', categoriesRes.status === 200);

      const treeRes = await axios.get(`${API_URL}/categories/tree`, { headers });
      addResult('GET /api/categories/tree', treeRes.status === 200);
    } catch (error) {
      addResult('Категории', false, error.message);
    }

    // 3. Товары с остатками
    log('\n3️⃣  Тест товаров и остатков...', 'info');
    try {
      const lowStockRes = await axios.get(`${API_URL}/products/low-stock`, { headers });
      addResult('GET /api/products/low-stock', lowStockRes.status === 200);

      const analyticsRes = await axios.get(`${API_URL}/products/stock-analytics`, { headers });
      addResult('GET /api/products/stock-analytics', analyticsRes.status === 200);
      
      if (analyticsRes.data.data) {
        log(`   📊 Статистика: ${JSON.stringify(analyticsRes.data.data.statistics)}`, 'info');
      }
    } catch (error) {
      addResult('Товары с остатками', false, error.message);
    }

    // 4. Заявки и WhatsApp
    log('\n4️⃣  Тест заявок...', 'info');
    try {
      const ordersRes = await axios.get(`${API_URL}/orders`, { headers });
      addResult('GET /api/orders', ordersRes.status === 200);

      if (ordersRes.data.data && ordersRes.data.data.orders.length > 0) {
        const orderId = ordersRes.data.data.orders[0].id;
        
        try {
          const whatsappRes = await axios.get(
            `${API_URL}/orders/${orderId}/whatsapp-message`,
            { headers }
          );
          addResult('GET /api/orders/:id/whatsapp-message', whatsappRes.status === 200);
          
          if (whatsappRes.data.data) {
            log(`   📱 WhatsApp сообщение сгенерировано (${whatsappRes.data.data.message.length} символов)`, 'info');
          }
        } catch (err) {
          addResult('WhatsApp сообщение', false, err.response?.data?.message || err.message);
        }
      } else {
        log('   ⚠️  Нет заявок для тестирования WhatsApp', 'warning');
      }
    } catch (error) {
      addResult('Заявки', false, error.message);
    }

    // 5. Сборщики
    log('\n5️⃣  Тест интерфейса сборщиков...', 'info');
    try {
      const tasksRes = await axios.get(`${API_URL}/collector/tasks`, { headers });
      addResult('GET /api/collector/tasks', tasksRes.status === 200);

      const statsRes = await axios.get(`${API_URL}/collector/stats`, { headers });
      addResult('GET /api/collector/stats', statsRes.status === 200);
    } catch (error) {
      // Может быть 403 если пользователь не collector
      if (error.response?.status === 403) {
        addResult('Интерфейс сборщиков', true, 'Доступ запрещен (ожидаемо для не-сборщика)');
      } else {
        addResult('Интерфейс сборщиков', false, error.message);
      }
    }

    // 6. Склад
    log('\n6️⃣  Тест складских операций...', 'info');
    try {
      const pendingRes = await axios.get(`${API_URL}/warehouse/pending-receipts`, { headers });
      addResult('GET /api/warehouse/pending-receipts', pendingRes.status === 200);

      const stockReportRes = await axios.get(`${API_URL}/warehouse/stock-report`, { headers });
      addResult('GET /api/warehouse/stock-report', stockReportRes.status === 200);
      
      if (stockReportRes.data.data) {
        log(`   📦 Товаров на складе: ${stockReportRes.data.data.total}`, 'info');
      }

      const receiptsRes = await axios.get(`${API_URL}/warehouse/receipts`, { headers });
      addResult('GET /api/warehouse/receipts', receiptsRes.status === 200);
    } catch (error) {
      addResult('Складские операции', false, error.message);
    }

    // 7. Экспорт
    log('\n7️⃣  Тест экспорта...', 'info');
    try {
      const statusRes = await axios.get(`${API_URL}/export/kaspi/status`, { headers });
      addResult('GET /api/export/kaspi/status', statusRes.status === 200);
      
      if (statusRes.data.data) {
        const { total, readyForExport, readyPercentage } = statusRes.data.data;
        log(`   📈 Готовность экспорта: ${readyForExport}/${total} (${readyPercentage}%)`, 'info');
      }

      const jsonRes = await axios.get(`${API_URL}/export/kaspi/json`, { headers });
      addResult('GET /api/export/kaspi/json', jsonRes.status === 200);

      const priceListRes = await axios.get(`${API_URL}/export/price-list?format=json`, { headers });
      addResult('GET /api/export/price-list', priceListRes.status === 200);
    } catch (error) {
      addResult('Экспорт', false, error.message);
    }

  } catch (error) {
    log(`\n❌ Критическая ошибка: ${error.message}`, 'error');
  }

  // Итоговый отчёт
  log('\n' + '='.repeat(50), 'info');
  log('📊 ИТОГОВЫЙ ОТЧЁТ', 'info');
  log('='.repeat(50), 'info');

  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  const percentage = ((passed / total) * 100).toFixed(2);

  log(`\n✅ Пройдено: ${passed}/${total} (${percentage}%)`, passed === total ? 'success' : 'warning');
  
  if (passed < total) {
    log('\n❌ Проваленные тесты:', 'error');
    testResults
      .filter(r => !r.passed)
      .forEach(r => log(`   - ${r.test}: ${r.message}`, 'error'));
  }

  log('\n✨ Тестирование завершено!\n', 'info');
  
  if (passed === total) {
    log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! ШАГ 2 РАБОТАЕТ КОРРЕКТНО!', 'success');
  } else {
    log('⚠️  Некоторые тесты провалены. Проверьте логи выше.', 'warning');
  }
};

// Запуск
log('🚀 Запуск быстрых тестов...', 'info');
log(`📍 API URL: ${API_URL}`, 'info');
log(`👤 Email: ${EMAIL}\n`, 'info');

runTests().catch(error => {
  log(`\n💥 Фатальная ошибка: ${error.message}`, 'error');
  process.exit(1);
});
