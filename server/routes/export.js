const express = require('express');
const { query } = require('express-validator');
const { auth } = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const exportController = require('../controllers/exportController');

const router = express.Router();

// Все маршруты доступны только админам и менеджерам по закупкам
router.use(auth);
router.use(checkRole(['admin', 'purchase_manager']));

// GET /api/export/kaspi/json - Экспорт в JSON для Kaspi/ProfitBot
router.get(
  '/kaspi/json',
  query('onlyInStock').optional().isIn(['true', 'false']),
  query('categoryId').optional().isInt(),
  exportController.exportKaspiJSON
);

// GET /api/export/kaspi/csv - Экспорт в CSV для Kaspi
router.get(
  '/kaspi/csv',
  query('onlyInStock').optional().isIn(['true', 'false']),
  query('categoryId').optional().isInt(),
  exportController.exportKaspiCSV
);

// GET /api/export/kaspi/status - Статус готовности данных для экспорта
router.get('/kaspi/status', exportController.getExportStatus);

// GET /api/export/price-list - Экспорт прайс-листа (универсальный)
router.get(
  '/price-list',
  query('supplierId').optional().isInt(),
  query('categoryId').optional().isInt(),
  query('format').optional().isIn(['json', 'csv']),
  exportController.exportPriceList
);

module.exports = router;
