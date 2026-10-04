'use strict';

const fs                = require('fs');
const Case              = require('../models/Case');
const Hearing           = require('../models/Hearing');
const Document          = require('../models/Document');
const Vakalatnama       = require('../models/Vakalatnama');
const EFiling           = require('../models/EFiling');
const Pleading          = require('../models/Pleading');
const CourtOrder        = require('../models/CourtOrder');
const SchedulingRequest = require('../models/SchedulingRequest');
const Judgement         = require('../models/Judgement');
const Notification      = require('../models/Notification');
const Hierarchy         = require('../models/Hierarchy');
const CaseLegalIntegration = require('../models/CaseLegalIntegration');
const CaseAppeal        = require('../models/CaseAppeal');
const {
  EFILING_TYPES,
  PLEADING_TYPES,
  INPUT_LIMITS
} = require('../config/constants');

/**
 * GET /advocate/dashboard
 * Advocate Dashboard with linked case counts, today's cause list, and unread alerts.
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const advocateId = req.session.user.id;
    const [caseCount, todayHearings, upcomingHearings] = await Promise.all([
      Case.countByAdvocate(advocateId),
      Hearing.getTodayByAdvocate(advocateId),
      Hearing.getUpcomingByAdvocate(advocateId, 7)
    ]);

    res.render('advocate/dashboard', {
      title: 'Advocate Dashboard – JIS',
      caseCount,
      todayHearings,
      upcomingHearings
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /advocate/cases
 * A1 – My Cases & Case Linking Search (with pagination M-2, M-3)
 */
exports.getCases = async (req, res, next) => {
  try {
    const advocateId = req.session.user.id;
    const { search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const [linkedCases, unlinkedCases, totalLinked] = await Promise.all([
      Case.getByAdvocate(advocateId, limit, offset),
      Case.searchUnlinked(search || '', limit, offset),
      Case.countByAdvocate(advocateId)
    ]);

    res.render('advocate/caseList', {
      title: 'My Cases & Case Linking – JIS',
      linkedCases,
      unlinkedCases,
      searchQuery: search || '',
      pagination: {
        page,
        limit,
        total: totalLinked,
        totalPages: Math.ceil(totalLinked / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /advocate/cases/:id
 * A2 – Case Detail for Advocate (6 Sections)
 * Allows viewing unlinked cases to upload Vakalatnama; full sections unlock upon linking.
 */
exports.getCaseDetail = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    const advocateId = req.session.user.id;

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

    // If case is already linked to ANOTHER advocate, block access
    if (caseRecord.advocate_id !== null && caseRecord.advocate_id !== advocateId) {
      return res.status(403).render('errors/403', {
        title: 'Access Denied – JIS',
        message: 'This case is already represented by another advocate.'
      });
    }

    const isLinked = (caseRecord.advocate_id === advocateId);

    const [documents, hearings, vakalatnama, efilings, pleadings, courtOrders, schedulingRequests, judgement, appellateChain, legalSections, legalJudgments, appealHistory] = await Promise.all([
      Document.getByCaseId(caseId),
      Hearing.getByCaseId(caseId),
      Vakalatnama.getByCaseId(caseId),
      isLinked ? EFiling.getByCaseId(caseId) : Promise.resolve([]),
      isLinked ? Pleading.getByCaseId(caseId) : Promise.resolve([]),
      isLinked ? CourtOrder.getByCaseId(caseId) : Promise.resolve([]),
      isLinked ? SchedulingRequest.getByCaseId(caseId) : Promise.resolve([]),
      Judgement.getByCaseId(caseId),
      Hierarchy.getFullAppellateChain(caseRecord.case_type, caseRecord.court_level_id),
      CaseLegalIntegration.getSectionsForCase(caseId),
      CaseLegalIntegration.getJudgmentsForCase(caseId),
      CaseAppeal.getAppealHistory(caseId)
    ]);

    const legalFramework = CaseLegalIntegration.getLegalFrameworkForCase(caseRecord);
    const todayStr = new Date().toISOString().split('T')[0];

    res.render('advocate/caseDetail', {
      title: `Case ${caseRecord.case_number} – JIS`,
      caseRecord,
      isLinked,
      documents,
      hearings,
      vakalatnama,
      efilings,
      pleadings,
      courtOrders,
      schedulingRequests,
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


/**
 * POST /advocate/cases/:id/vakalatnama
 * A2 Section B – Upload Vakalatnama (Sole Advocate-Case Association Mechanism)
 * Atomically inserts Vakalatnama, establishes cases.advocate_id, and creates notifications inside a MySQL transaction (C-1).
 */
exports.postUploadVakalatnama = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    const { client_name } = req.body;
    const file = req.file;
    const advocateId = req.session.user.id;

    if (isNaN(caseId)) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    // Verify case is not already claimed by another advocate
    if (caseRecord.advocate_id !== null && caseRecord.advocate_id !== advocateId) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(403).render('errors/403', {
        title: 'Access Denied – JIS',
        message: 'This case is already represented by another advocate.'
      });
    }

    if (!file) {
      req.session.flash = { error: 'Please select a valid Vakalatnama document file (PDF, DOCX, JPG, PNG).' };
      return res.redirect(`/advocate/cases/${caseId}`);
    }

    if (!client_name || !client_name.trim()) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.session.flash = { error: 'Client name is required for Vakalatnama filing.' };
      return res.redirect(`/advocate/cases/${caseId}`);
    }

    if (String(client_name).trim().length > INPUT_LIMITS.CLIENT_NAME) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.session.flash = { error: `Client name cannot exceed ${INPUT_LIMITS.CLIENT_NAME} characters.` };
      return res.redirect(`/advocate/cases/${caseId}`);
    }

    // Atomically insert Vakalatnama, link advocate to case, and create notifications (C-1)
    await Vakalatnama.uploadAndLinkAdvocate({
      caseId,
      advocateId,
      advocateName: req.session.user.full_name,
      clientName:   client_name.trim(),
      originalName: file.originalname,
      fileName:     file.filename,
      filePath:     file.path,
      mimeType:     file.mimetype,
      caseNumber:   caseRecord.case_number,
      filedBy:      caseRecord.filed_by,
      judgeId:      caseRecord.judge_id
    });

    req.session.flash = {
      success: `Vakalatnama uploaded successfully. You are now formally linked as counsel for Case ${caseRecord.case_number}.`
    };
    res.redirect(`/advocate/cases/${caseId}`);
  } catch (err) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

/**
 * POST /advocate/cases/:id/efilings
 * A2 Section C – E-Filings
 */
exports.postUploadEFiling = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    const { filing_type, description } = req.body;
    const file = req.file;
    const advocateId = req.session.user.id;

    if (isNaN(caseId)) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord || caseRecord.advocate_id !== advocateId) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(403).render('errors/403', {
        title: 'Access Denied – JIS',
        message: 'You must be the linked advocate to submit E-Filings for this case.'
      });
    }

    if (!file) {
      req.session.flash = { error: 'Please select a valid filing document (PDF, DOCX, JPG, PNG).' };
      return res.redirect(`/advocate/cases/${caseId}`);
    }

    if (!EFILING_TYPES.includes(filing_type)) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.session.flash = { error: 'Invalid filing type selected.' };
      return res.redirect(`/advocate/cases/${caseId}`);
    }

    if (description && String(description).length > INPUT_LIMITS.DESCRIPTION) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.session.flash = { error: `Description cannot exceed ${INPUT_LIMITS.DESCRIPTION} characters.` };
      return res.redirect(`/advocate/cases/${caseId}`);
    }

    await EFiling.create({
      caseId,
      advocateId,
      filingType:   filing_type,
      originalName: file.originalname,
      fileName:     file.filename,
      filePath:     file.path,
      mimeType:     file.mimetype,
      description:  description ? description.trim() : null
    });

    req.session.flash = { success: `E-Filing (${filing_type}: ${file.originalname}) submitted successfully.` };
    res.redirect(`/advocate/cases/${caseId}`);
  } catch (err) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

/**
 * POST /advocate/cases/:id/pleadings
 * A2 Section D – Pleadings
 */
exports.postUploadPleading = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    const { pleading_type, description } = req.body;
    const file = req.file;
    const advocateId = req.session.user.id;

    if (isNaN(caseId)) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord || caseRecord.advocate_id !== advocateId) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(403).render('errors/403', {
        title: 'Access Denied – JIS',
        message: 'You must be the linked advocate to submit Pleadings for this case.'
      });
    }

    if (!file) {
      req.session.flash = { error: 'Please select a valid pleading document (PDF, DOCX, JPG, PNG).' };
      return res.redirect(`/advocate/cases/${caseId}`);
    }

    if (!PLEADING_TYPES.includes(pleading_type)) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.session.flash = { error: 'Invalid pleading type selected.' };
      return res.redirect(`/advocate/cases/${caseId}`);
    }

    if (description && String(description).length > INPUT_LIMITS.DESCRIPTION) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.session.flash = { error: `Description cannot exceed ${INPUT_LIMITS.DESCRIPTION} characters.` };
      return res.redirect(`/advocate/cases/${caseId}`);
    }

    await Pleading.create({
      caseId,
      advocateId,
      pleadingType: pleading_type,
      originalName: file.originalname,
      fileName:     file.filename,
      filePath:     file.path,
      mimeType:     file.mimetype,
      description:  description ? description.trim() : null
    });

    req.session.flash = { success: `Pleading (${pleading_type}: ${file.originalname}) submitted successfully.` };
    res.redirect(`/advocate/cases/${caseId}`);
  } catch (err) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

/**
 * POST /advocate/cases/:id/scheduling-requests
 * A2 Section F – Hearing Scheduling Requests (with server-side past-date rejection M-8)
 */
exports.postSubmitSchedulingRequest = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    const { requested_date, reason } = req.body;
    const advocateId = req.session.user.id;

    if (isNaN(caseId)) {
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord || caseRecord.advocate_id !== advocateId) {
      return res.status(403).render('errors/403', {
        title: 'Access Denied – JIS',
        message: 'You must be the linked advocate to submit scheduling requests for this case.'
      });
    }

    if (!requested_date || !reason || !reason.trim()) {
      req.session.flash = { error: 'Requested date and reason are required for scheduling requests.' };
      return res.redirect(`/advocate/cases/${caseId}`);
    }

    // Server-side date validation (M-8): reject past dates
    const todayStr = new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(requested_date)) || String(requested_date) < todayStr) {
      req.session.flash = { error: 'Requested hearing date cannot be in the past.' };
      return res.redirect(`/advocate/cases/${caseId}`);
    }

    if (String(reason).length > INPUT_LIMITS.REASON) {
      req.session.flash = { error: `Reason cannot exceed ${INPUT_LIMITS.REASON} characters.` };
      return res.redirect(`/advocate/cases/${caseId}`);
    }

    await SchedulingRequest.create({
      caseId,
      advocateId,
      requestedDate: requested_date,
      reason:        reason.trim()
    });

    // Notify Registrar
    if (caseRecord.filed_by) {
      await Notification.create(
        caseRecord.filed_by,
        `Advocate ${req.session.user.full_name} requested hearing date (${requested_date}) for Case ${caseRecord.case_number}.`,
        caseId
      );
    }

    req.session.flash = { success: 'Hearing scheduling request submitted to Registrar successfully.' };
    res.redirect(`/advocate/cases/${caseId}`);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /advocate/causelist
 * A3 – Cause List (Upcoming hearings for linked cases)
 */
exports.getCauseList = async (req, res, next) => {
  try {
    const advocateId = req.session.user.id;
    const upcomingHearings = await Hearing.getUpcomingByAdvocate(advocateId, 30);

    res.render('advocate/causelist', {
      title: 'Cause List – JIS',
      upcomingHearings
    });
  } catch (err) {
    next(err);
  }
};
