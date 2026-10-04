'use strict';

const pool = require('../config/db');

/** Get Vakalatnama for a case (A2 Section B). */
exports.getByCaseId = async (caseId) => {
  const [rows] = await pool.query(`
    SELECT v.*, u.full_name AS advocate_name
    FROM   vakalatnamas v
    JOIN   users        u ON v.advocate_id = u.id
    WHERE  v.case_id = ?
    LIMIT  1
  `, [caseId]);
  return rows[0] || null;
};

/** Get Vakalatnama by ID (for download/view). */
exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM vakalatnamas WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};

/** Create a new Vakalatnama record (Advocate – A2 Section B). */
exports.create = async ({ caseId, advocateId, clientName, originalName, fileName, filePath, mimeType }) => {
  const [result] = await pool.query(`
    INSERT INTO vakalatnamas
      (case_id, advocate_id, client_name, original_name, file_name, file_path, mime_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [caseId, advocateId, clientName, originalName, fileName, filePath, mimeType]);
  return result.insertId;
};

/**
 * Atomically insert Vakalatnama, link advocate to case, and notify Registrar/Judge inside a MySQL transaction (C-1).
 */
exports.uploadAndLinkAdvocate = async ({
  caseId,
  advocateId,
  advocateName,
  clientName,
  originalName,
  fileName,
  filePath,
  mimeType,
  caseNumber,
  filedBy,
  judgeId
}) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(`
      INSERT INTO vakalatnamas
        (case_id, advocate_id, client_name, original_name, file_name, file_path, mime_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [caseId, advocateId, clientName, originalName, fileName, filePath, mimeType]);

    await conn.query(
      'UPDATE cases SET advocate_id = ? WHERE id = ?',
      [advocateId, caseId]
    );

    const notifMsg = `Advocate ${advocateName} has filed a Vakalatnama for client "${clientName}" in case ${caseNumber}.`;
    if (filedBy) {
      await conn.query(
        'INSERT INTO notifications (user_id, message, case_id) VALUES (?, ?, ?)',
        [filedBy, notifMsg, caseId]
      );
    }
    if (judgeId && judgeId !== filedBy) {
      await conn.query(
        'INSERT INTO notifications (user_id, message, case_id) VALUES (?, ?, ?)',
        [judgeId, notifMsg, caseId]
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
