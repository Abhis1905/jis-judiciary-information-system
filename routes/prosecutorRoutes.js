'use strict';

const express  = require('express');
const router   = express.Router();
const auth     = require('../middleware/authMiddleware');
const rbac     = require('../middleware/rbacMiddleware');
const caseCtrl = require('../controllers/caseController');

const guard = [auth, rbac('prosecutor')];

// ── Dashboard ───────────────────────────────────────────────────────
// DFD: JIS → PUBLIC PROSECUTOR (Case Allocation, Notification, Hearing Notices)
router.get('/dashboard', guard, caseCtrl.getProsecutorDashboard);

// ── P1 – Cases List / Case Inquiry ──────────────────────────────────
// DFD: PUBLIC PROSECUTOR → JIS: Case Inquiry
// DFD: JIS → PUBLIC PROSECUTOR: Case Allocation
router.get('/cases', guard, caseCtrl.getProsecutorCases);

// ── P2 – Case Detail & Status Updates ──────────────────────────────
// DFD: PUBLIC PROSECUTOR → JIS: Status Updates
// DFD: JIS → PUBLIC PROSECUTOR: Hearing Notices, Notification
router.get('/cases/:id',                guard, caseCtrl.getProsecutorCaseDetail);
router.post('/cases/:id/updates',       guard, caseCtrl.postProsecutorStatusUpdate);
router.post('/cases/:id/status-updates', guard, caseCtrl.postProsecutorStatusUpdate);
router.post('/cases/:id',               guard, caseCtrl.postProsecutorStatusUpdate);

module.exports = router;
