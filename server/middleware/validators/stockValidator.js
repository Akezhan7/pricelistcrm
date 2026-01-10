const { body, validationResult } = require('express-validator');

/**
 * Валидация обновления остатков товара
 */
const validateStockUpdate = [
  body('currentStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Текущий остаток должен быть неотрицательным целым числом'),
  body('minStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Минимальный остаток должен быть неотрицательным целым числом'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибки валидации',
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Валидация приёмки товара на складе
 */
const validateWarehouseReceipt = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Необходимо указать хотя бы один товар для приёмки'),
  body('items.*.productId')
    .isInt({ min: 1 })
    .withMessage('ID товара должен быть положительным числом'),
  body('items.*.receivedQuantity')
    .isInt({ min: 0 })
    .withMessage('Принятое количество должно быть неотрицательным целым числом'),
  body('items.*.expectedQuantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Ожидаемое количество должно быть неотрицательным целым числом'),
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Заметки не должны превышать 1000 символов'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибки валидации',
        errors: errors.array(),
      });
    }

    // Дополнительная проверка: receivedQuantity не должно быть отрицательным
    const items = req.body.items || [];
    for (const item of items) {
      if (item.receivedQuantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Принятое количество не может быть отрицательным',
        });
      }
    }

    next();
  },
];

/**
 * Валидация ручной коррекции остатков
 */
const validateStockCorrection = [
  body('productId')
    .isInt({ min: 1 })
    .withMessage('ID товара должен быть положительным числом'),
  body('newStock')
    .isInt({ min: 0 })
    .withMessage('Новый остаток должен быть неотрицательным целым числом'),
  body('reason')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Необходимо указать причину коррекции')
    .isLength({ min: 5, max: 500 })
    .withMessage('Причина должна содержать от 5 до 500 символов'),
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Заметки не должны превышать 1000 символов'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибки валидации',
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Middleware для проверки, что остаток не станет отрицательным
 */
const preventNegativeStock = async (req, res, next) => {
  try {
    const { Product } = require('../models');
    const { productId, quantity, changeAmount } = req.body;

    if (!productId) {
      return next(); // Пропускаем, если нет productId
    }

    const product = await Product.findByPk(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Товар не найден',
      });
    }

    // Проверяем, не станет ли остаток отрицательным
    const potentialNewStock = product.currentStock + (changeAmount || -quantity || 0);
    
    if (potentialNewStock < 0) {
      return res.status(400).json({
        success: false,
        message: `Недостаточно товара на складе. Доступно: ${product.currentStock} шт, требуется: ${Math.abs(changeAmount || quantity)}`,
        availableStock: product.currentStock,
      });
    }

    next();
  } catch (error) {
    console.error('Ошибка проверки остатков:', error);
    next(error);
  }
};

/**
 * Middleware для логирования изменений остатков
 */
const logStockChange = (changeType) => {
  return (req, res, next) => {
    // Добавляем информацию для хука StockHistory
    req.stockChangeContext = {
      changeType,
      userId: req.user?.id,
      reason: req.body.reason || `Операция: ${changeType}`,
      notes: req.body.notes || '',
    };
    next();
  };
};

module.exports = {
  validateStockUpdate,
  validateWarehouseReceipt,
  validateStockCorrection,
  preventNegativeStock,
  logStockChange,
};
