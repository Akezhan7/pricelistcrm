const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { User } = require('../models');
const {
  assertCanDeleteUser,
  buildManagedUserUpdate,
} = require('../services/userManagementService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибки валидации',
        errors: errors.array(),
      });
    }

    const { name, email, password } = req.body;

    // Проверка, что пользователь с таким email не существует
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким email уже существует',
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'operator',
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при регистрации',
    });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибки валидации',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Поиск пользователя
    const user = await User.findOne({ where: { email, isActive: true } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль',
      });
    }

    // Проверка пароля
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль',
      });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Успешная авторизация',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при авторизации',
    });
  }
};

const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера',
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибки валидации',
        errors: errors.array(),
      });
    }

    const { name, email, password } = req.body;
    const user = req.user;

    // Проверка уникальности email
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь с таким email уже существует',
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = password;

    await user.update(updateData);

    res.json({
      success: true,
      message: 'Профиль успешно обновлен',
      data: {
        user: await User.findByPk(user.id),
      },
    });
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при обновлении профиля',
    });
  }
};

/**
 * Получить список пользователей по роли
 * GET /api/auth/users?role=collector
 */
const getUsersByRole = async (req, res) => {
  try {
    const { role, isActive = 'true' } = req.query;

    const whereClause = {};
    
    if (role) {
      whereClause.role = role;
    }
    
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'createdAt'],
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      data: {
        users,
        total: users.length,
      },
    });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении пользователей',
    });
  }
};

/**
 * Создать нового пользователя (только для админов)
 * POST /api/auth/users
 */
const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибки валидации',
        errors: errors.array(),
      });
    }

    const { name, email, password, role } = req.body;

    // Проверка, что пользователь с таким email не существует
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким email уже существует',
      });
    }

    // Создаем пользователя
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'operator',
    });

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно создан',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при создании пользователя',
      error: error.message,
    });
  }
};

const getManagedUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        'id',
        'name',
        'email',
        'role',
        'isActive',
        'canManageUsers',
        'createdAt',
        'updatedAt',
      ],
      order: [['isActive', 'DESC'], ['name', 'ASC']],
    });

    return res.json({
      success: true,
      data: { users, total: users.length },
    });
  } catch (error) {
    console.error('Ошибка получения списка управления пользователями:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении пользователей',
    });
  }
};

const updateManagedUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибки валидации',
        errors: errors.array(),
      });
    }

    const target = await User.findByPk(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    const updateData = buildManagedUserUpdate({
      actor: req.user,
      target,
      payload: req.body,
    });

    if (updateData.email && updateData.email !== target.email) {
      const duplicate = await User.findOne({
        where: {
          email: updateData.email,
          id: { [Op.ne]: target.id },
        },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Пользователь с таким email уже существует',
        });
      }
    }

    await target.update(updateData);

    return res.json({
      success: true,
      message: 'Пользователь успешно обновлен',
      data: { user: target },
    });
  } catch (error) {
    if (/собственную учетную запись|Нет данных|Недопустимая роль|статус пользователя/i.test(error.message)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Ошибка обновления пользователя:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка сервера при обновлении пользователя',
    });
  }
};

const deleteManagedUser = async (req, res) => {
  try {
    const target = await User.findByPk(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    assertCanDeleteUser(req.user, target);
    await target.destroy();

    return res.json({
      success: true,
      message: 'Учетная запись удалена',
    });
  } catch (error) {
    if (/собственную учетную запись/i.test(error.message)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Пользователь связан с рабочими документами CRM и не может быть удален. Деактивируйте его, чтобы сохранить историю.',
      });
    }
    console.error('Ошибка удаления пользователя:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка сервера при удалении пользователя',
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  getUsersByRole,
  createUser,
  getManagedUsers,
  updateManagedUser,
  deleteManagedUser,
};
