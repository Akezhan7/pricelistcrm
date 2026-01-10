const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const orderController = require('../controllers/orderController');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

router.get('/',
  auth,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['Создана', 'Отправлена поставщику', 'Частично подтверждена', 'Подтверждена', 'В сборе', 'Забрана', 'Принята на складе', 'Закрыта']),
  query('paymentStatus').optional().isIn(['Не оплачено', 'Частично оплачено', 'Оплачено']),
  query('supplierId').optional().isInt(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  handleValidationErrors,
  orderController.getOrders
);

router.post('/',
  auth,
  checkRole(['admin', 'purchase_manager']),
  body('supplierId').notEmpty().isInt(),
  body('expectedDeliveryDate').optional({ nullable: true }).isISO8601(),
  body('deliveryLocation').optional().isString().trim().isLength({ max: 200 }),
  body('notes').optional({ nullable: true }).isString().trim(),
  body('items').notEmpty().isArray({ min: 1 }),
  body('items.*.productId').notEmpty().isInt(),
  body('items.*.quantity').notEmpty().isInt({ min: 1 }),
  body('items.*.priceAtPurchase').notEmpty().isFloat({ min: 0 }),
  body('items.*.notes').optional({ nullable: true }).isString().trim(),
  handleValidationErrors,
  orderController.createOrder
);

router.patch('/:id/status',
  auth,
  param('id').isInt(),
  body('status').notEmpty().isIn(['Создана', 'Отправлена поставщику', 'Частично подтверждена', 'Подтверждена', 'В сборе', 'Забрана', 'Принята на складе', 'Закрыта']),
  body('comment').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
  handleValidationErrors,
  orderController.changeOrderStatus
);

router.patch('/:id/payment',
  auth,
  checkRole(['admin', 'purchase_manager', 'accountant']),
  param('id').isInt(),
  body('amount').notEmpty().isFloat({ min: 0.01 }).withMessage('Сумма должна быть больше нуля'),
  body('comment').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
  handleValidationErrors,
  orderController.updatePayment
);

router.get('/:id',
  auth,
  param('id').isInt(),
  handleValidationErrors,
  orderController.getOrderById
);

router.put('/:id',
  auth,
  checkRole(['admin', 'purchase_manager']),
  param('id').isInt(),
  body('expectedDeliveryDate').optional({ nullable: true }).isISO8601(),
  body('deliveryLocation').optional().isString().trim().isLength({ max: 200 }),
  body('notes').optional({ nullable: true }).isString().trim(),
  body('items').optional().isArray({ min: 1 }),
  body('items.*.productId').if(body('items').exists()).notEmpty().isInt(),
  body('items.*.quantity').if(body('items').exists()).notEmpty().isInt({ min: 1 }),
  body('items.*.priceAtPurchase').if(body('items').exists()).notEmpty().isFloat({ min: 0 }),
  handleValidationErrors,
  orderController.updateOrder
);

// DELETE /api/orders/:id - Удалить заявку (мягкое удаление)
router.delete('/:id',
  auth,
  checkRole(['admin']),
  param('id').isInt(),
  handleValidationErrors,
  orderController.deleteOrder
);

// GET /api/orders/:id/payments - Получить историю платежей по заказу
router.get('/:id/payments',
  auth,
  param('id').isInt(),
  handleValidationErrors,
  orderController.getOrderPayments
);

// PATCH /api/orders/:id/update-prices - Обновить базовые цены товаров через заявку
router.patch('/:id/update-prices',
  auth,
  checkRole(['admin', 'purchase_manager']),
  param('id').isInt(),
  body('priceUpdates').notEmpty().isArray({ min: 1 }),
  body('priceUpdates.*.productId').notEmpty().isInt(),
  body('priceUpdates.*.newCostPrice').optional().isFloat({ min: 0 }),
  body('priceUpdates.*.newSellingPrice').optional().isFloat({ min: 0 }),
  body('priceUpdates.*.reason').optional().isString().trim().isLength({ max: 200 }),
  handleValidationErrors,
  orderController.updateProductPricesFromOrder
);

// GET /api/orders/:id/whatsapp-message - Получить текст сообщения для WhatsApp
router.get('/:id/whatsapp-message',
  auth,
  param('id').isInt(),
  query('useInternalNames').optional().isBoolean(),
  handleValidationErrors,
  orderController.getWhatsAppMessage
);

// POST /api/orders/:id/send-whatsapp - Отправить заявку в WhatsApp (генерация deep link)
router.post('/:id/send-whatsapp',
  auth,
  checkRole(['admin', 'purchase_manager']),
  param('id').isInt(),
  body('useInternalNames').optional().isBoolean(),
  body('customMessage').optional().isString().trim(),
  handleValidationErrors,
  orderController.sendToWhatsApp
);

// POST /api/orders/:id/confirm - Полное подтверждение заявки
router.post('/:id/confirm',
  auth,
  checkRole(['admin', 'purchase_manager']),
  param('id').isInt(),
  body('notes').optional().isString().trim(),
  handleValidationErrors,
  orderController.confirmOrder
);

// POST /api/orders/:id/partial-confirm - Частичное подтверждение заявки
router.post('/:id/partial-confirm',
  auth,
  checkRole(['admin', 'purchase_manager']),
  param('id').isInt(),
  body('items').notEmpty().isArray({ min: 1 }),
  body('items.*.productId').notEmpty().isInt(),
  body('items.*.confirmedQuantity').notEmpty().isInt({ min: 0 }),
  body('items.*.isAvailable').optional().isBoolean(),
  body('items.*.supplierComment').optional().isString().trim(),
  body('notes').optional().isString().trim(),
  handleValidationErrors,
  orderController.partialConfirmOrder
);

// POST /api/orders/:id/assign-collector - Назначить сборщика
router.post('/:id/assign-collector',
  auth,
  checkRole(['admin', 'purchase_manager', 'warehouse_operator']),
  param('id').isInt(),
  body('collectorId').notEmpty().isInt(),
  body('notes').optional().isString().trim(),
  handleValidationErrors,
  orderController.assignCollector
);

// PUT /api/orders/:id/collect - Отметить товар как собранный
router.put('/:id/collect',
  auth,
  checkRole(['admin', 'collector', 'warehouse_operator']),
  param('id').isInt(),
  body('notes').optional().isString().trim(),
  handleValidationErrors,
  orderController.markAsCollected
);

module.exports = router;
