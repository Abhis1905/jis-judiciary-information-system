'use strict';

const pool = require('../config/db');

/** Count hearings scheduled for today (Registrar dashboard). */
exports.countToday = async () => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM hearings WHERE hearing_date = CURDATE()'
  );
  return rows[0].count;
};

/** Count hearings scheduled for this week (Registrar dashboard). */
exports.countThisWeek = async () => {
  const [rows] = await pool.query(`
    SELECT COUNT(*) AS count FROM hearings
    WHERE hearing_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      AND status = 'Scheduled'
  `);
  return rows[0].count;
};

/** Recent hearings – Registrar scheduling confirmation table (R4 Section B). */
exports.getRecent = async (limit = 10) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 200);
  const [rows] = await pool.query(`
    SELECT h.*, c.title AS case_title, c.case_number
    FROM   hearings h
    JOIN   cases    c ON h.case_id = c.id
    ORDER  BY h.hearing_date DESC, h.hearing_time DESC
    LIMIT  ?
  `, [safeLimit]);
  return rows;
};

/** All hearings with case details (R4 Hearing Management table). */
exports.getAllWithCaseDetails = async (limit = 250) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 250, 1), 500);
  const [rows] = await pool.query(`
    SELECT h.*, c.title AS case_title, c.case_number, c.case_type,
           j.full_name AS judge_name
    FROM   hearings h
    JOIN   cases    c ON h.case_id = c.id
    LEFT JOIN users j ON c.judge_id = j.id
    ORDER  BY h.hearing_date DESC, h.hearing_time DESC
    LIMIT  ?
  `, [safeLimit]);
  return rows;
};

/** All hearings for a specific case (case detail pages). */
exports.getByCaseId = async (caseId) => {
  const [rows] = await pool.query(
    'SELECT * FROM hearings WHERE case_id = ? ORDER BY hearing_date DESC, hearing_time DESC',
    [caseId]
  );
  return rows;
};

/** Upcoming hearings for a judge's assigned cases (Judge dashboard / J2). */
exports.getUpcomingByJudge = async (judgeId, days = 7, limit = 100) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const [rows] = await pool.query(`
    SELECT h.*, c.title AS case_title, c.case_number
    FROM   hearings h
    JOIN   cases    c ON h.case_id = c.id
    WHERE  c.judge_id = ?
      AND  h.hearing_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      AND  h.status = 'Scheduled'
    ORDER  BY h.hearing_date ASC, h.hearing_time ASC
    LIMIT  ?
  `, [judgeId, days, safeLimit]);
  return rows;
};

/** Upcoming hearings for a prosecutor's cases (Prosecutor dashboard). */
exports.getUpcomingByProsecutor = async (prosecutorId, days = 7, limit = 100) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const [rows] = await pool.query(`
    SELECT h.*, c.title AS case_title, c.case_number
    FROM   hearings h
    JOIN   cases    c ON h.case_id = c.id
    WHERE  c.prosecutor_id = ?
      AND  h.hearing_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      AND  h.status = 'Scheduled'
    ORDER  BY h.hearing_date ASC, h.hearing_time ASC
    LIMIT  ?
  `, [prosecutorId, days, safeLimit]);
  return rows;
};

/** Today's hearings for an advocate's linked cases (Advocate dashboard). */
exports.getTodayByAdvocate = async (advocateId, limit = 100) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const [rows] = await pool.query(`
    SELECT h.*, c.title AS case_title, c.case_number
    FROM   hearings h
    JOIN   cases    c ON h.case_id = c.id
    WHERE  c.advocate_id = ? AND h.hearing_date = CURDATE()
    ORDER  BY h.hearing_time ASC
    LIMIT  ?
  `, [advocateId, safeLimit]);
  return rows;
};

/** Upcoming hearings for an advocate's cases – full cause list (A3). */
exports.getUpcomingByAdvocate = async (advocateId, days = 7, limit = 100) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const [rows] = await pool.query(`
    SELECT h.*, c.title AS case_title, c.case_number
    FROM   hearings h
    JOIN   cases    c ON h.case_id = c.id
    WHERE  c.advocate_id = ?
      AND  h.hearing_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
    ORDER  BY h.hearing_date ASC, h.hearing_time ASC
    LIMIT  ?
  `, [advocateId, days, safeLimit]);
  return rows;
};

/** Create a new hearing (Registrar – R4 Section A). */
exports.create = async ({ caseId, hearingDate, hearingTime, courtRoom, hearingType, createdBy }) => {
  const [result] = await pool.query(`
    INSERT INTO hearings (case_id, hearing_date, hearing_time, court_room, hearing_type, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [caseId, hearingDate, hearingTime, courtRoom || null, hearingType, createdBy]);
  return result.insertId;
};

/**
 * Atomically create a hearing and notify Judge, Prosecutor, and Advocate inside a MySQL transaction (C-1).
 */
exports.scheduleWithNotifications = async ({
  caseId,
  hearingDate,
  hearingTime,
  courtRoom,
  hearingType,
  createdBy,
  caseNumber,
  caseTitle,
  judgeId,
  prosecutorId,
  advocateId
}) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(`
      INSERT INTO hearings (case_id, hearing_date, hearing_time, court_room, hearing_type, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [caseId, hearingDate, hearingTime, courtRoom || null, hearingType, createdBy]);

    const notifMsg = `A ${hearingType} has been scheduled for case ${caseNumber} ("${caseTitle}") on ${hearingDate} at ${hearingTime}${courtRoom ? ` in ${courtRoom}` : ''}.`;
    const recipients = [judgeId, prosecutorId, advocateId].filter(Boolean);
    for (const userId of recipients) {
      await conn.query(
        'INSERT INTO notifications (user_id, message, case_id) VALUES (?, ?, ?)',
        [userId, notifMsg, caseId]
      );
    }

    await conn.commit();
    return result.insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
