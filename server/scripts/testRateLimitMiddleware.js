const assert = require('assert');
const jwt = require('jsonwebtoken');
const {
  buildApiLimitConfig,
  getRateLimitKey,
} = require('../middleware/rateLimit');

function testBuildApiLimitConfigUsesSoftAuthenticatedProductionLimit() {
  const config = buildApiLimitConfig(true);

  assert.strictEqual(config.windowMs, 15 * 60 * 1000);
  assert.strictEqual(config.max, 3000);
}

function testGetRateLimitKeyUsesVerifiedJwtUserId() {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'rate-limit-test-secret';

  const token = jwt.sign({ id: 42 }, process.env.JWT_SECRET);
  const req = {
    ip: '127.0.0.1',
    header(name) {
      return name === 'Authorization' ? `Bearer ${token}` : undefined;
    },
  };

  assert.strictEqual(getRateLimitKey(req), 'user:42');

  if (previousSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = previousSecret;
  }
}

function testGetRateLimitKeyFallsBackToIp() {
  const req = {
    ip: '10.0.0.5',
    header() {
      return undefined;
    },
  };

  assert.strictEqual(getRateLimitKey(req), 'ip:10.0.0.5');
}

testBuildApiLimitConfigUsesSoftAuthenticatedProductionLimit();
testGetRateLimitKeyUsesVerifiedJwtUserId();
testGetRateLimitKeyFallsBackToIp();

console.log('Rate limit middleware test passed');
