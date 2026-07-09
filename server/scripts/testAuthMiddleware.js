const assert = require('assert');
const { requireRole } = require('../middleware/auth');

function runMiddleware(middleware, req) {
  let statusCode = null;
  let responseBody = null;
  let nextCalled = false;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  middleware(req, res, () => {
    nextCalled = true;
  });

  return { statusCode, responseBody, nextCalled };
}

function testRequireRoleAllowsVarargsRoles() {
  const result = runMiddleware(
    requireRole('admin', 'designer'),
    { user: { id: 5, role: 'designer' } }
  );

  assert.strictEqual(result.nextCalled, true);
  assert.strictEqual(result.statusCode, null);
  assert.strictEqual(result.responseBody, null);
}

function testRequireRoleStillRejectsUnlistedRole() {
  const result = runMiddleware(
    requireRole('admin', 'designer'),
    { user: { id: 10, role: 'marketplace_manager' } }
  );

  assert.strictEqual(result.nextCalled, false);
  assert.strictEqual(result.statusCode, 403);
  assert.strictEqual(result.responseBody.success, false);
}

testRequireRoleAllowsVarargsRoles();
testRequireRoleStillRejectsUnlistedRole();

console.log('Auth middleware test passed');
