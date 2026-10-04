'use strict';

/**
 * Rate Limiting Middleware (Sliding/Fixed Window per IP + Scope).
 * Protects authentication endpoints and API routes against brute-force and automated abuse.
 */

const stores = new Map();

function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const defaultMax = options.max || 30;
  const keyPrefix = options.keyPrefix || 'global';
  const message = options.message || 'Too many requests from this IP, please try again later.';

  const bucket = new Map();
  stores.set(keyPrefix, bucket);

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of bucket.entries()) {
      if (now >= entry.resetTime) {
        bucket.delete(key);
      }
    }
  }, Math.min(windowMs, 60 * 1000));

  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const clientIp = req.ip || (req.connection && req.connection.remoteAddress) || '127.0.0.1';
    const testKeyHeader = process.env.NODE_ENV === 'test' ? req.headers['x-rate-limit-key'] : null;
    const key = `${keyPrefix}:${testKeyHeader || clientIp}`;

    const customTestMax = (process.env.NODE_ENV === 'test' && req.headers['x-test-rate-limit-max'])
      ? parseInt(req.headers['x-test-rate-limit-max'], 10)
      : null;
    const effectiveMax = (customTestMax && customTestMax > 0) ? customTestMax : defaultMax;

    let entry = bucket.get(key);
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs
      };
      bucket.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, effectiveMax - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    res.setHeader('RateLimit-Limit', String(effectiveMax));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));
    res.setHeader('X-RateLimit-Limit', String(effectiveMax));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSeconds));

    if (entry.count > effectiveMax) {
      res.setHeader('Retry-After', String(resetSeconds));
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.path.startsWith('/api/')) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message,
          retryAfterSeconds: resetSeconds
        });
      }
      return res.status(429).render('errors/403', {
        title: '429 – Too Many Requests – JIS',
        message
      });
    }

    return next();
  };
}

function resetAllLimiters() {
  for (const bucket of stores.values()) {
    bucket.clear();
  }
}

const loginRateLimiter = createRateLimiter({
  keyPrefix: 'auth_login',
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many login attempts from this IP address. Please wait 15 minutes before trying again.'
});

const apiRateLimiter = createRateLimiter({
  keyPrefix: 'api_general',
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'API rate limit exceeded. Please slow down your requests.'
});

module.exports = {
  createRateLimiter,
  loginRateLimiter,
  apiRateLimiter,
  resetAllLimiters
};
