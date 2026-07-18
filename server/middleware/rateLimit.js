const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const API_WINDOW_MS = 15 * 60 * 1000;
const DEV_API_WINDOW_MS = 60 * 1000;
const AUTH_WINDOW_MS = 15 * 60 * 1000;

function getBearerToken(req) {
  const headerValue = req.header?.('Authorization') || req.headers?.authorization;
  if (!headerValue || typeof headerValue !== 'string') return null;

  const [scheme, token] = headerValue.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  return token;
}

function getRequestIp(req) {
  return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

function getRateLimitKey(req) {
  const token = getBearerToken(req);

  if (token && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.id) {
        return `user:${decoded.id}`;
      }
    } catch (error) {
      // Invalid tokens fall back to IP-based limiting and will be rejected by auth later.
    }
  }

  return `ip:${getRequestIp(req)}`;
}

function getAuthRateLimitKey(req) {
  const email = typeof req.body?.email === 'string'
    ? req.body.email.trim().toLowerCase()
    : 'unknown';

  return `auth:${email}:${getRequestIp(req)}`;
}

function skipStaticAndPreflight(req) {
  return req.method === 'OPTIONS' || req.url.startsWith('/uploads');
}

function buildApiLimitConfig(isProduction) {
  return {
    windowMs: isProduction ? API_WINDOW_MS : DEV_API_WINDOW_MS,
    max: isProduction ? 3000 : 10000,
    message: {
      success: false,
      message: 'Слишком много запросов. Повторите позже.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getRateLimitKey,
    skip: skipStaticAndPreflight,
  };
}

function buildAuthLimitConfig(isProduction) {
  return {
    windowMs: AUTH_WINDOW_MS,
    max: isProduction ? 5 : 50,
    message: {
      success: false,
      message: 'Слишком много попыток входа. Попробуйте через 15 минут.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getAuthRateLimitKey,
    skipSuccessfulRequests: true,
  };
}

function createApiLimiter(isProduction) {
  return rateLimit(buildApiLimitConfig(isProduction));
}

function createAuthLimiter(isProduction) {
  return rateLimit(buildAuthLimitConfig(isProduction));
}

module.exports = {
  buildApiLimitConfig,
  buildAuthLimitConfig,
  createApiLimiter,
  createAuthLimiter,
  getAuthRateLimitKey,
  getRateLimitKey,
};
