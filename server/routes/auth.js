const express = require('express');
const { body, query } = require('express-validator');
const { auth, requireRole, requireUserManagement } = require('../middleware/auth');
const { USER_ROLES } = require('../constants/userRoles');
const {
  register,
  login,
  getProfile,
  updateProfile,
  getUsersByRole,
  createUser,
  getManagedUsers,
  updateManagedUser,
  deleteManagedUser,
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
    .custom((value) => value === undefined)
    .withMessage('Роль назначается администратором после регистрации'),
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
    .isIn(USER_ROLES)
    .withMessage('Недопустимая роль'),
];

const updateUserValidation = [
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
    .optional({ checkFalsy: true })
    .isLength({ min: 6, max: 100 })
    .withMessage('Пароль должен содержать от 6 до 100 символов'),
  body('role')
    .optional()
    .isIn(USER_ROLES)
    .withMessage('Недопустимая роль'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Некорректный статус пользователя')
    .toBoolean(),
];

// Маршруты
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfileValidation, updateProfile);

// Получить список пользователей по роли (для назначения сборщиков и т.д.)
router.get('/users', auth, getUsersByRole);

router.get('/users/manage', auth, requireUserManagement, getManagedUsers);

// Маршрут для создания новых пользователей (только для админов)
router.post('/users', auth, requireRole('admin'), createUserValidation, createUser);
router.patch('/users/:id', auth, requireUserManagement, updateUserValidation, updateManagedUser);
router.delete('/users/:id', auth, requireUserManagement, deleteManagedUser);

module.exports = router;
