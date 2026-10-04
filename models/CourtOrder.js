'use strict';

const pool = require('../config/db');

/** Get all court orders for a case (A2 Section E). */
exports.getByCaseId = async (caseId) => {
  const [rows] = await pool.query(`
    SELECT co.*, u.full_name AS judge_name
    FROM   court_orders co
    JOIN   users        u ON co.created_by = u.id
    WHERE  co.case_id = ?
    ORDER  BY co.order_date DESC, co.created_at DESC
  `, [caseId]);
  return rows;
};

/** Get court order by ID (for download/view). */
exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM court_orders WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};
