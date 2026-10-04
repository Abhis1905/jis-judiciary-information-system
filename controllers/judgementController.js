'use strict';

const fs           = require('fs');
const Case         = require('../models/Case');
const Judgement    = require('../models/Judgement');
const TrialNote    = require('../models/TrialNote');
const CaseLaw      = require('../models/CaseLaw');
const {
  CASE_STATUSES,
  VALID_STATUS_TRANSITIONS,
  JUDGE_ALLOWED_STATUS_UPDATES,
  VERDICT_TYPES,
  INPUT_LIMITS
} = require('../config/constants');

/**
 * GET /judge/precedents
 * J3 – Precedent / Case Law Search (Simulated Supreme Court Judgement Repository)
 */
exports.getPrecedents = async (req, res, next) => {
  try {
    const { q, year, court } = req.query;

    const [precedents, distinctYears] = await Promise.all([
      CaseLaw.search({ query: q, year, courtName: court }),
      CaseLaw.getDistinctYears()
    ]);

    res.render('judge/precedents', {
      title: 'Precedent Search – JIS',
      precedents,
      distinctYears,
      query: req.query
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /judge/cases/:id/notes
 * J2 Section C – Add Trial Note
 */
exports.postAddTrialNote = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    const { note_content } = req.body;
    const judgeId = req.session.user.id;

    if (isNaN(caseId)) {
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord) {
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    // Strict ownership verification: only the assigned Judge can add trial notes
    if (caseRecord.judge_id !== judgeId) {
      return res.status(403).render('errors/403', {
        title: 'Access Denied – JIS',
        message: 'You are not authorized to add trial notes to a case not assigned to you.'
      });
    }

    if (!note_content || !note_content.trim()) {
      req.session.flash = { error: 'Trial note content cannot be empty.' };
      return res.redirect(`/judge/cases/${caseId}`);
    }

    const trimmedNote = note_content.trim();
    if (trimmedNote.length > INPUT_LIMITS.NOTE_CONTENT_MAX) {
      req.session.flash = { error: `Trial note cannot exceed ${INPUT_LIMITS.NOTE_CONTENT_MAX} characters.` };
      return res.redirect(`/judge/cases/${caseId}`);
    }

    await TrialNote.create({
      caseId,
      judgeId,
      noteContent: trimmedNote
    });

    req.session.flash = { success: 'Trial note added successfully.' };
    res.redirect(`/judge/cases/${caseId}`);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /judge/cases/:id/status
 * J2 Section D – Update Case Status
 * Enforces strict state machine transitions (M-9) and centralized status constants (L-1).
 */
exports.postUpdateStatus = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    const { status } = req.body;
    const judgeId = req.session.user.id;

    if (isNaN(caseId)) {
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord) {
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    // Strict ownership verification
    if (caseRecord.judge_id !== judgeId) {
      return res.status(403).render('errors/403', {
        title: 'Access Denied – JIS',
        message: 'You are not authorized to modify the status of a case not assigned to you.'
      });
    }

    if (!JUDGE_ALLOWED_STATUS_UPDATES.includes(status)) {
      req.session.flash = { error: 'Invalid status transition. Use the Final Judgement form to close a case.' };
      return res.redirect(`/judge/cases/${caseId}`);
    }

    const currentStatus = caseRecord.status;
    if (currentStatus === CASE_STATUSES.CLOSED) {
      req.session.flash = { error: 'Cannot change status of a Closed case.' };
      return res.redirect(`/judge/cases/${caseId}`);
    }

    // Enforce valid lifecycle ordering (M-9):
    // - 'Filed' case cannot jump directly to 'Judgement Pending'
    // - 'Allocated' can transition to 'In Trial' (or 'Judgement Pending' if summary proceedings)
    // - 'In Trial' can transition to 'Judgement Pending'
    const validNextForCurrent = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (currentStatus !== status && !validNextForCurrent.includes(status)) {
      req.session.flash = {
        error: `Invalid lifecycle transition from '${currentStatus}' to '${status}'.`
      };
      return res.redirect(`/judge/cases/${caseId}`);
    }

    await Case.updateStatus(caseId, status);

    req.session.flash = { success: `Case status successfully updated to '${status}'.` };
    res.redirect(`/judge/cases/${caseId}`);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /judge/cases/:id/judgement
 * J2 Section E – Upload Final Judgement & Close Case
 * Atomically records judgement, closes case, and notifies parties inside a transaction (C-1).
 */
exports.postIssueJudgement = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    const { verdict, summary, judgement_date } = req.body;
    const file = req.file;
    const judgeId = req.session.user.id;

    if (isNaN(caseId)) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    // Strict ownership verification
    if (caseRecord.judge_id !== judgeId) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(403).render('errors/403', {
        title: 'Access Denied – JIS',
        message: 'You are not authorized to issue judgements for cases not assigned to you.'
      });
    }

    if (caseRecord.status === CASE_STATUSES.FILED || caseRecord.status === CASE_STATUSES.CLOSED) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.session.flash = {
        error: `Cannot issue a final judgement when case status is '${caseRecord.status}'.`
      };
      return res.redirect(`/judge/cases/${caseId}`);
    }

    // Validate verdict
    if (!VERDICT_TYPES.includes(verdict)) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.session.flash = { error: 'Please select a valid verdict.' };
      return res.redirect(`/judge/cases/${caseId}`);
    }

    if (!summary || !summary.trim() || !judgement_date) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.session.flash = { error: 'Please provide a judgement summary and judgement date.' };
      return res.redirect(`/judge/cases/${caseId}`);
    }

    const trimmedSummary = summary.trim();
    if (trimmedSummary.length > INPUT_LIMITS.JUDGEMENT_SUMMARY_MAX) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.session.flash = { error: `Judgement summary cannot exceed ${INPUT_LIMITS.JUDGEMENT_SUMMARY_MAX} characters.` };
      return res.redirect(`/judge/cases/${caseId}`);
    }

    // Check if judgement already issued
    const existingJudgement = await Judgement.getByCaseId(caseId);
    if (existingJudgement) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.session.flash = { error: 'A final judgement has already been issued for this case.' };
      return res.redirect(`/judge/cases/${caseId}`);
    }

    // Execute transactional judgement issuance + case closure + notifications (C-1)
    await Judgement.issueWithCaseClosure({
      caseId,
      judgeId,
      verdict,
      summary:       trimmedSummary,
      pdfName:       file ? file.originalname : null,
      pdfPath:       file ? file.path : null,
      judgementDate: judgement_date,
      caseNumber:    caseRecord.case_number,
      caseTitle:     caseRecord.title,
      prosecutorId:  caseRecord.prosecutor_id,
      advocateId:    caseRecord.advocate_id
    });

    req.session.flash = {
      success: `Final Judgement recorded successfully (Verdict: ${verdict}). Case status is now '${CASE_STATUSES.CLOSED}'.`
    };
    res.redirect(`/judge/cases/${caseId}`);
  } catch (err) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};
