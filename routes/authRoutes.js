'use strict';

const express    = require('express');
const router     = express.Router();
const authCtrl   = require('../controllers/authController');
const notifCtrl  = require('../controllers/notificationController');
const docCtrl    = require('../controllers/documentController');
const auth       = require('../middleware/authMiddleware');
const { loginRateLimiter } = require('../middleware/rateLimitMiddleware');

// S1 – Login (protected by rate limiting against brute-force attacks)
router.get('/login',  authCtrl.getLogin);
router.post('/login', loginRateLimiter, authCtrl.postLogin);

// S4 – Logout (support both GET and POST)
router.get('/logout',  auth, authCtrl.postLogout);
router.post('/logout', auth, authCtrl.postLogout);

// S2 – Notifications (all authenticated roles)
// NOTE: /read-all must be registered BEFORE /:id to avoid route collision
router.post('/notifications/read-all', auth, notifCtrl.markAllRead);
router.post('/notifications/:id/read', auth, notifCtrl.markRead);
router.get('/notifications',           auth, notifCtrl.getNotifications);

// S3 – Document Viewer / Download (all authenticated roles)
// Explicit typed route prevents cross-table ID collisions (H-8)
router.get('/documents/:type/:id', auth, docCtrl.getDocument);
router.get('/documents/:id',       auth, docCtrl.getDocument);

module.exports = router;
