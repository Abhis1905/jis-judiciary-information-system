'use strict';

const crypto = require('crypto');
const fs = require('fs');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function tokensMatch(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  if (provided.length === 0 || provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided, 'utf8'),
      Buffer.from(expected, 'utf8')
    );
  } catch (_) {
    return false;
  }
}

function extractToken(req) {
  if (req.body && typeof req.body._csrf === 'string' && req.body._csrf.length > 0) {
    return req.body._csrf;
  }
  if (req.query && typeof req.query._csrf === 'string' && req.query._csrf.length > 0) {
    return req.query._csrf;
  }
  const headerToken = req.headers['x-csrf-token'] || req.headers['csrf-token'];
  if (typeof headerToken === 'string' && headerToken.length > 0) {
    return headerToken;
  }
  return null;
}

function rejectCsrf(req, res) {
  if (req.file && req.file.path && fs.existsSync(req.file.path)) {
    try { fs.unlinkSync(req.file.path); } catch (_) {}
  }
  const message = 'CSRF token validation failed: missing or invalid security token.';
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.path.startsWith('/api/')) {
    return res.status(403).json({ error: 'Forbidden', message });
  }
  return res.status(403).render('errors/403', {
    title: '403 – Security Token Invalid – JIS',
    message
  });
}

/**
 * Global Synchronizer Token Pattern CSRF Middleware.
 * Ensures every session has a cryptographic CSRF token, exposes it to EJS views via res.locals.csrfToken,
 * and enforces token verification on all state-changing HTTP methods (POST, PUT, PATCH, DELETE).
 */
function csrfProtection(req, res, next) {
  if (!req.session) {
    return next();
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }

  res.locals.csrfToken = req.session.csrfToken;
  res.setHeader('X-CSRF-Token', req.session.csrfToken);

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const contentType = (req.headers['content-type'] || '').toLowerCase();
  const isMultipart = contentType.startsWith('multipart/form-data');
  const token = extractToken(req);

  // If multipart/form-data and token is inside multipart body (not yet parsed before Multer),
  // defer verification to verifyMultipartCsrf immediately after Multer runs.
  if (isMultipart && !token) {
    req._csrfDeferredMultipart = true;
    return next();
  }

  if (!tokensMatch(token, req.session.csrfToken)) {
    return rejectCsrf(req, res);
  }

  req._csrfVerified = true;
  return next();
}

/**
 * Post-Multer CSRF verification middleware for multipart/form-data uploads.
 * Ensures that if CSRF verification was deferred until Multer parsed req.body,
 * it is strictly verified before any controller executes, cleaning up any uploaded file on failure.
 */
function verifyMultipartCsrf(req, res, next) {
  if (req._csrfVerified || SAFE_METHODS.has(req.method)) {
    return next();
  }
  const expected = req.session ? req.session.csrfToken : null;
  const token = extractToken(req);
  if (!tokensMatch(token, expected)) {
    return rejectCsrf(req, res);
  }
  req._csrfVerified = true;
  return next();
}

module.exports = {
  csrfProtection,
  verifyMultipartCsrf,
  generateToken,
  tokensMatch
};
