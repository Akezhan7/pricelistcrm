/**
 * Middleware для проверки роли пользователя
 * Позволяет ограничить доступ к определенным роутам на основе роли
 */

/**
 * Проверяет, имеет ли пользователь одну из разрешенных ролей
 * @param {string[]} allowedRoles - Массив разрешенных ролей
 * @returns {Function} Express middleware функция
 * 
 * @example
 * router.post('/', auth, checkRole(['admin', 'purchase_manager']), createOrder);
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // Проверяем наличие аутентифицированного пользователя
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Требуется авторизация',
      });
    }

    // Проверяем наличие роли пользователя
    if (!req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Роль пользователя не определена',
      });
    }

    // Проверяем, входит ли роль пользователя в список разрешенных
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав для выполнения операции',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    // Пользователь имеет необходимую роль, продолжаем
    next();
  };
};

/**
 * Предопределенные проверки ролей для часто используемых случаев
 */
const roleChecks = {
  // Только администратор
  adminOnly: checkRole(['admin']),
  
  // Администратор и менеджер по закупкам (создание/редактирование заявок)
  canManageOrders: checkRole(['admin', 'purchase_manager']),
  
  // Роли, которые могут менять определенные статусы заявок
  canChangeToAtLocation: checkRole(['admin', 'purchase_manager']),
  canChangeToInTransit: checkRole(['admin', 'purchase_manager', 'driver']),
  canChangeToAtWarehouse: checkRole(['admin', 'warehouse_operator', 'driver']),
  
  // Бухгалтер и админ (работа с платежами)
  canManagePayments: checkRole(['admin', 'accountant']),
  
  // Все роли кроме водителя (просмотр конфиденциальной информации)
  canViewSensitiveData: checkRole(['admin', 'accountant', 'purchase_manager', 'warehouse_operator', 'operator']),
};

module.exports = checkRole;
module.exports.roleChecks = roleChecks;
