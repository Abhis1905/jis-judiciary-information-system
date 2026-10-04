'use strict';

const bcrypt = require('bcrypt');
const User   = require('../models/User');
const { generateToken } = require('../middleware/csrfMiddleware');

// Precomputed dummy bcrypt hash to equalize response timing when user email does not exist
const DUMMY_BCRYPT_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// Role → dashboard redirect map (role is read from DB, never from client)
const ROLE_REDIRECTS = {
  registrar:  '/registrar/dashboard',
  judge:      '/judge/dashboard',
  prosecutor: '/prosecutor/dashboard',
  advocate:   '/advocate/dashboard'
};

/** GET /login – render login page (S1) */
exports.getLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect(ROLE_REDIRECTS[req.session.user.role] || '/');
  }
  res.render('auth/login', { title: 'Login – JIS' });
};

/** POST /login – authenticate with email + password */
exports.postLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    req.session.flash = { error: 'Email and password are required.' };
    return res.redirect('/login');
  }

  try {
    const user = await User.findByEmail(email.trim().toLowerCase());

    if (!user) {
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      req.session.flash = { error: 'Invalid email or password.' };
      return res.redirect('/login');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      req.session.flash = { error: 'Invalid email or password.' };
      return res.redirect('/login');
    }

    // Regenerate session ID to prevent Session Fixation (C-3)
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error('[Auth] Session regeneration error:', regenErr);
        return res.redirect('/login');
      }

      // Establish authenticated session — role comes from DB, never from client input
      req.session.user = {
        id:        user.id,
        full_name: user.full_name,
        email:     user.email,
        role:      user.role
      };
      req.session.csrfToken = generateToken();
      res.setHeader('X-CSRF-Token', req.session.csrfToken);

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[Auth] Session save error:', saveErr);
          return res.redirect('/login');
        }
        res.redirect(ROLE_REDIRECTS[user.role] || '/');
      });
    });

  } catch (err) {
    console.error('[Auth] Login error:', err);
    req.session.flash = { error: 'An unexpected error occurred. Please try again.' };
    res.redirect('/login');
  }
};

/** POST /logout – destroy session and redirect to login (S4) */
exports.postLogout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
};
