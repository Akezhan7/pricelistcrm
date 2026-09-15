const { USER_ROLES } = require('../constants/userRoles');

function assertUserManager(actor) {
  if (actor?.role !== 'admin' || actor?.canManageUsers !== true) {
    const error = new Error('Недостаточно прав для управления пользователями');
    error.statusCode = 403;
    throw error;
  }
}

function buildManagedUserUpdate({ actor, target, payload = {} }) {
  assertUserManager(actor);
  if (!target) throw new Error('Пользователь не найден');

  const update = {};
  if (payload.name !== undefined) update.name = String(payload.name).trim();
  if (payload.email !== undefined) update.email = String(payload.email).trim().toLowerCase();
  if (payload.role !== undefined) update.role = String(payload.role);
  if (payload.isActive !== undefined) {
    if (typeof payload.isActive !== 'boolean') throw new Error('Некорректный статус пользователя');
    update.isActive = payload.isActive;
  }
  if (payload.password) update.password = String(payload.password);

  if (update.role !== undefined && !USER_ROLES.includes(update.role)) {
    throw new Error('Недопустимая роль');
  }

  if (Number(actor.id) === Number(target.id)) {
    if (update.isActive === false || (update.role && update.role !== 'admin')) {
      throw new Error('Нельзя деактивировать собственную учетную запись или убрать у нее роль администратора');
    }
  }

  if (Object.keys(update).length === 0) {
    throw new Error('Нет данных для обновления');
  }

  return update;
}

function assertCanDeleteUser(actor, target) {
  assertUserManager(actor);
  if (!target) throw new Error('Пользователь не найден');
  if (Number(actor.id) === Number(target.id)) {
    throw new Error('Нельзя удалить собственную учетную запись');
  }
}

module.exports = {
  assertCanDeleteUser,
  assertUserManager,
  buildManagedUserUpdate,
};
