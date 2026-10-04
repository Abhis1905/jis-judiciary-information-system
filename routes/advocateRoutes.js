'use strict';

const express         = require('express');
const router          = express.Router();
const auth            = require('../middleware/authMiddleware');
const rbac            = require('../middleware/rbacMiddleware');
const advocateCtrl    = require('../controllers/advocateController');
const {
  uploadVakalatnama,
  uploadEFiling,
  uploadPleading
} = require('../config/multer');

const guard = [auth, rbac('advocate')];

// ── Dashboard ───────────────────────────────────────────────────────
// DFD: JIS → ADVOCATE (Case History, Notices, Cause Lists)
router.get('/dashboard', guard, advocateCtrl.getDashboard);

// ── A1 – Cases List & Search/Link ──────────────────────────────────
// DFD: ADVOCATE → JIS: Case Details (Link Case via Vakalatnama)
// DFD: JIS → ADVOCATE: Case History
router.get('/cases', guard, advocateCtrl.getCases);

// ── A2 – Case Detail (6 Sections) ──────────────────────────────────
// DFD: ADVOCATE → JIS: Vakalatnama, E-Filings, Pleadings, Scheduling Requests
// DFD: JIS → ADVOCATE: Case History, Court Orders, Notices
router.get('/cases/:id',                      guard, advocateCtrl.getCaseDetail);
router.post('/cases/:id/vakalatnama',         guard, uploadVakalatnama.single('vakalatnama'), advocateCtrl.postUploadVakalatnama);
router.post('/cases/:id/efilings',            guard, uploadEFiling.single('efiling'), advocateCtrl.postUploadEFiling);
router.post('/cases/:id/pleadings',           guard, uploadPleading.single('pleading'), advocateCtrl.postUploadPleading);
router.post('/cases/:id/scheduling-requests', guard, advocateCtrl.postSubmitSchedulingRequest);

// ── A3 – Cause List ─────────────────────────────────────────────────
// DFD: JIS → ADVOCATE: Cause Lists
router.get('/causelist', guard, advocateCtrl.getCauseList);

module.exports = router;
