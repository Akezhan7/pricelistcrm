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
  
  // Администратор и менеджер по закупкам (создание/редактирование заявок и товаров)
  canManageOrders: checkRole(['admin', 'purchase_manager']),
  
  // Роли, которые могут менять определенные статусы заявок
  // Новые статусы: 'Создана', 'Отправлена поставщику', 'Подтверждена', 'В сборе', 'Забрана', 'Принята на складе', 'Закрыта'
  canSendToSupplier: checkRole(['admin', 'purchase_manager']),
  canConfirmOrder: checkRole(['admin', 'purchase_manager']),
  canAssignCollector: checkRole(['admin', 'purchase_manager', 'warehouse_operator']),
  canMarkAsCollected: checkRole(['admin', 'collector', 'warehouse_operator']),
  canReceiveAtWarehouse: checkRole(['admin', 'warehouse_operator']),
  
  // Бухгалтер и админ (работа с платежами)
  canManagePayments: checkRole(['admin', 'accountant']),
  
  // Доступ к аналитике
  canViewAnalytics: checkRole(['admin', 'purchase_manager', 'accountant', 'warehouse_operator']),
  
  // Все роли кроме водителя (просмотр конфиденциальной информации)
  canViewSensitiveData: checkRole(['admin', 'accountant', 'purchase_manager', 'warehouse_operator', 'operator']),
};

module.exports = checkRole;
module.exports.roleChecks = roleChecks;
