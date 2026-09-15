const assert = require('assert');
const {
  assertCanDeleteUser,
  buildManagedUserUpdate,
} = require('../services/userManagementService');
const { requireUserManagement } = require('../middleware/auth');

const manager = { id: 1, role: 'admin', canManageUsers: true };

function runMiddleware(user) {
  let statusCode = null;
  let nextCalled = false;
  const res = {
    status(code) { statusCode = code; return this; },
    json() { return this; },
  };
  requireUserManagement({ user }, res, () => { nextCalled = true; });
  return { statusCode, nextCalled };
}

assert.deepStrictEqual(runMiddleware(manager), { statusCode: null, nextCalled: true });
assert.deepStrictEqual(
  runMiddleware({ id: 2, role: 'admin', canManageUsers: false }),
  { statusCode: 403, nextCalled: false }
);

assert.deepStrictEqual(
  buildManagedUserUpdate({
    actor: manager,
    target: { id: 2, role: 'admin', isActive: true },
    payload: {
      name: '  Новый пользователь  ',
      email: 'TEST@EXAMPLE.COM',
      role: 'designer',
      isActive: false,
      password: 'secret12',
    },
  }),
  {
    name: 'Новый пользователь',
    email: 'test@example.com',
    role: 'designer',
    isActive: false,
    password: 'secret12',
  }
);

assert.throws(
  () => buildManagedUserUpdate({
    actor: manager,
    target: manager,
    payload: { isActive: false },
  }),
  /собственную учетную запись/i
);
assert.doesNotThrow(() => buildManagedUserUpdate({
  actor: manager,
  target: { id: 2, role: 'admin', isActive: true },
  payload: { isActive: false },
}));
assert.throws(
  () => buildManagedUserUpdate({
    actor: manager,
    target: { id: 2, role: 'admin', isActive: true },
    payload: { isActive: 'false' },
  }),
  /статус пользователя/i
);
assert.throws(() => assertCanDeleteUser(manager, manager), /собственную учетную запись/i);
assert.doesNotThrow(() => assertCanDeleteUser(manager, { id: 2 }));

console.log('User management service test passed');
