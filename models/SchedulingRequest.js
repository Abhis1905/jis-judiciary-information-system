'use strict';

const pool = require('../config/db');

/** Get all scheduling requests for a case (A2 Section F). */
exports.getByCaseId = async (caseId) => {
  const [rows] = await pool.query(`
    SELECT sr.*, u.full_name AS advocate_name
    FROM   scheduling_requests sr
    JOIN   users               u ON sr.advocate_id = u.id
    WHERE  sr.case_id = ?
    ORDER  BY sr.created_at DESC
  `, [caseId]);
  return rows;
};

/** Create a new scheduling request (Advocate – A2 Section F). */
exports.create = async ({ caseId, advocateId, requestedDate, reason }) => {
  const [result] = await pool.query(`
    INSERT INTO scheduling_requests (case_id, advocate_id, requested_date, reason)
    VALUES (?, ?, ?, ?)
  `, [caseId, advocateId, requestedDate, reason]);
  return result.insertId;
};
