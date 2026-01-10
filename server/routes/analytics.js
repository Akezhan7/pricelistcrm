const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  getStockOverview,
  getStockByCategory,
  getProductStockHistory,
  getPurchaseForecast,
  getTopMovers,
  getStockAnalytics,
  getPurchaseSuggestions,
  getLowStockProducts,
} = require('../controllers/analyticsController');

const router = express.Router();

/**
 * Все маршруты аналитики доступны только для:
 * - Администраторов (admin)
 * - Менеджеров по закупкам (purchase_manager)
 * - Бухгалтеров (accountant)
 * - Складских операторов (warehouse_operator)
 */

// Middleware для проверки доступа к аналитике
const requireAnalyticsAccess = requireRole('admin', 'purchase_manager', 'accountant', 'warehouse_operator');

// Аналитика остатков (новый endpoint для фронтенда)
router.get('/stock-analytics', auth, requireAnalyticsAccess, getStockAnalytics);

// Рекомендации для закупки
router.get('/purchase-suggestions', auth, requireAnalyticsAccess, getPurchaseSuggestions);

// Товары с низким остатком
router.get('/low-stock', auth, requireAnalyticsAccess, getLowStockProducts);

// Общая аналитика по остаткам
router.get('/stock-overview', auth, requireAnalyticsAccess, getStockOverview);

// Аналитика по категориям
router.get('/by-category', auth, requireAnalyticsAccess, getStockByCategory);

// История изменений остатков для товара
router.get('/stock-history/:productId', auth, requireAnalyticsAccess, getProductStockHistory);

// Прогноз потребности в закупке
router.get('/purchase-forecast', auth, requireAnalyticsAccess, getPurchaseForecast);

// Топ товаров по изменению остатков
router.get('/top-movers', auth, requireAnalyticsAccess, getTopMovers);

module.exports = router;
