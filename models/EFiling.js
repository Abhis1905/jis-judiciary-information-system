'use strict';

const pool = require('../config/db');

/** Get all E-Filings for a case (A2 Section C). */
exports.getByCaseId = async (caseId) => {
  const [rows] = await pool.query(`
    SELECT ef.*, u.full_name AS advocate_name
    FROM   efilings ef
    JOIN   users    u ON ef.advocate_id = u.id
    WHERE  ef.case_id = ?
    ORDER  BY ef.created_at DESC
  `, [caseId]);
  return rows;
};

/** Get E-Filing by ID (for download/view). */
exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM efilings WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};

/** Create a new E-Filing record (Advocate – A2 Section C). */
exports.create = async ({ caseId, advocateId, filingType, originalName, fileName, filePath, mimeType, description }) => {
  const [result] = await pool.query(`
    INSERT INTO efilings
      (case_id, advocate_id, filing_type, original_name, file_name, file_path, mime_type, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [caseId, advocateId, filingType, originalName, fileName, filePath, mimeType, description || null]);
  return result.insertId;
};
