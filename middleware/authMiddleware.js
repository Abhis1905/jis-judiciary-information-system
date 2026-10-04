'use strict';

/**
 * authMiddleware
 * Checks that a valid session exists before allowing access.
 * Redirects unauthenticated requests to /login.
 * Must be placed before rbacMiddleware in any route chain.
 */
const authMiddleware = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.flash = { error: 'Please log in to access this page.' };
  res.redirect('/login');
};

module.exports = authMiddleware;
