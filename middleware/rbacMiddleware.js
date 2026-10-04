'use strict';

/**
 * rbacMiddleware
 * Role-Based Access Control. Must be used AFTER authMiddleware.
 *
 * Usage:
 *   rbacMiddleware('registrar')           — single role
 *   rbacMiddleware(['judge','registrar'])  — multiple allowed roles
 *
 * The user's role is read from session (set from DB at login).
 * No role is ever accepted from client input.
 */
const rbacMiddleware = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }
    if (roles.includes(req.session.user.role)) {
      return next();
    }
    // Authenticated but insufficient role → 403
    res.status(403).render('errors/403', {
      title: 'Access Denied – JIS',
      message: 'You do not have permission to access this page.'
    });
  };
};

module.exports = rbacMiddleware;
