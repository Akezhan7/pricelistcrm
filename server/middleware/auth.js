const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Нет токена доступа' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Пользователь не найден или деактивирован' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Недействительный токен' 
    });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Не авторизован' 
      });
    }

    const userRoles = roles.length === 1 && Array.isArray(roles[0]) ? roles[0] : roles;
    if (!userRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Недостаточно прав для выполнения этого действия' 
      });
    }

    next();
  };
};

module.exports = { auth, requireRole };
