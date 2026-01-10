const express = require('express');
const { body, param, query } = require('express-validator');
const { auth } = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const warehouseController = require('../controllers/warehouseController');

const router = express.Router();

// Все маршруты доступны для админов, warehouse_operator и purchase_manager
router.use(auth);
router.use(checkRole(['admin', 'warehouse_operator', 'purchase_manager']));

// GET /api/warehouse/pending-receipts - Заявки, ожидающие приёмки
router.get('/pending-receipts', warehouseController.getPendingReceipts);

// POST /api/warehouse/receive/:orderId - Провести приёмку заявки
router.post(
  '/receive/:orderId',
  param('orderId').isInt(),
  body('items').notEmpty().isArray({ min: 1 }),
  body('items.*.productId').notEmpty().isInt(),
  body('items.*.expectedQuantity').notEmpty().isInt({ min: 0 }),
  body('items.*.receivedQuantity').notEmpty().isInt({ min: 0 }),
  body('items.*.notes').optional().isString().trim(),
  body('notes').optional().isString().trim(),
  warehouseController.receiveOrder
);

// GET /api/warehouse/stock-report - Отчёт по остаткам
router.get('/stock-report', warehouseController.getStockReport);

// GET /api/warehouse/receipts - История приёмок
router.get('/receipts', warehouseController.getReceiptHistory);

// GET /api/warehouse/receipts/:id - Детальная информация о приёмке
router.get('/receipts/:id', warehouseController.getReceiptById);

module.exports = router;
