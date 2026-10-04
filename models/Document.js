'use strict';

const pool = require('../config/db');

/** All documents for a case (Registrar R3 Section B, Judge J2). */
exports.getByCaseId = async (caseId) => {
  const [rows] = await pool.query(
    'SELECT * FROM documents WHERE case_id = ? ORDER BY created_at DESC',
    [caseId]
  );
  return rows;
};

/** Single document by ID (S3 – Document Viewer access check). */
exports.findById = async (id) => {
  const [rows] = await pool.query(
    'SELECT * FROM documents WHERE id = ? LIMIT 1', [id]
  );
  return rows[0] || null;
};

/** Create a document record after Multer upload (Registrar – R3 Section B). */
exports.create = async ({ caseId, uploadedBy, documentType, originalName,
                           fileName, filePath, mimeType, description }) => {
  const [result] = await pool.query(`
    INSERT INTO documents
      (case_id, uploaded_by, document_type, original_name, file_name, file_path, mime_type, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [caseId, uploadedBy, documentType, originalName, fileName, filePath, mimeType, description || null]);
  return result.insertId;
};
