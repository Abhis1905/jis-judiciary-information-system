'use strict';

const pool = require('../config/db');

/** Get all trial notes for a case (J2 Section C). */
exports.getByCaseId = async (caseId) => {
  const [rows] = await pool.query(`
    SELECT tn.*, u.full_name AS judge_name
    FROM   trial_notes tn
    JOIN   users       u ON tn.judge_id = u.id
    WHERE  tn.case_id = ?
    ORDER  BY tn.created_at DESC
  `, [caseId]);
  return rows;
};

/** Create a new trial note (Judge – J2 Section C). */
exports.create = async ({ caseId, judgeId, noteContent }) => {
  const [result] = await pool.query(
    'INSERT INTO trial_notes (case_id, judge_id, note_content) VALUES (?, ?, ?)',
    [caseId, judgeId, noteContent]
  );
  return result.insertId;
};
