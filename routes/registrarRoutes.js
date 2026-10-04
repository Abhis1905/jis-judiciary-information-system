'use strict';

const express         = require('express');
const router          = express.Router();
const auth            = require('../middleware/authMiddleware');
const rbac            = require('../middleware/rbacMiddleware');
const caseCtrl        = require('../controllers/caseController');
const hearingCtrl     = require('../controllers/hearingController');
const docCtrl         = require('../controllers/documentController');
const { uploadDocument } = require('../config/multer');

const guard = [auth, rbac('registrar')];

// ── Dashboard ───────────────────────────────────────────────────────
// DFD: JIS → REGISTRAR (Dashboard, Case Allocation, Scheduling Confirmation)
router.get('/dashboard', guard, caseCtrl.getDashboard);

// ── R1 – New Case Filing ───────────────────────────────────────────
// DFD: REGISTRAR → JIS: New Case Filing
router.get('/cases/new',  guard, caseCtrl.getNewCaseForm);
router.post('/cases/new', guard, caseCtrl.postCreateCase);
router.post('/cases',     guard, caseCtrl.postCreateCase);

// ── R2 – Cases List ─────────────────────────────────────────────────
// DFD: JIS → REGISTRAR: Dashboard / Case Allocation
router.get('/cases', guard, caseCtrl.getAllCases);

// ── R3 – Case Detail (Overview, Manual Judge Allocation, E-Docs) ────
// DFD: REGISTRAR → JIS: Case Allocation, E-Documents
// DFD: JIS → REGISTRAR: Case Allocation Confirmation
router.get('/cases/:id',                                     guard, caseCtrl.getCaseDetail);
router.post('/cases/:id/assign-judge',                       guard, caseCtrl.postAssignJudge);
router.post('/cases/:id/documents',                          guard, uploadDocument.single('document'), docCtrl.postUploadDocument);
router.post('/cases/:id/legal-sections',                     guard, caseCtrl.postAddCaseLegalSection);
router.post('/cases/:id/legal-sections/:sectionId/delete',   guard, caseCtrl.postRemoveCaseLegalSection);
router.post('/cases/:id/legal-sections/remove',              guard, caseCtrl.postRemoveCaseLegalSection);

// ── R3.5 – Appellate Workflow (Lower Court -> High Court -> Supreme Court)
router.get('/cases/:id/appeals/new',                         guard, caseCtrl.getNewAppealForm);
router.post('/cases/:id/appeals',                            guard, caseCtrl.postCreateAppeal);
router.get('/appeals/:id',                                   guard, caseCtrl.getAppealDetail);


// ── R4 – Hearing Management ────────────────────────────────────────
// DFD: REGISTRAR → JIS: Hearing Requests
// DFD: JIS → REGISTRAR: Scheduling Confirmation
router.get('/hearings',  guard, hearingCtrl.getHearings);
router.post('/hearings', guard, hearingCtrl.postScheduleHearing);

module.exports = router;
