const express = require('express');
const { auth } = require('../middleware/auth');
const {
  getStockOverview,
  getStockByCategory,
  getProductStockHistory,
  getPurchaseForecast,
  getTopMovers,
} = require('../controllers/analyticsController');

const router = express.Router();

/**
 * Все маршруты аналитики требуют авторизации
 */

// Общая аналитика по остаткам
router.get('/stock-overview', auth, getStockOverview);

// Аналитика по категориям
router.get('/by-category', auth, getStockByCategory);

// История изменений остатков для товара
router.get('/stock-history/:productId', auth, getProductStockHistory);

// Прогноз потребности в закупке
router.get('/purchase-forecast', auth, getPurchaseForecast);

// Топ товаров по изменению остатков
router.get('/top-movers', auth, getTopMovers);

module.exports = router;
