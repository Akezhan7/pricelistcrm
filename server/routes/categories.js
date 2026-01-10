const express = require('express');
const { body } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const {
  getAllCategories,
  getCategoryById,
  getCategoriesTree,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

const router = express.Router();

// Валидаторы
const categoryValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Название категории должно содержать от 1 до 100 символов'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Описание не должно превышать 1000 символов'),
  body('parentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('parentId должен быть положительным числом'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive должно быть булевым значением'),
];

// Публичные маршруты (для всех авторизованных пользователей)
// GET /api/categories - получить все категории
router.get('/', auth, getAllCategories);

// GET /api/categories/tree - получить иерархическое дерево категорий
router.get('/tree', auth, getCategoriesTree);

// GET /api/categories/:id - получить одну категорию
router.get('/:id', auth, getCategoryById);

// Маршруты для администраторов и менеджеров по закупкам
// POST /api/categories - создать новую категорию
router.post(
  '/',
  auth,
  requireRole('admin', 'purchase_manager'),
  categoryValidation,
  createCategory
);

// PUT /api/categories/:id - обновить категорию
router.put(
  '/:id',
  auth,
  requireRole('admin', 'purchase_manager'),
  categoryValidation,
  updateCategory
);

// DELETE /api/categories/:id - удалить/деактивировать категорию
router.delete(
  '/:id',
  auth,
  requireRole('admin'),
  deleteCategory
);

module.exports = router;
