const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User } = require('../models');

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

    const { name, email, password, role } = req.body;

    // Проверка, что пользователь с таким email не существует
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким email уже существует',
      });
    }

    // Только админ может создавать других админов
    if (role === 'admin' && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Только администратор может создавать других администраторов',
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'operator',
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

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
};
