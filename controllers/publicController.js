'use strict';

const Case      = require('../models/Case');
const Hierarchy = require('../models/Hierarchy');
const CaseLegalIntegration = require('../models/CaseLegalIntegration');
const CaseAppeal = require('../models/CaseAppeal');
const pool      = require('../config/db');

/** GET / and GET /search – C1 Case Search & Public Records (with pagination M-3) */
exports.getHome = async (req, res, next) => {
  try {
    const { q, caseType, status, stateUtId, highCourtId, districtId, year, recType, verdict, recPage } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const recordPage = Math.max(1, parseInt(recPage, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const offset = (page - 1) * limit;
    const recOffset = (recordPage - 1) * limit;

    const hasSearch = Boolean(q || caseType || status || stateUtId || highCourtId || districtId);

    const [results, totalResults, publicRecords, totalPublicRecords, states, highCourts] = await Promise.all([
      hasSearch ? Case.searchPublic(q, caseType, status, stateUtId, highCourtId, districtId, limit, offset) : Promise.resolve([]),
      hasSearch ? Case.countSearchPublic(q, caseType, status, stateUtId, highCourtId, districtId) : Promise.resolve(0),
      Case.getPublicRecords(year, recType, verdict, limit, recOffset),
      Case.countPublicRecords(year, recType, verdict),
      Hierarchy.getAllStates(),
      Hierarchy.getAllHighCourts()
    ]);

    res.render('public/home', {
      title: 'JIS – Judiciary Info System',
      results,
      publicRecords,
      states,
      highCourts,
      query: req.query,
      hasSearch,
      pagination: {
        page,
        limit,
        totalResults,
        totalSearchPages: Math.max(1, Math.ceil(totalResults / limit)),
        recordPage,
        totalPublicRecords,
        totalRecordPages: Math.max(1, Math.ceil(totalPublicRecords / limit))
      }
    });
  } catch (err) {
    next(err);
  }
};

/** GET /case/:id – C2 Case Status (anonymous, is_public only) */
exports.getCaseStatus = async (req, res, next) => {
  try {
    const caseRecord = await Case.findById(req.params.id);

    // Enforce is_public — non-public or missing cases return 404
    if (!caseRecord || !caseRecord.is_public) {
      return res.status(404).render('errors/404', {
        title: 'Record Not Available – JIS',
        message: 'This case record is not publicly available or does not exist.'
      });
    }

    // Next scheduled hearing
    const [hearingRows] = await pool.query(`
      SELECT hearing_date, hearing_time, court_room, hearing_type, status FROM hearings
      WHERE  case_id = ? AND hearing_date >= CURDATE() AND status = 'Scheduled'
      ORDER  BY hearing_date ASC LIMIT 1
    `, [req.params.id]);
    const nextHearing = hearingRows[0] || null;

    // Complete hearing timeline for this case
    const [allHearings] = await pool.query(`
      SELECT id, hearing_date, hearing_time, court_room, hearing_type, status
      FROM   hearings
      WHERE  case_id = ?
      ORDER  BY hearing_date DESC, hearing_time DESC
    `, [req.params.id]);

    // Final judgement (only if case is Closed)
    let judgement = null;
    if (caseRecord.status === 'Closed') {
      const [jRows] = await pool.query(
        'SELECT verdict, summary, judgement_date FROM judgements WHERE case_id = ? LIMIT 1',
        [req.params.id]
      );
      judgement = jRows[0] || null;
    }

    // Data-driven statutory appellate pathway, legal sections, verified precedents, framework, and appeal history
    const [appellateChain, legalSections, legalJudgments, appealHistory] = await Promise.all([
      Hierarchy.getFullAppellateChain(caseRecord.case_type, caseRecord.court_level_id),
      CaseLegalIntegration.getSectionsForCase(req.params.id),
      CaseLegalIntegration.getJudgmentsForCase(req.params.id, { publicOnly: true }),
      CaseAppeal.getAppealHistory(req.params.id)
    ]);
    const legalFramework = CaseLegalIntegration.getLegalFrameworkForCase(caseRecord);

    res.render('public/caseStatus', {
      title: `Case ${caseRecord.case_number} – JIS`,
      caseRecord,
      nextHearing,
      allHearings,
      judgement,
      appellateChain,
      legalSections,
      legalJudgments,
      legalFramework,
      appealHistory,
      canEditLegalSections: false,
      canFileAppeal: false,
      isPublic: true
    });
  } catch (err) {
    next(err);
  }
};

/** GET /notices – C3 Court Notices (anonymous) */
exports.getNotices = async (req, res, next) => {
  try {
    const [notices] = await pool.query(`
      SELECT n.*, c.title AS case_title, c.case_number
      FROM   court_notices n
      LEFT JOIN cases c ON n.case_id = c.id
      WHERE  (c.id IS NULL OR c.is_public = 1)
      ORDER  BY n.date_issued DESC
      LIMIT  50
    `);
    res.render('public/notices', {
      title: 'Court Notices – JIS',
      notices
    });
  } catch (err) {
    next(err);
  }
};
