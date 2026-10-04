'use strict';

const Case             = require('../models/Case');
const Hearing          = require('../models/Hearing');
const Document         = require('../models/Document');
const User             = require('../models/User');
const Notification     = require('../models/Notification');
const TrialNote        = require('../models/TrialNote');
const Judgement        = require('../models/Judgement');
const CaseStatusUpdate = require('../models/CaseStatusUpdate');
const Hierarchy        = require('../models/Hierarchy');
const CaseLegalIntegration = require('../models/CaseLegalIntegration');
const LegalAct         = require('../models/LegalAct');
const CaseAppeal       = require('../models/CaseAppeal');
const {
  CASE_TYPES,
  CASE_STATUSES,
  VALID_STATUS_TRANSITIONS,
  INPUT_LIMITS
} = require('../config/constants');

// ═════════════════════════════════════════════════════════════════════
// REGISTRAR MODULE
// ═════════════════════════════════════════════════════════════════════

/**
 * GET /registrar/dashboard
 * Registrar Dashboard with stat cards, recent scheduling confirmations, and quick actions.
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const [pendingAllocation, totalCases, todayHearings, thisWeekHearings, recentHearings] = await Promise.all([
      Case.countPendingAllocation(),
      Case.countAll(),
      Hearing.countToday(),
      Hearing.countThisWeek(),
      Hearing.getRecent(5)
    ]);

    res.render('registrar/dashboard', {
      title: 'Registrar Dashboard – JIS',
      pendingAllocation,
      totalCases,
      todayHearings,
      thisWeekHearings,
      recentHearings
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /registrar/cases/new
 * R1 – New Case Filing Form
 */
exports.getNewCaseForm = async (req, res, next) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const [states, courtLevels] = await Promise.all([
      Hierarchy.getAllStates(),
      Hierarchy.getCourtLevels()
    ]);

    res.render('registrar/caseNew', {
      title: 'New Case Filing – JIS',
      todayStr,
      states,
      courtLevels
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /registrar/cases & POST /registrar/cases/new
 * R1 – Create New Case
 */
exports.postCreateCase = async (req, res, next) => {
  try {
    const {
      case_number,
      title,
      case_type,
      petitioner_name,
      respondent_name,
      filing_date,
      description,
      is_public,
      state_ut_id,
      high_court_id,
      bench_id,
      district_id,
      subordinate_court_id,
      court_level_id
    } = req.body;

    // Server-side validation
    if (!case_number || !title || !case_type || !petitioner_name || !respondent_name || !filing_date) {
      req.session.flash = { error: 'Please fill in all required fields (Case Number, Title, Type, Parties, Filing Date).' };
      return res.redirect('/registrar/cases/new');
    }

    if (!CASE_TYPES.includes(case_type)) {
      req.session.flash = { error: 'Invalid case type selected.' };
      return res.redirect('/registrar/cases/new');
    }

    // Input length validation (M-12)
    if (
      String(case_number).trim().length > INPUT_LIMITS.CASE_NUMBER ||
      String(title).trim().length > INPUT_LIMITS.TITLE ||
      String(petitioner_name).trim().length > INPUT_LIMITS.PARTY_NAME ||
      String(respondent_name).trim().length > INPUT_LIMITS.PARTY_NAME ||
      (description && String(description).length > INPUT_LIMITS.DESCRIPTION)
    ) {
      req.session.flash = { error: 'One or more fields exceed the maximum permitted character length.' };
      return res.redirect('/registrar/cases/new');
    }

    let sUtId = state_ut_id ? parseInt(state_ut_id, 10) : null;
    let hcId = high_court_id ? parseInt(high_court_id, 10) : null;
    let bId = bench_id ? parseInt(bench_id, 10) : null;
    let distId = district_id ? parseInt(district_id, 10) : null;
    let subCourtId = subordinate_court_id ? parseInt(subordinate_court_id, 10) : null;
    let cLevelId = court_level_id ? parseInt(court_level_id, 10) : null;

    // Validate hierarchy logical consistency
    const validation = await Hierarchy.validateHierarchySelection({
      stateUtId: sUtId,
      highCourtId: hcId,
      benchId: bId,
      districtId: distId,
      subordinateCourtId: subCourtId,
      courtLevelId: cLevelId,
      caseType: case_type
    });

    if (!validation.isValid) {
      req.session.flash = { error: validation.error };
      return res.redirect('/registrar/cases/new');
    }

    // Auto-fill associated parent hierarchy FKs from district if omitted
    if (distId && (!sUtId || !hcId || !bId)) {
      const distRows = await Hierarchy.getDistricts({ districtId: distId });
      if (distRows && distRows.length > 0) {
        if (!sUtId) sUtId = distRows[0].state_ut_id;
        if (!hcId) hcId = distRows[0].high_court_id;
        if (!bId) bId = distRows[0].bench_id;
      }
    }

    const newCaseId = await Case.create({
      caseNumber:         case_number.trim(),
      title:              title.trim(),
      caseType:           case_type,
      petitionerName:     petitioner_name.trim(),
      respondentName:     respondent_name.trim(),
      description:        description ? description.trim() : null,
      isPublic:           is_public === '1' || is_public === 'on' || is_public === true,
      filedBy:            req.session.user.id,
      filingDate:         filing_date,
      stateUtId:          sUtId,
      highCourtId:        hcId,
      benchId:            bId,
      districtId:         distId,
      subordinateCourtId: subCourtId,
      courtLevelId:       cLevelId
    });

    req.session.flash = { success: `Case ${case_number.trim()} filed successfully with status 'Filed'.` };
    res.redirect(`/registrar/cases/${newCaseId}`);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      req.session.flash = { error: `Case number '${req.body.case_number}' already exists in the system. Case numbers must be unique.` };
      return res.redirect('/registrar/cases/new');
    }
    next(err);
  }
};

/**
 * GET /registrar/cases
 * R2 – Cases List (with server-side pagination M-1)
 */
exports.getAllCases = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const offset = (page - 1) * limit;

    const [cases, totalCases] = await Promise.all([
      Case.getAll(limit, offset),
      Case.countAll()
    ]);

    res.render('registrar/caseList', {
      title: 'All Cases – JIS',
      cases,
      pagination: {
        page,
        limit,
        total: totalCases,
        totalPages: Math.ceil(totalCases / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /registrar/cases/:id
 * R3 – Case Detail (Overview, Judge Assignment, E-Docs, Hearings)
 *
 * NOTE ON PROSECUTOR ASSIGNMENT (Audit Finding H-6):
 * Per the approved Level-1 DFD and JIS_Page_Specification.md (Section R3, line 54),
 * there is no Registrar → Prosecutor assignment flow in the specification.
 * Cases with prosecutor involvement are pre-allocated at filing/seeding time via
 * cases.prosecutor_id, and Judge assignment is the sole manual allocation action on R3.
 */
exports.getCaseDetail = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    if (isNaN(caseId)) {
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    const [caseRecord, judges, documents, hearings, availableActs] = await Promise.all([
      Case.findById(caseId),
      User.findByRole('judge'),
      Document.getByCaseId(caseId),
      Hearing.getByCaseId(caseId),
      LegalAct.getAll()
    ]);

    if (!caseRecord) {
      return res.status(404).render('errors/404', {
        title: 'Case Not Found – JIS',
        message: 'The requested case record does not exist.'
      });
    }

    const [legalSections, legalJudgments, appellateChain, appealHistory] = await Promise.all([
      CaseLegalIntegration.getSectionsForCase(caseId),
      CaseLegalIntegration.getJudgmentsForCase(caseId),
      Hierarchy.getFullAppellateChain(caseRecord.case_type, caseRecord.court_level_id),
      CaseAppeal.getAppealHistory(caseId)
    ]);
    const legalFramework = CaseLegalIntegration.getLegalFrameworkForCase(caseRecord);

    res.render('registrar/caseDetail', {
      title: `Case ${caseRecord.case_number} – JIS`,
      caseRecord,
      judges,
      documents,
      hearings,
      appellateChain,
      legalSections,
      legalJudgments,
      legalFramework,
      availableActs,
      appealHistory,
      canEditLegalSections: true,
      canFileAppeal: true
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /registrar/cases/:id/appeals/new
 * Appeal Filing Form (Statutory Appellate Escalation)
 */
exports.getNewAppealForm = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    if (isNaN(caseId)) {
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord) {
      return res.status(404).render('errors/404', {
        title: 'Case Not Found – JIS',
        message: 'The requested case record does not exist.'
      });
    }

    const [destinations, highCourts, benches] = await Promise.all([
      CaseAppeal.getNextAppellateDestinations(caseId),
      Hierarchy.getAllHighCourts(),
      caseRecord.high_court_id ? Hierarchy.getBenchesByHighCourt(caseRecord.high_court_id) : Promise.resolve([])
    ]);

    const todayStr = new Date().toISOString().split('T')[0];

    res.render('registrar/appealNew', {
      title: `File Appeal – Case ${caseRecord.case_number} – JIS`,
      caseRecord,
      destinations,
      highCourts,
      benches,
      todayStr
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /registrar/cases/:id/appeals
 * Process Appeal Creation
 */
exports.postCreateAppeal = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    if (isNaN(caseId)) {
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    const {
      destination_court_level_id,
      destination_high_court_id,
      destination_bench_id,
      destination_district_id,
      appeal_type,
      grounds,
      filing_date
    } = req.body;

    if (!destination_court_level_id || !grounds) {
      req.session.flash = { error: 'Please select a destination court tier and specify the grounds of appeal.' };
      return res.redirect(`/registrar/cases/${caseId}/appeals/new`);
    }

    if (String(grounds).length > INPUT_LIMITS.GROUNDS) {
      req.session.flash = { error: `Grounds of appeal cannot exceed ${INPUT_LIMITS.GROUNDS} characters.` };
      return res.redirect(`/registrar/cases/${caseId}/appeals/new`);
    }

    const result = await CaseAppeal.createAppeal({
      originalCaseId: caseId,
      destinationCourtLevelId: parseInt(destination_court_level_id, 10),
      destinationHighCourtId: destination_high_court_id ? parseInt(destination_high_court_id, 10) : null,
      destinationBenchId: destination_bench_id ? parseInt(destination_bench_id, 10) : null,
      destinationDistrictId: destination_district_id ? parseInt(destination_district_id, 10) : null,
      appealType: appeal_type ? appeal_type.trim() : null,
      grounds: grounds ? grounds.trim() : null,
      filingDate: filing_date || null,
      userId: req.session.user ? req.session.user.id : 1,
      isSynthetic: 0
    });

    req.session.flash = {
      success: `Appeal ${result.appealCaseNumber} filed successfully to ${result.destinationCourtLevel}.`
    };

    res.redirect(`/registrar/cases/${result.appealCaseId}`);
  } catch (err) {
    req.session.flash = { error: err.message || 'Failed to process appeal.' };
    return res.redirect(`/registrar/cases/${req.params.id}/appeals/new`);
  }
};

/**
 * GET /registrar/appeals/:id (or /appeals/:id)
 * View single appeal record detail
 */
exports.getAppealDetail = async (req, res, next) => {
  try {
    const appealId = parseInt(req.params.id, 10);
    if (isNaN(appealId)) {
      return res.status(404).render('errors/404', { title: 'Appeal Record Not Found – JIS' });
    }

    const appeal = await CaseAppeal.getAppealById(appealId);
    if (!appeal) {
      return res.status(404).render('errors/404', {
        title: 'Appeal Not Found – JIS',
        message: 'The requested appeal record does not exist.'
      });
    }

    res.redirect(`/registrar/cases/${appeal.appeal_case_id}`);
  } catch (err) {
    next(err);
  }
};


/**
 * POST /registrar/cases/:id/legal-sections
 * Associate Legal Provision to Case
 */
exports.postAddCaseLegalSection = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    const { legal_section_id, relevance_type, notes } = req.body;

    if (isNaN(caseId) || !legal_section_id) {
      req.session.flash = { error: 'Please select a valid legal section.' };
      return res.redirect(`/registrar/cases/${caseId}`);
    }

    if (notes && String(notes).length > INPUT_LIMITS.NOTES) {
      req.session.flash = { error: `Section notes cannot exceed ${INPUT_LIMITS.NOTES} characters.` };
      return res.redirect(`/registrar/cases/${caseId}`);
    }

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord) {
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    await CaseLegalIntegration.addSectionToCase(
      caseId,
      parseInt(legal_section_id, 10),
      relevance_type || 'PRIMARY',
      0,
      notes ? notes.trim() : null
    );

    req.session.flash = { success: 'Legal section provision successfully associated with this case.' };
    res.redirect(`/registrar/cases/${caseId}`);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /registrar/cases/:id/legal-sections/:sectionId/delete (or remove)
 * Remove Legal Provision from Case
 */
exports.postRemoveCaseLegalSection = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    const sectionId = parseInt(req.params.sectionId || req.body.legal_section_id, 10);

    if (isNaN(caseId) || isNaN(sectionId)) {
      req.session.flash = { error: 'Invalid case or section parameter.' };
      return res.redirect(`/registrar/cases/${caseId}`);
    }

    await CaseLegalIntegration.removeSectionFromCase(caseId, sectionId);

    req.session.flash = { success: 'Legal section association removed successfully.' };
    res.redirect(`/registrar/cases/${caseId}`);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /registrar/cases/:id/assign-judge
 * R3 Section A – Manual Judge Assignment (Transactional C-1 + State Machine M-9)
 */
exports.postAssignJudge = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    const { judge_id } = req.body;

    if (isNaN(caseId) || !judge_id) {
      req.session.flash = { error: 'Please select a valid Judge for allocation.' };
      return res.redirect(`/registrar/cases/${caseId}`);
    }

    const judgeId = parseInt(judge_id, 10);
    const judge = await User.findById(judgeId);

    if (!judge || judge.role !== 'judge') {
      req.session.flash = { error: 'The selected user is not a valid Judge in the system.' };
      return res.redirect(`/registrar/cases/${caseId}`);
    }

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord) {
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    if (caseRecord.status === CASE_STATUSES.CLOSED) {
      req.session.flash = { error: 'Cannot reassign a Judge on a Closed case.' };
      return res.redirect(`/registrar/cases/${caseId}`);
    }

    // Atomically update case judge allocation, transition 'Filed' -> 'Allocated', and create notification (C-1)
    await Case.assignJudgeWithNotification(
      caseId,
      judgeId,
      `Case ${caseRecord.case_number} – "${caseRecord.title}" has been assigned to you.`
    );

    req.session.flash = {
      success: `Judge ${judge.full_name} has been assigned to Case ${caseRecord.case_number}. Status updated to 'Allocated'.`
    };
    res.redirect(`/registrar/cases/${caseId}`);
  } catch (err) {
    next(err);
  }
};


// ═════════════════════════════════════════════════════════════════════
// JUDGE MODULE
// ═════════════════════════════════════════════════════════════════════

/**
 * GET /judge/dashboard
 * Judge Dashboard with assigned case count, upcoming hearings, and quick links.
 */
exports.getJudgeDashboard = async (req, res, next) => {
  try {
    const judgeId = req.session.user.id;
    const [assignedCount, upcomingHearings] = await Promise.all([
      Case.countByJudge(judgeId),
      Hearing.getUpcomingByJudge(judgeId, 7)
    ]);

    res.render('judge/dashboard', {
      title: 'Judge Dashboard – JIS',
      assignedCount,
      upcomingHearings
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /judge/cases
 * J1 – Assigned Cases List (with server-side pagination M-2)
 */
exports.getJudgeCases = async (req, res, next) => {
  try {
    const judgeId = req.session.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const offset = (page - 1) * limit;

    const [cases, totalCases] = await Promise.all([
      Case.getByJudge(judgeId, limit, offset),
      Case.countByJudge(judgeId)
    ]);

    res.render('judge/caseList', {
      title: 'My Assigned Cases – JIS',
      cases,
      pagination: {
        page,
        limit,
        total: totalCases,
        totalPages: Math.ceil(totalCases / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /judge/cases/:id
 * J2 – Case Detail for Judge
 */
exports.getJudgeCaseDetail = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    const judgeId = req.session.user.id;

    if (isNaN(caseId)) {
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord) {
      return res.status(404).render('errors/404', {
        title: 'Case Not Found – JIS',
        message: 'The requested case record does not exist.'
      });
    }

    // Strict ownership enforcement
    if (caseRecord.judge_id !== judgeId) {
      return res.status(403).render('errors/403', {
        title: 'Access Denied – JIS',
        message: 'You are not authorized to view this case. It is not assigned to your judicial docket.'
      });
    }

    const [documents, hearings, trialNotes, judgement, appellateChain, legalSections, legalJudgments, appealHistory] = await Promise.all([
      Document.getByCaseId(caseId),
      Hearing.getByCaseId(caseId),
      TrialNote.getByCaseId(caseId),
      Judgement.getByCaseId(caseId),
      Hierarchy.getFullAppellateChain(caseRecord.case_type, caseRecord.court_level_id),
      CaseLegalIntegration.getSectionsForCase(caseId),
      CaseLegalIntegration.getJudgmentsForCase(caseId),
      CaseAppeal.getAppealHistory(caseId)
    ]);

    const legalFramework = CaseLegalIntegration.getLegalFrameworkForCase(caseRecord);
    const todayStr = new Date().toISOString().split('T')[0];

    res.render('judge/caseDetail', {
      title: `Case ${caseRecord.case_number} – JIS`,
      caseRecord,
      documents,
      hearings,
      trialNotes,
      judgement,
      appellateChain,
      legalSections,
      legalJudgments,
      legalFramework,
      appealHistory,
      canEditLegalSections: false,
      canFileAppeal: false,
      todayStr
    });
  } catch (err) {
    next(err);
  }
};

// ═════════════════════════════════════════════════════════════════════
// PROSECUTOR MODULE
// ═════════════════════════════════════════════════════════════════════

/**
 * GET /prosecutor/dashboard
 * Prosecutor Dashboard with allocated case count, upcoming hearing notices, and quick links.
 */
exports.getProsecutorDashboard = async (req, res, next) => {
  try {
    const prosecutorId = req.session.user.id;
    const [caseCount, upcomingHearings, recentUpdates] = await Promise.all([
      Case.countByProsecutor(prosecutorId),
      Hearing.getUpcomingByProsecutor(prosecutorId, 7),
      CaseStatusUpdate.getByProsecutor(prosecutorId, 5)
    ]);

    res.render('prosecutor/dashboard', {
      title: 'Prosecutor Dashboard – JIS',
      caseCount,
      upcomingHearings,
      recentUpdates
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /prosecutor/cases
 * P1 – My Cases List (shows ONLY cases where prosecutor_id = logged-in Prosecutor, with pagination M-2)
 */
exports.getProsecutorCases = async (req, res, next) => {
  try {
    const prosecutorId = req.session.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const offset = (page - 1) * limit;

    const [cases, totalCases] = await Promise.all([
      Case.getByProsecutor(prosecutorId, limit, offset),
      Case.countByProsecutor(prosecutorId)
    ]);

    res.render('prosecutor/caseList', {
      title: 'My Cases – JIS',
      cases,
      pagination: {
        page,
        limit,
        total: totalCases,
        totalPages: Math.ceil(totalCases / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /prosecutor/cases/:id
 * P2 – Case Detail for Prosecutor
 * Strictly enforces case ownership: caseRecord.prosecutor_id === logged-in Prosecutor ID.
 */
exports.getProsecutorCaseDetail = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    const prosecutorId = req.session.user.id;

    if (isNaN(caseId)) {
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord) {
      return res.status(404).render('errors/404', {
        title: 'Case Not Found – JIS',
        message: 'The requested case record does not exist.'
      });
    }

    // Strict ownership enforcement
    if (caseRecord.prosecutor_id !== prosecutorId) {
      return res.status(403).render('errors/403', {
        title: 'Access Denied – JIS',
        message: 'You are not authorized to access this case. It is not allocated to your prosecution docket.'
      });
    }

    const [documents, hearings, statusUpdates, judgement, appellateChain, legalSections, legalJudgments, appealHistory] = await Promise.all([
      Document.getByCaseId(caseId),
      Hearing.getByCaseId(caseId),
      CaseStatusUpdate.getByCaseId(caseId),
      Judgement.getByCaseId(caseId),
      Hierarchy.getFullAppellateChain(caseRecord.case_type, caseRecord.court_level_id),
      CaseLegalIntegration.getSectionsForCase(caseId),
      CaseLegalIntegration.getJudgmentsForCase(caseId),
      CaseAppeal.getAppealHistory(caseId)
    ]);
    const legalFramework = CaseLegalIntegration.getLegalFrameworkForCase(caseRecord);

    res.render('prosecutor/caseDetail', {
      title: `Case ${caseRecord.case_number} – JIS`,
      caseRecord,
      documents,
      hearings,
      statusUpdates,
      judgement,
      appellateChain,
      legalSections,
      legalJudgments,
      legalFramework,
      appealHistory,
      canEditLegalSections: false,
      canFileAppeal: false
    });

  } catch (err) {
    next(err);
  }
};


/**
 * POST /prosecutor/cases/:id/updates
 * P2 Section C – Submit Case Status Update
 * DFD Flow: PUBLIC PROSECUTOR → JIS: Status Updates
 */
exports.postProsecutorStatusUpdate = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    const { update_description } = req.body;
    const prosecutorId = req.session.user.id;

    if (isNaN(caseId)) {
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord) {
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    // Strict ownership verification
    if (caseRecord.prosecutor_id !== prosecutorId) {
      return res.status(403).render('errors/403', {
        title: 'Access Denied – JIS',
        message: 'You are not authorized to submit status updates for cases not allocated to you.'
      });
    }

    if (!update_description || !update_description.trim()) {
      req.session.flash = { error: 'Status update description cannot be empty.' };
      return res.redirect(`/prosecutor/cases/${caseId}`);
    }

    if (String(update_description).length > INPUT_LIMITS.UPDATE_DESCRIPTION) {
      req.session.flash = { error: `Status update cannot exceed ${INPUT_LIMITS.UPDATE_DESCRIPTION} characters.` };
      return res.redirect(`/prosecutor/cases/${caseId}`);
    }

    await CaseStatusUpdate.create({
      caseId,
      prosecutorId,
      updateDescription: update_description.trim()
    });

    // Notify assigned Judge if present
    if (caseRecord.judge_id) {
      await Notification.create(
        caseRecord.judge_id,
        `Prosecutor update on Case ${caseRecord.case_number}: "${update_description.trim().slice(0, 80)}${update_description.length > 80 ? '...' : ''}"`,
        caseId
      );
    }

    req.session.flash = { success: 'Prosecution status update recorded successfully.' };
    res.redirect(`/prosecutor/cases/${caseId}`);
  } catch (err) {
    next(err);
  }
};
