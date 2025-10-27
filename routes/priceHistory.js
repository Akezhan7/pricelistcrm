const express = require('express');
const { auth } = require('../middleware/auth');
const {
  getPriceAnalytics,
  getOrderPriceChanges,
} = require('../controllers/priceHistoryController');

const router = express.Router();

// Все маршруты требуют аутентификации

// Получить аналитику по изменениям цен
router.get('/analytics', auth, getPriceAnalytics);

// Получить изменения цен для конкретного заказа
router.get('/orders/:orderId', auth, getOrderPriceChanges);

module.exports = router;
