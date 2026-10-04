'use strict';

const express         = require('express');
const router          = express.Router();
const auth            = require('../middleware/authMiddleware');
const rbac            = require('../middleware/rbacMiddleware');
const caseCtrl        = require('../controllers/caseController');
const judgementCtrl   = require('../controllers/judgementController');
const { uploadJudgement } = require('../config/multer');

const guard = [auth, rbac('judge')];

// ── Dashboard ───────────────────────────────────────────────────────
// DFD: JIS → JUDGE (Final Judgements, Case Updates, Trial Notes)
router.get('/dashboard', guard, caseCtrl.getJudgeDashboard);

// ── J1 – Assigned Cases List ─────────────────────────────────────────
// DFD: JUDGE → JIS: Assigned Case Access
router.get('/cases', guard, caseCtrl.getJudgeCases);

// ── J2 – Case Detail, Trial Notes, Status Updates & Final Judgement ──
// DFD: JUDGE → JIS: Trial Updates, Precedent Reviews
// DFD: JIS → JUDGE: Case Updates, Trial Notes, Final Judgements
router.get('/cases/:id',           guard, caseCtrl.getJudgeCaseDetail);
router.post('/cases/:id/notes',    guard, judgementCtrl.postAddTrialNote);
router.post('/cases/:id/status',   guard, judgementCtrl.postUpdateStatus);
router.post('/cases/:id/judgement', guard, uploadJudgement.single('judgement_pdf'), judgementCtrl.postIssueJudgement);

// ── J3 – Precedent / Case Law Search ─────────────────────────────────
// DFD: JUDGE → JIS: Precedent Search, Query Case Law Request
// DFD: JIS → JUDGE: Citations, Case Laws, Judgement PDFs
router.get('/precedents', guard, judgementCtrl.getPrecedents);

module.exports = router;
