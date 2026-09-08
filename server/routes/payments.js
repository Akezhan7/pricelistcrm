const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const { removeUploadedFile, uploadReceiptFile } = require('../middleware/upload');

// Middleware для обработки ошибок валидации
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    removeUploadedFile(req.file);
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации данных',
      errors: errors.array()
    });
  }
  next();
};

// Валидация для создания платежа
// При multipart/form-data orderIds приходит как строка JSON (парсится в контроллере)
const validateCreatePayment = [
  body('supplierId')
    .isInt({ min: 1 })
    .withMessage('ID поставщика должен быть положительным числом'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Сумма платежа должна быть больше 0'),
  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Дата платежа должна быть в формате ISO 8601'),
  body('paymentMethod')
    .optional()
    .isIn(['Наличные', 'Перевод', 'Карта', 'Другое'])
    .withMessage('Некорректный способ оплаты'),
  body('comment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Комментарий не должен превышать 1000 символов'),
];

// Валидация для обновления платежа
const validateUpdatePayment = [
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Сумма платежа должна быть больше 0'),
  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Дата платежа должна быть в формате ISO 8601'),
  body('paymentMethod')
    .optional()
    .isIn(['Наличные', 'Перевод', 'Карта', 'Другое'])
    .withMessage('Некорректный способ оплаты'),
  body('comment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Комментарий не должен превышать 1000 символов')
];

// Валидация для параметров запросов
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID должен быть положительным числом')
];

const validateSupplierId = [
  param('supplierId')
    .isInt({ min: 1 })
    .withMessage('ID поставщика должен быть положительным числом')
];

const validateQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Номер страницы должен быть положительным числом'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Лимит должен быть от 1 до 100'),
  query('supplierId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID поставщика должен быть положительным числом'),
  query('paymentMethod')
    .optional()
    .isIn(['Наличные', 'Перевод', 'Карта', 'Другое'])
    .withMessage('Некорректный способ оплаты'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Дата начала должна быть в формате ISO 8601'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Дата окончания должна быть в формате ISO 8601')
];

/**
 * @route GET /api/payments
 * @desc Получить список всех платежей с фильтрацией
 * @access Требует аутентификации
 * @params
 *   - page: номер страницы (по умолчанию 1)
 *   - limit: количество записей на странице (по умолчанию 20, максимум 100)
 *   - supplierId: фильтр по поставщику
 *   - paymentMethod: фильтр по способу оплаты
 *   - dateFrom: дата начала периода
 *   - dateTo: дата окончания периода
 */
router.get('/', 
  auth, 
  ...validateQuery,
  handleValidationErrors,
  paymentController.getPayments
);

/**
 * @route GET /api/payments/supplier/:supplierId
 * @desc Получить все платежи и неоплаченные заказы конкретного поставщика
 * @access Требует аутентификации
 */
router.get('/supplier/:supplierId', 
  auth, 
  ...validateSupplierId,
  handleValidationErrors,
  paymentController.getPaymentsBySupplier
);

/**
 * @route GET /api/payments/:id
 * @desc Получить информацию о конкретном платеже
 * @access Требует аутентификации
 */
router.get('/:id', 
  auth, 
  ...validateId,
  handleValidationErrors,
  paymentController.getPaymentById
);

/**
 * @route POST /api/payments
 * @desc Создать новый платеж
 * @access Только admin, accountant, purchase_manager
 * @body
 *   - supplierId: ID поставщика (обязательно)
 *   - amount: сумма платежа (обязательно)
 *   - paymentDate: дата платежа (опционально, по умолчанию текущая)
 *   - paymentMethod: способ оплаты (опционально, по умолчанию "Наличные")
 *   - comment: комментарий (опционально)
 *   - orderIds: массив ID заказов для оплаты (опционально, если не указан - автоматическое распределение)
 */
router.post('/',
  auth,
  checkRole(['admin', 'accountant', 'purchase_manager']),
  // multer должен отработать до валидаторов, иначе req.body не будет распарсен из multipart
  uploadReceiptFile,
  ...validateCreatePayment,
  handleValidationErrors,
  paymentController.createPayment
);

/**
 * @route PUT /api/payments/:id
 * @desc Обновить существующий платеж
 * @access Только admin, accountant
 * @body
 *   - amount: новая сумма платежа (опционально)
 *   - paymentDate: новая дата платежа (опционально)
 *   - paymentMethod: новый способ оплаты (опционально)
 *   - comment: новый комментарий (опционально)
 */
router.put('/:id', 
  auth, 
  checkRole(['admin', 'accountant']),
  ...validateId,
  ...validateUpdatePayment,
  handleValidationErrors,
  paymentController.updatePayment
);

/**
 * @route DELETE /api/payments/:id
 * @desc Удалить платеж
 * @access Только admin
 */
router.delete('/:id', 
  auth, 
  checkRole(['admin']),
  ...validateId,
  handleValidationErrors,
  paymentController.deletePayment
);

module.exports = router;
