'use strict';

require('dotenv').config();
const express     = require('express');
const session     = require('express-session');
const path        = require('path');
const pool        = require('./config/db');
const MySQLSessionStore = require('./config/sessionStore');
const securityHeaders   = require('./middleware/securityHeadersMiddleware');
const { csrfProtection } = require('./middleware/csrfMiddleware');
const { apiRateLimiter } = require('./middleware/rateLimitMiddleware');

const authRoutes       = require('./routes/authRoutes');
const publicRoutes     = require('./routes/publicRoutes');
const registrarRoutes  = require('./routes/registrarRoutes');
const judgeRoutes      = require('./routes/judgeRoutes');
const prosecutorRoutes = require('./routes/prosecutorRoutes');
const advocateRoutes   = require('./routes/advocateRoutes');
const hierarchyRoutes  = require('./routes/hierarchyRoutes');
const legalRoutes      = require('./routes/legalRoutes');

const app = express();
app.disable('x-powered-by');

// ── Security Headers (H-3) ──────────────────────────────────────────
app.use(securityHeaders);

// ── View Engine ─────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Static Files ────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Body Parsing ────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(express.json({ limit: '256kb' }));

// ── Persistent MySQL Session Store (H-4) ────────────────────────────
const sessionStore = new MySQLSessionStore(pool);

app.use(session({
  store:             sessionStore,
  secret:            process.env.SESSION_SECRET || 'jis_fallback_dev_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   1000 * 60 * 60 * 8   // 8 hours
  }
}));

// ── Locals Middleware ────────────────────────────────────────────────
// Makes `user`, `flash`, and `unreadCount` available in every EJS view.
// unreadCount powers the notification badge in the navbar.
app.use(async (req, res, next) => {
  res.locals.user        = req.session.user || null;
  res.locals.flash       = req.session.flash || null;
  res.locals.unreadCount = 0;
  delete req.session.flash;

  if (req.session.user) {
    try {
      const [rows] = await pool.query(
        'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
        [req.session.user.id]
      );
      res.locals.unreadCount = rows[0].count;
    } catch (_) {
      // Non-critical — fall back to 0 without breaking the request
    }
  }
  next();
});

// ── Synchronizer Token Pattern CSRF Protection (C-2) ────────────────
app.use(csrfProtection);

// ── Routes ───────────────────────────────────────────────────────────
app.use('/',              authRoutes);       // /login, /logout, /notifications, /documents
app.use('/',              publicRoutes);     // /, /search, /case/:id, /notices
app.use('/registrar',     registrarRoutes);
app.use('/judge',         judgeRoutes);
app.use('/prosecutor',    prosecutorRoutes);
app.use('/advocate',      advocateRoutes);
app.use('/api/hierarchy', apiRateLimiter, hierarchyRoutes);
app.use('/legal',         legalRoutes);
app.use('/api/legal',     apiRateLimiter, legalRoutes);

// ── 404 Handler ──────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }
  res.status(404).render('errors/404', { title: 'Page Not Found – JIS' });
});

// ── Global Error Handler (M-6) ───────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    console.error('[JIS Error]', err.stack || err.message);
  } else if (process.env.NODE_ENV === 'production') {
    console.error('[JIS Error]', err.message);
  }

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(statusCode).json({
      success: false,
      message: statusCode >= 500 ? 'An unexpected server error occurred.' : err.message
    });
  }
  res.status(statusCode).render(`errors/${statusCode === 404 ? '404' : statusCode === 403 ? '403' : '500'}`, {
    title: `${statusCode === 404 ? 'Page Not Found' : statusCode === 403 ? 'Access Denied' : 'Server Error'} – JIS`,
    message: statusCode < 500 ? err.message : undefined
  });
});

// ── Start Server (only when run directly, not when required by tests) ──
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('\n  ══════════════════════════════════════════════');
    console.log('  JIS – Judiciary Info System');
    console.log(`  Running at  http://localhost:${PORT}`);
    console.log(`  Environment ${process.env.NODE_ENV || 'development'}`);
    console.log('  ══════════════════════════════════════════════\n');
  });
}

module.exports = app;
