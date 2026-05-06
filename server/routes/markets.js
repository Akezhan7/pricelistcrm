const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const marketController = require('../controllers/marketController');
const { auth } = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// Все маршруты требуют аутентификации
router.use(auth);

// Получить все рынки (доступно всем авторизованным)
router.get('/', marketController.getAllMarkets);

// Получить рынок по ID (доступно всем авторизованным)
router.get('/:id', marketController.getMarketById);

// Создать рынок (только администратор)
router.post(
  '/',
  checkRole(['admin']),
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Название рынка обязательно')
      .isLength({ min: 1, max: 100 }).withMessage('Название должно быть от 1 до 100 символов'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 255 }).withMessage('Адрес не должен превышать 255 символов'),
    body('description')
      .optional()
      .trim(),
    body('workingHours')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Часы работы не должны превышать 50 символов'),
    body('contactPhone')
      .optional()
      .trim()
      .isLength({ max: 20 }).withMessage('Телефон не должен превышать 20 символов'),
    body('notes')
      .optional()
      .trim(),
    body('sortOrder')
      .optional()
      .isInt({ min: 0 }).withMessage('Порядок сортировки должен быть целым числом'),
  ],
  marketController.createMarket
);

// Обновить рынок (только администратор)
router.put(
  '/:id',
  checkRole(['admin']),
  [
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Название рынка не может быть пустым')
      .isLength({ min: 1, max: 100 }).withMessage('Название должно быть от 1 до 100 символов'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 255 }).withMessage('Адрес не должен превышать 255 символов'),
    body('description')
      .optional()
      .trim(),
    body('workingHours')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Часы работы не должны превышать 50 символов'),
    body('contactPhone')
      .optional()
      .trim()
      .isLength({ max: 20 }).withMessage('Телефон не должен превышать 20 символов'),
    body('notes')
      .optional()
      .trim(),
    body('sortOrder')
      .optional()
      .isInt({ min: 0 }).withMessage('Порядок сортировки должен быть целым числом'),
    body('isActive')
      .optional()
      .isBoolean().withMessage('isActive должен быть булевым значением'),
  ],
  marketController.updateMarket
);

// Удалить рынок (только администратор)
// Поддерживает опциональный параметр ?permanent=true для физического удаления
router.delete('/:id', checkRole(['admin']), marketController.deleteMarket);

// Восстановить деактивированный рынок (только администратор)
router.post('/:id/restore', checkRole(['admin']), marketController.restoreMarket);

module.exports = router;
