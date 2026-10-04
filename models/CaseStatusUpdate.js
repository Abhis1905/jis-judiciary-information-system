'use strict';

const pool = require('../config/db');

/** Get all status updates for a case (P2 Section C). */
exports.getByCaseId = async (caseId) => {
  const [rows] = await pool.query(`
    SELECT csu.*, u.full_name AS prosecutor_name
    FROM   case_status_updates csu
    JOIN   users               u ON csu.prosecutor_id = u.id
    WHERE  csu.case_id = ?
    ORDER  BY csu.created_at DESC
  `, [caseId]);
  return rows;
};

/** Get recent status updates submitted by a prosecutor (for dashboard). */
exports.getByProsecutor = async (prosecutorId, limit = 5) => {
  const [rows] = await pool.query(`
    SELECT csu.*, c.case_number, c.title AS case_title
    FROM   case_status_updates csu
    JOIN   cases               c ON csu.case_id = c.id
    WHERE  csu.prosecutor_id = ?
    ORDER  BY csu.created_at DESC
    LIMIT  ?
  `, [prosecutorId, limit]);
  return rows;
};

/** Create a new status update (Prosecutor – P2 Section C). */
exports.create = async ({ caseId, prosecutorId, updateDescription }) => {
  const [result] = await pool.query(`
    INSERT INTO case_status_updates (case_id, prosecutor_id, update_description)
    VALUES (?, ?, ?)
  `, [caseId, prosecutorId, updateDescription]);
  return result.insertId;
};
