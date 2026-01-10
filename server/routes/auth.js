const express = require('express');
const { body, query } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const {
  register,
  login,
  getProfile,
  updateProfile,
  getUsersByRole,
  createUser,
} = require('../controllers/authController');

const router = express.Router();

// Валидаторы
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Имя должно содержать от 2 до 100 символов'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Введите корректный email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Пароль должен содержать минимум 6 символов'),
  body('role')
    .optional()
    .isIn(['admin', 'operator', 'accountant', 'purchase_manager', 'warehouse_operator', 'collector', 'driver'])
    .withMessage('Недопустимая роль'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Введите корректный email'),
  body('password')
    .notEmpty()
    .withMessage('Пароль обязателен'),
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Имя должно содержать от 2 до 100 символов'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Введите корректный email'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Пароль должен содержать минимум 6 символов'),
];

const createUserValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Имя обязательно')
    .isLength({ min: 2, max: 100 })
    .withMessage('Имя должно содержать от 2 до 100 символов'),
  body('email')
    .notEmpty()
    .withMessage('Email обязателен')
    .isEmail()
    .normalizeEmail()
    .withMessage('Введите корректный email'),
  body('password')
    .notEmpty()
    .withMessage('Пароль обязателен')
    .isLength({ min: 6 })
    .withMessage('Пароль должен содержать минимум 6 символов'),
  body('role')
    .notEmpty()
    .withMessage('Роль обязательна')
    .isIn(['admin', 'operator', 'accountant', 'purchase_manager', 'warehouse_operator', 'collector', 'driver'])
    .withMessage('Недопустимая роль'),
];

// Маршруты
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfileValidation, updateProfile);

// Получить список пользователей по роли (для назначения сборщиков и т.д.)
router.get('/users', auth, getUsersByRole);

// Маршрут для создания новых пользователей (только для админов)
router.post('/users', auth, requireRole('admin'), createUserValidation, createUser);

module.exports = router;
