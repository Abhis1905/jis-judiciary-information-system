'use strict';

const pool = require('../config/db');
const { CASE_STATUSES } = require('../config/constants');

/** Get judgement for a case (J2 Section C, C2 public view). */
exports.getByCaseId = async (caseId) => {
  const [rows] = await pool.query(
    'SELECT * FROM judgements WHERE case_id = ? LIMIT 1', [caseId]
  );
  return rows[0] || null;
};

/** Get judgement by ID. */
exports.findById = async (id) => {
  const [rows] = await pool.query(
    'SELECT * FROM judgements WHERE id = ? LIMIT 1', [id]
  );
  return rows[0] || null;
};

/** Issue a final judgement (Judge – J2 Section C). */
exports.create = async ({ caseId, judgeId, verdict, summary, pdfName, pdfPath, judgementDate }) => {
  const [result] = await pool.query(`
    INSERT INTO judgements (case_id, judge_id, verdict, summary, pdf_name, pdf_path, judgement_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [caseId, judgeId, verdict, summary, pdfName || null, pdfPath || null, judgementDate]);
  return result.insertId;
};

/**
 * Atomically issue a final judgement, close the case, and generate notifications inside a MySQL transaction (C-1).
 */
exports.issueWithCaseClosure = async ({
  caseId,
  judgeId,
  verdict,
  summary,
  pdfName,
  pdfPath,
  judgementDate,
  caseNumber,
  caseTitle,
  prosecutorId,
  advocateId
}) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(`
      INSERT INTO judgements (case_id, judge_id, verdict, summary, pdf_name, pdf_path, judgement_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [caseId, judgeId, verdict, summary, pdfName || null, pdfPath || null, judgementDate]);

    await conn.query(
      'UPDATE cases SET status = ? WHERE id = ?',
      [CASE_STATUSES.CLOSED, caseId]
    );

    const notifMessage = `Final judgement (${verdict}) has been issued for case ${caseNumber} – "${caseTitle}". Case is now Closed.`;
    if (prosecutorId) {
      await conn.query(
        'INSERT INTO notifications (user_id, message, case_id) VALUES (?, ?, ?)',
        [prosecutorId, notifMessage, caseId]
      );
    }
    if (advocateId) {
      await conn.query(
        'INSERT INTO notifications (user_id, message, case_id) VALUES (?, ?, ?)',
        [advocateId, notifMessage, caseId]
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
