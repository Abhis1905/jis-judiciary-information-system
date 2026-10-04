'use strict';

const pool = require('../config/db');

/** Get all pleadings for a case (A2 Section D). */
exports.getByCaseId = async (caseId) => {
  const [rows] = await pool.query(`
    SELECT p.*, u.full_name AS advocate_name
    FROM   pleadings p
    JOIN   users     u ON p.advocate_id = u.id
    WHERE  p.case_id = ?
    ORDER  BY p.created_at DESC
  `, [caseId]);
  return rows;
};

/** Get pleading by ID (for download/view). */
exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM pleadings WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};

/** Create a new pleading record (Advocate – A2 Section D). */
exports.create = async ({ caseId, advocateId, pleadingType, originalName, fileName, filePath, mimeType, description }) => {
  const [result] = await pool.query(`
    INSERT INTO pleadings
      (case_id, advocate_id, pleading_type, original_name, file_name, file_path, mime_type, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [caseId, advocateId, pleadingType, originalName, fileName, filePath, mimeType, description || null]);
  return result.insertId;
};
