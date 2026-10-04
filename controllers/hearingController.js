'use strict';

const Hearing = require('../models/Hearing');
const Case    = require('../models/Case');
const {
  HEARING_TYPES,
  CASE_STATUSES,
  INPUT_LIMITS
} = require('../config/constants');

/**
 * GET /registrar/hearings
 * R4 – Hearing Management
 * Displays scheduling form and list of scheduled hearings.
 */
exports.getHearings = async (req, res, next) => {
  try {
    const selectedCaseId = req.query.case_id ? parseInt(req.query.case_id, 10) : null;
    const todayStr = new Date().toISOString().split('T')[0];

    const [cases, hearings] = await Promise.all([
      Case.getAll(200, 0),
      Hearing.getAllWithCaseDetails(250)
    ]);

    res.render('registrar/hearings', {
      title: 'Hearing Management – JIS',
      cases,
      hearings,
      selectedCaseId,
      todayStr
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /registrar/hearings
 * R4 Section A – Schedule a Hearing
 * - Enforces server-side hearing date validation against past dates (M-8)
 * - Enforces input length limits (M-12)
 * - Atomically creates hearing and generates notifications inside a transaction (C-1)
 */
exports.postScheduleHearing = async (req, res, next) => {
  try {
    const { case_id, hearing_date, hearing_time, court_room, hearing_type } = req.body;

    if (!case_id || !hearing_date || !hearing_time || !hearing_type) {
      req.session.flash = { error: 'Please fill in all required fields (Case, Date, Time, Type).' };
      return res.redirect('/registrar/hearings');
    }

    const caseId = parseInt(case_id, 10);
    if (isNaN(caseId)) {
      req.session.flash = { error: 'Invalid case selected.' };
      return res.redirect('/registrar/hearings');
    }

    if (!HEARING_TYPES.includes(hearing_type)) {
      req.session.flash = { error: 'Invalid hearing type selected.' };
      return res.redirect('/registrar/hearings');
    }

    // Server-side date validation (M-8)
    const dateStr = String(hearing_date).trim();
    const todayStr = new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || isNaN(new Date(dateStr).getTime())) {
      req.session.flash = { error: 'Invalid hearing date format.' };
      return res.redirect('/registrar/hearings');
    }
    if (dateStr < todayStr) {
      req.session.flash = { error: 'Hearing date cannot be scheduled in the past.' };
      return res.redirect('/registrar/hearings');
    }

    const trimmedRoom = court_room ? String(court_room).trim() : null;
    if (trimmedRoom && trimmedRoom.length > INPUT_LIMITS.COURT_ROOM_MAX) {
      req.session.flash = { error: `Court room name cannot exceed ${INPUT_LIMITS.COURT_ROOM_MAX} characters.` };
      return res.redirect('/registrar/hearings');
    }

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord) {
      req.session.flash = { error: 'The selected case record does not exist.' };
      return res.redirect('/registrar/hearings');
    }

    if (caseRecord.status === CASE_STATUSES.CLOSED) {
      req.session.flash = { error: 'Cannot schedule a hearing for a Closed case.' };
      return res.redirect('/registrar/hearings');
    }

    // Atomically create hearing and send notifications inside a transaction (C-1)
    await Hearing.scheduleWithNotifications({
      caseId,
      hearingDate:  dateStr,
      hearingTime:  hearing_time,
      courtRoom:    trimmedRoom,
      hearingType:  hearing_type,
      createdBy:    req.session.user.id,
      caseNumber:   caseRecord.case_number,
      caseTitle:    caseRecord.title,
      judgeId:      caseRecord.judge_id,
      prosecutorId: caseRecord.prosecutor_id,
      advocateId:   caseRecord.advocate_id
    });

    req.session.flash = {
      success: `Hearing scheduled successfully for Case ${caseRecord.case_number} on ${dateStr} at ${hearing_time}. Notifications sent to assigned parties.`
    };
    res.redirect('/registrar/hearings');
  } catch (err) {
    next(err);
  }
};
