'use strict';

const pool = require('../config/db');
const { CASE_STATUSES } = require('../config/constants');

// ── Dashboard counts ────────────────────────────────────────────────

exports.countAll = async () => {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM cases');
  return rows[0].count;
};

exports.countPendingAllocation = async () => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM cases WHERE judge_id IS NULL AND status = ?',
    [CASE_STATUSES.FILED]
  );
  return rows[0].count;
};

exports.countByJudge = async (judgeId) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM cases WHERE judge_id = ?', [judgeId]
  );
  return rows[0].count;
};

exports.countByProsecutor = async (prosecutorId) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM cases WHERE prosecutor_id = ?', [prosecutorId]
  );
  return rows[0].count;
};

exports.countByAdvocate = async (advocateId) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM cases WHERE advocate_id = ?', [advocateId]
  );
  return rows[0].count;
};

// ── List queries (all bounded with pagination M-1, M-2, M-3) ────────

/** All cases with joined user and hierarchy names (Registrar – R2). */
exports.getAll = async (limit = 100, offset = 0) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const [rows] = await pool.query(`
    SELECT c.*,
           j.full_name AS judge_name,
           p.full_name AS prosecutor_name,
           s.name AS state_name,
           hc.name AS high_court_name,
           b.bench_name,
           d.district_name,
           cl.level_name AS court_level_name
    FROM   cases c
    LEFT JOIN users j ON c.judge_id      = j.id
    LEFT JOIN users p ON c.prosecutor_id = p.id
    LEFT JOIN states_uts s ON c.state_ut_id = s.id
    LEFT JOIN high_courts hc ON c.high_court_id = hc.id
    LEFT JOIN high_court_benches b ON c.bench_id = b.id
    LEFT JOIN districts d ON c.district_id = d.id
    LEFT JOIN court_levels cl ON c.court_level_id = cl.id
    ORDER  BY c.created_at DESC
    LIMIT  ? OFFSET ?
  `, [safeLimit, safeOffset]);
  return rows;
};

/** Cases assigned to a specific judge (J1) — bounded with pagination (M-2). */
exports.getByJudge = async (judgeId, limit = 100, offset = 0) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const [rows] = await pool.query(`
    SELECT c.*,
           p.full_name AS prosecutor_name,
           a.full_name AS advocate_name,
           s.name AS state_name,
           hc.name AS high_court_name,
           b.bench_name,
           d.district_name,
           cl.level_name AS court_level_name
    FROM   cases c
    LEFT JOIN users p ON c.prosecutor_id = p.id
    LEFT JOIN users a ON c.advocate_id   = a.id
    LEFT JOIN states_uts s ON c.state_ut_id = s.id
    LEFT JOIN high_courts hc ON c.high_court_id = hc.id
    LEFT JOIN high_court_benches b ON c.bench_id = b.id
    LEFT JOIN districts d ON c.district_id = d.id
    LEFT JOIN court_levels cl ON c.court_level_id = cl.id
    WHERE  c.judge_id = ?
    ORDER  BY c.updated_at DESC
    LIMIT  ? OFFSET ?
  `, [judgeId, safeLimit, safeOffset]);
  return rows;
};

/** Cases assigned to a specific prosecutor (P1) — bounded with pagination (M-2). */
exports.getByProsecutor = async (prosecutorId, limit = 100, offset = 0) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const [rows] = await pool.query(`
    SELECT c.*,
           j.full_name AS judge_name,
           s.name AS state_name,
           hc.name AS high_court_name,
           b.bench_name,
           d.district_name,
           cl.level_name AS court_level_name
    FROM   cases c
    LEFT JOIN users j ON c.judge_id = j.id
    LEFT JOIN states_uts s ON c.state_ut_id = s.id
    LEFT JOIN high_courts hc ON c.high_court_id = hc.id
    LEFT JOIN high_court_benches b ON c.bench_id = b.id
    LEFT JOIN districts d ON c.district_id = d.id
    LEFT JOIN court_levels cl ON c.court_level_id = cl.id
    WHERE  c.prosecutor_id = ?
    ORDER  BY c.updated_at DESC
    LIMIT  ? OFFSET ?
  `, [prosecutorId, safeLimit, safeOffset]);
  return rows;
};

/** Cases linked to a specific advocate via Vakalatnama (A1) — bounded with pagination (M-2). */
exports.getByAdvocate = async (advocateId, limit = 100, offset = 0) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const [rows] = await pool.query(`
    SELECT c.*,
           j.full_name AS judge_name,
           p.full_name AS prosecutor_name,
           s.name AS state_name,
           hc.name AS high_court_name,
           b.bench_name,
           d.district_name,
           cl.level_name AS court_level_name
    FROM   cases c
    LEFT JOIN users j ON c.judge_id      = j.id
    LEFT JOIN users p ON c.prosecutor_id = p.id
    LEFT JOIN states_uts s ON c.state_ut_id = s.id
    LEFT JOIN high_courts hc ON c.high_court_id = hc.id
    LEFT JOIN high_court_benches b ON c.bench_id = b.id
    LEFT JOIN districts d ON c.district_id = d.id
    LEFT JOIN court_levels cl ON c.court_level_id = cl.id
    WHERE  c.advocate_id = ?
    ORDER  BY c.updated_at DESC
    LIMIT  ? OFFSET ?
  `, [advocateId, safeLimit, safeOffset]);
  return rows;
};

/** Search unlinked cases available for Vakalatnama filing (A1 Section 2) — supports pagination & indexed search (M-3, M-4). */
exports.searchUnlinked = async (query = '', limit = 50, offset = 0) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  let sql = `
    SELECT c.*,
           j.full_name AS judge_name,
           s.name AS state_name,
           hc.name AS high_court_name,
           d.district_name
    FROM   cases c
    LEFT JOIN users j ON c.judge_id = j.id
    LEFT JOIN states_uts s ON c.state_ut_id = s.id
    LEFT JOIN high_courts hc ON c.high_court_id = hc.id
    LEFT JOIN districts d ON c.district_id = d.id
    WHERE  c.advocate_id IS NULL AND c.status != 'Closed'
  `;
  const params = [];

  if (query && query.trim()) {
    const q = query.trim();
    const ftTokens = q.replace(/[^\w\s]/g, ' ').trim().split(/\s+/).filter(t => t.length >= 3);
    if (q.includes('/')) {
      sql += ' AND (c.case_number LIKE ? OR c.title LIKE ?)';
      params.push(`${q}%`, `%${q}%`);
    } else if (ftTokens.length > 0) {
      const ftQuery = ftTokens.map(t => `+${t}*`).join(' ');
      sql += ' AND (c.case_number LIKE ? OR MATCH(c.title, c.petitioner_name, c.respondent_name) AGAINST(? IN BOOLEAN MODE))';
      params.push(`${q}%`, ftQuery);
    } else {
      sql += ' AND (c.case_number LIKE ? OR c.title LIKE ? OR c.petitioner_name LIKE ? OR c.respondent_name LIKE ?)';
      const like = `%${q}%`;
      params.push(`${q}%`, like, like, like);
    }
  }

  sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(safeLimit, safeOffset);
  const [rows] = await pool.query(sql, params);
  return rows;
};

/** Single case with all joined user and complete hierarchy names. */
exports.findById = async (id) => {
  const [rows] = await pool.query(`
    SELECT c.*,
           j.full_name AS judge_name,
           p.full_name AS prosecutor_name,
           a.full_name AS advocate_name,
           r.full_name AS filed_by_name,
           s.name AS state_name,
           s.type AS state_type,
           hc.name AS high_court_name,
           hc.principal_seat_city,
           b.bench_name,
           b.bench_type,
           b.city AS bench_city,
           d.district_name,
           d.district_code,
           d.headquarters AS district_hq,
           sc.court_name AS subordinate_court_name,
           sc.court_type AS subordinate_court_type,
           sc.location AS subordinate_court_location,
           cl.level_name AS court_level_name,
           cl.tier_order AS court_tier_order,
           cl.category AS court_level_category,
           cl.description AS court_level_description
    FROM   cases c
    LEFT JOIN users j ON c.judge_id      = j.id
    LEFT JOIN users p ON c.prosecutor_id = p.id
    LEFT JOIN users a ON c.advocate_id   = a.id
    LEFT JOIN users r ON c.filed_by      = r.id
    LEFT JOIN states_uts s ON c.state_ut_id = s.id
    LEFT JOIN high_courts hc ON c.high_court_id = hc.id
    LEFT JOIN high_court_benches b ON c.bench_id = b.id
    LEFT JOIN districts d ON c.district_id = d.id
    LEFT JOIN subordinate_courts sc ON c.subordinate_court_id = sc.id
    LEFT JOIN court_levels cl ON c.court_level_id = cl.id
    WHERE  c.id = ?
    LIMIT  1
  `, [id]);
  return rows[0] || null;
};

// ── Public search (Citizen – C1 Tab A) — supports pagination & indexed search (M-3, M-4) ──

exports.searchPublic = async (query, caseType, status, stateUtId, highCourtId, districtId, limit = 50, offset = 0) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  let sql = `
    SELECT c.id, c.case_number, c.title, c.case_type, c.description,
           c.petitioner_name, c.respondent_name, c.status, c.filing_date,
           s.name AS state_name, hc.name AS high_court_name, b.bench_name,
           d.district_name, sc.court_name AS subordinate_court_name,
           cl.level_name AS court_level_name,
           h.hearing_date AS next_hearing_date
    FROM   cases c
    LEFT JOIN states_uts s ON c.state_ut_id = s.id
    LEFT JOIN high_courts hc ON c.high_court_id = hc.id
    LEFT JOIN high_court_benches b ON c.bench_id = b.id
    LEFT JOIN districts d ON c.district_id = d.id
    LEFT JOIN subordinate_courts sc ON c.subordinate_court_id = sc.id
    LEFT JOIN court_levels cl ON c.court_level_id = cl.id
    LEFT JOIN hearings h ON h.id = (
      SELECT id FROM hearings
      WHERE  case_id = c.id
        AND  hearing_date >= CURDATE()
        AND  status = 'Scheduled'
      ORDER  BY hearing_date ASC LIMIT 1
    )
    WHERE  c.is_public = 1
  `;
  const params = [];

  if (query && query.trim()) {
    const q = query.trim();
    const ftTokens = q.replace(/[^\w\s]/g, ' ').trim().split(/\s+/).filter(t => t.length >= 3);
    if (q.includes('/')) {
      sql += ' AND (c.case_number LIKE ? OR c.title LIKE ?)';
      params.push(`${q}%`, `%${q}%`);
    } else if (ftTokens.length > 0) {
      const ftQuery = ftTokens.map(t => `+${t}*`).join(' ');
      sql += ' AND (c.case_number LIKE ? OR MATCH(c.title, c.petitioner_name, c.respondent_name) AGAINST(? IN BOOLEAN MODE))';
      params.push(`${q}%`, ftQuery);
    } else {
      sql += ' AND (c.case_number LIKE ? OR c.title LIKE ? OR c.petitioner_name LIKE ? OR c.respondent_name LIKE ?)';
      const like = `%${q}%`;
      params.push(`${q}%`, like, like, like);
    }
  }
  if (caseType)    { sql += ' AND c.case_type = ?';      params.push(caseType); }
  if (status)      { sql += ' AND c.status = ?';         params.push(status); }
  if (stateUtId)   { sql += ' AND c.state_ut_id = ?';    params.push(stateUtId); }
  if (highCourtId) { sql += ' AND c.high_court_id = ?';  params.push(highCourtId); }
  if (districtId)  { sql += ' AND c.district_id = ?';   params.push(districtId); }

  sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(safeLimit, safeOffset);
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.countSearchPublic = async (query, caseType, status, stateUtId, highCourtId, districtId) => {
  let sql = 'SELECT COUNT(*) AS count FROM cases c WHERE c.is_public = 1';
  const params = [];

  if (query && query.trim()) {
    const q = query.trim();
    const ftTokens = q.replace(/[^\w\s]/g, ' ').trim().split(/\s+/).filter(t => t.length >= 3);
    if (q.includes('/')) {
      sql += ' AND (c.case_number LIKE ? OR c.title LIKE ?)';
      params.push(`${q}%`, `%${q}%`);
    } else if (ftTokens.length > 0) {
      const ftQuery = ftTokens.map(t => `+${t}*`).join(' ');
      sql += ' AND (c.case_number LIKE ? OR MATCH(c.title, c.petitioner_name, c.respondent_name) AGAINST(? IN BOOLEAN MODE))';
      params.push(`${q}%`, ftQuery);
    } else {
      sql += ' AND (c.case_number LIKE ? OR c.title LIKE ? OR c.petitioner_name LIKE ? OR c.respondent_name LIKE ?)';
      const like = `%${q}%`;
      params.push(`${q}%`, like, like, like);
    }
  }
  if (caseType)    { sql += ' AND c.case_type = ?';      params.push(caseType); }
  if (status)      { sql += ' AND c.status = ?';         params.push(status); }
  if (stateUtId)   { sql += ' AND c.state_ut_id = ?';    params.push(stateUtId); }
  if (highCourtId) { sql += ' AND c.high_court_id = ?';  params.push(highCourtId); }
  if (districtId)  { sql += ' AND c.district_id = ?';   params.push(districtId); }

  const [[{ count }]] = await pool.query(sql, params);
  return count;
};

/** Closed public cases with judgements (C1 Tab B – Public Records) — supports pagination (M-3). */
exports.getPublicRecords = async (year, caseType, verdict, limit = 50, offset = 0) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  let sql = `
    SELECT c.id, c.case_number, c.title, c.case_type, c.description, c.status,
           c.petitioner_name, c.respondent_name, c.filing_date,
           s.name AS state_name, hc.name AS high_court_name, d.district_name,
           sc.court_name AS subordinate_court_name, cl.level_name AS court_level_name,
           j.verdict, j.summary AS judgement_summary, j.judgement_date
    FROM   cases c
    INNER  JOIN judgements j ON j.case_id = c.id
    LEFT JOIN states_uts s ON c.state_ut_id = s.id
    LEFT JOIN high_courts hc ON c.high_court_id = hc.id
    LEFT JOIN districts d ON c.district_id = d.id
    LEFT JOIN subordinate_courts sc ON c.subordinate_court_id = sc.id
    LEFT JOIN court_levels cl ON c.court_level_id = cl.id
    WHERE  c.is_public = 1 AND c.status = 'Closed'
  `;
  const params = [];

  if (year)     { sql += ' AND YEAR(j.judgement_date) = ?'; params.push(year); }
  if (caseType) { sql += ' AND c.case_type = ?';            params.push(caseType); }
  if (verdict)  { sql += ' AND j.verdict = ?';              params.push(verdict); }

  sql += ' ORDER BY j.judgement_date DESC LIMIT ? OFFSET ?';
  params.push(safeLimit, safeOffset);
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.countPublicRecords = async (year, caseType, verdict) => {
  let sql = `
    SELECT COUNT(*) AS count
    FROM   cases c
    INNER  JOIN judgements j ON j.case_id = c.id
    WHERE  c.is_public = 1 AND c.status = 'Closed'
  `;
  const params = [];

  if (year)     { sql += ' AND YEAR(j.judgement_date) = ?'; params.push(year); }
  if (caseType) { sql += ' AND c.case_type = ?';            params.push(caseType); }
  if (verdict)  { sql += ' AND j.verdict = ?';              params.push(verdict); }

  const [[{ count }]] = await pool.query(sql, params);
  return count;
};

// ── Mutations ───────────────────────────────────────────────────────

/** Create a new case (Registrar – R1). */
exports.create = async ({ caseNumber, title, caseType, petitionerName, respondentName,
                           description, isPublic, filedBy, filingDate,
                           stateUtId, highCourtId, benchId, districtId, subordinateCourtId, courtLevelId }) => {
  const [result] = await pool.query(`
    INSERT INTO cases
      (case_number, title, case_type, petitioner_name, respondent_name,
       description, is_public, filed_by, filing_date,
       state_ut_id, high_court_id, bench_id, district_id, subordinate_court_id, court_level_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [caseNumber, title, caseType, petitionerName, respondentName,
      description, isPublic ? 1 : 0, filedBy, filingDate,
      stateUtId || null, highCourtId || null, benchId || null,
      districtId || null, subordinateCourtId || null, courtLevelId || null]);
  return result.insertId;
};

/**
 * Assign a judge to a case (Registrar – R3 Section A).
 * The Registrar is the actor; JIS records the selection and updates status.
 */
exports.assignJudge = async (caseId, judgeId) => {
  await pool.query(
    'UPDATE cases SET judge_id = ?, status = ?, updated_at = NOW() WHERE id = ?',
    [judgeId, CASE_STATUSES.ALLOCATED, caseId]
  );
};

/**
 * Atomically assign a judge to a case and create an in-app notification inside a MySQL transaction (C-1).
 */
exports.assignJudgeWithNotification = async (caseId, judgeId, notificationMsg) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE cases
       SET judge_id = ?,
           status = CASE WHEN status = 'Filed' THEN 'Allocated' ELSE status END,
           updated_at = NOW()
       WHERE id = ?`,
      [judgeId, caseId]
    );

    if (notificationMsg) {
      await conn.query(
        'INSERT INTO notifications (user_id, message, case_id) VALUES (?, ?, ?)',
        [judgeId, notificationMsg, caseId]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/** Update case status (Judge – J2 Section B). */
exports.updateStatus = async (caseId, status) => {
  await pool.query(
    'UPDATE cases SET status = ?, updated_at = NOW() WHERE id = ?',
    [status, caseId]
  );
};

/**
 * Set advocate_id when a Vakalatnama is uploaded (A2 – Section B).
 * This is the ONLY mechanism for Advocate–Case association.
 */
exports.setAdvocate = async (caseId, advocateId) => {
  await pool.query(
    'UPDATE cases SET advocate_id = ?, updated_at = NOW() WHERE id = ?',
    [advocateId, caseId]
  );
};
