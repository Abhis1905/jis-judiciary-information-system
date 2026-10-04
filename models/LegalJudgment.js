'use strict';

const db = require('../config/db');

class LegalJudgment {
  static async getById(id) {
    const [rows] = await db.query(
      `SELECT lj.*, 
              hc.name as high_court_name, hc.code as high_court_code, hc.principal_seat_city, hc.established_year as hc_established_year,
              hcb.bench_name, hcb.city as bench_city, hcb.bench_type,
              d.district_name,
              (SELECT GROUP_CONCAT(su.name ORDER BY hcj.is_primary DESC, su.name ASC SEPARATOR ', ')
               FROM high_court_jurisdictions hcj
               JOIN states_uts su ON hcj.state_ut_id = su.id
               WHERE hcj.high_court_id = lj.high_court_id) AS hc_jurisdiction_states
       FROM legal_judgments lj
       LEFT JOIN high_courts hc ON lj.high_court_id = hc.id
       LEFT JOIN high_court_benches hcb ON lj.bench_id = hcb.id
       LEFT JOIN districts d ON lj.district_id = d.id
       WHERE lj.id = ? AND lj.is_synthetic = 0 AND lj.record_provenance = 'REAL_VERIFIED'`,
      [id]
    );

    if (rows.length === 0) return null;
    const judgment = rows[0];

    // Citations
    const [citations] = await db.query(
      'SELECT reporter_name, citation_value FROM judgment_citations WHERE judgment_id = ?',
      [id]
    );
    judgment.citations = citations;

    // Linked sections
    const [sections] = await db.query(
      `SELECT ls.id as section_id, ls.section_number, ls.section_title, ls.legal_nature, ls.status as section_status,
              la.id as act_id, la.act_code, la.short_title as act_title, la.title as act_full_title, la.status as act_status,
              jls.relevance_nature
       FROM judgment_legal_sections jls
       JOIN legal_sections ls ON jls.section_id = ls.id
       JOIN legal_acts la ON ls.act_id = la.id
       WHERE jls.judgment_id = ?
       ORDER BY la.id ASC, ls.section_order ASC`,
      [id]
    );
    judgment.linked_sections = sections;

    // Verified PDF documents
    const [documents] = await db.query(
      `SELECT id, judgment_id, document_type, original_filename, storage_path,
              source_url, source_name, file_size_bytes, checksum, is_verified, uploaded_at
       FROM judgment_documents
       WHERE judgment_id = ? AND is_verified = 1
       ORDER BY id ASC`,
      [id]
    );
    judgment.documents = documents;
    judgment.primaryDocument = documents[0] || null;

    // Genuinely related REAL_VERIFIED judgments (sharing statutory sections or same constitutional/legal domain)
    const [related] = await db.query(
      `SELECT lj2.id, lj2.case_name, lj2.citation, lj2.neutral_citation, lj2.case_number,
              lj2.judgment_date, lj2.court_tier, lj2.court_name, lj2.domain, lj2.outcome,
              lj2.legal_issue, lj2.key_holding, lj2.key_ratio, lj2.bench_judges,
              (SELECT COUNT(*) FROM judgment_documents jd WHERE jd.judgment_id = lj2.id AND jd.is_verified = 1) AS has_verified_pdf,
              MAX(CASE WHEN jls2.section_id IS NOT NULL THEN 1 ELSE 0 END) AS shared_section
       FROM legal_judgments lj2
       LEFT JOIN judgment_legal_sections jls2
         ON lj2.id = jls2.judgment_id
         AND jls2.section_id IN (SELECT section_id FROM judgment_legal_sections WHERE judgment_id = ?)
       WHERE lj2.id != ?
         AND lj2.is_synthetic = 0
         AND lj2.record_provenance = 'REAL_VERIFIED'
         AND (jls2.section_id IS NOT NULL OR lj2.domain = ?)
       GROUP BY lj2.id
       ORDER BY shared_section DESC, has_verified_pdf DESC, lj2.is_landmark DESC, lj2.judgment_date DESC
       LIMIT 4`,
      [id, id, judgment.domain]
    );
    judgment.related_judgments = related;

    return judgment;
  }

  static async getVerifiedDocumentForJudgment(judgmentId) {
    const [rows] = await db.query(
      `SELECT jd.*, lj.case_name, lj.citation, lj.is_synthetic, lj.record_provenance
       FROM judgment_documents jd
       JOIN legal_judgments lj ON jd.judgment_id = lj.id
       WHERE jd.judgment_id = ?
         AND jd.is_verified = 1
         AND lj.is_synthetic = 0
         AND lj.record_provenance = 'REAL_VERIFIED'
       ORDER BY jd.id ASC
       LIMIT 1`,
      [judgmentId]
    );
    return rows[0] || null;
  }

  static async getSupremeCourtJudgments(filter = {}) {
    let query = `
      SELECT lj.*,
             (SELECT COUNT(*) FROM judgment_documents jd WHERE jd.judgment_id = lj.id AND jd.is_verified = 1) AS has_verified_pdf,
             (SELECT jd.file_size_bytes FROM judgment_documents jd WHERE jd.judgment_id = lj.id AND jd.is_verified = 1 ORDER BY jd.id ASC LIMIT 1) AS pdf_file_size_bytes,
             (SELECT GROUP_CONCAT(CONCAT(la.short_title, ' ', CASE WHEN la.act_code = 'CONST_1950' THEN ls.section_number ELSE CONCAT('Sec ', ls.section_number) END) ORDER BY la.id ASC, ls.section_order ASC SEPARATOR ' • ')
              FROM judgment_legal_sections jls
              JOIN legal_sections ls ON jls.section_id = ls.id
              JOIN legal_acts la ON ls.act_id = la.id
              WHERE jls.judgment_id = lj.id) AS linked_provisions_summary
      FROM legal_judgments lj
      WHERE lj.court_tier = 'Supreme Court of India'
        AND lj.is_synthetic = 0
        AND lj.record_provenance = 'REAL_VERIFIED'
    `;
    const params = [];

    if (filter.domain) {
      query += ' AND lj.domain = ?';
      params.push(filter.domain);
    }
    if (filter.year) {
      query += ' AND YEAR(lj.judgment_date) = ?';
      params.push(filter.year);
    }
    if (filter.pdf_only === '1' || filter.pdf_only === 'true') {
      query += ' AND EXISTS (SELECT 1 FROM judgment_documents jd WHERE jd.judgment_id = lj.id AND jd.is_verified = 1)';
    }
    if (filter.search && filter.search.trim()) {
      const s = filter.search.trim().slice(0, 200);
      query += ' AND (lj.case_name LIKE ? OR lj.citation LIKE ? OR lj.neutral_citation LIKE ? OR lj.case_number LIKE ? OR lj.legal_issue LIKE ? OR lj.key_ratio LIKE ? OR lj.key_holding LIKE ? OR lj.keywords LIKE ?)';
      params.push(`%${s}%`, `%${s}%`, `%${s}%`, `%${s}%`, `%${s}%`, `%${s}%`, `%${s}%`, `%${s}%`);
    }

    query += ' ORDER BY has_verified_pdf DESC, lj.judgment_date DESC, lj.id ASC';

    const page = Math.max(1, Math.min(10000, parseInt(filter.page || 1, 10) || 1));
    const limit = Math.max(1, Math.min(100, parseInt(filter.limit || 20, 10) || 20));
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as count FROM (${query}) as total`;
    const [[{ count }]] = await db.query(countQuery, params);

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.query(query, params);
    return {
      judgments: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  static async getHighCourtJudgments(filter = {}) {
    let query = `
      SELECT lj.*, hc.name as high_court_name, hc.code as high_court_code, hc.principal_seat_city, hcb.bench_name,
             (SELECT GROUP_CONCAT(su.name ORDER BY hcj.is_primary DESC, su.name ASC SEPARATOR ', ')
              FROM high_court_jurisdictions hcj
              JOIN states_uts su ON hcj.state_ut_id = su.id
              WHERE hcj.high_court_id = lj.high_court_id) AS hc_jurisdiction_states,
             (SELECT COUNT(*) FROM judgment_documents jd WHERE jd.judgment_id = lj.id AND jd.is_verified = 1) AS has_verified_pdf,
             (SELECT jd.file_size_bytes FROM judgment_documents jd WHERE jd.judgment_id = lj.id AND jd.is_verified = 1 ORDER BY jd.id ASC LIMIT 1) AS pdf_file_size_bytes,
             (SELECT GROUP_CONCAT(CONCAT(la.short_title, ' ', CASE WHEN la.act_code = 'CONST_1950' THEN ls.section_number ELSE CONCAT('Sec ', ls.section_number) END) ORDER BY la.id ASC, ls.section_order ASC SEPARATOR ' • ')
              FROM judgment_legal_sections jls
              JOIN legal_sections ls ON jls.section_id = ls.id
              JOIN legal_acts la ON ls.act_id = la.id
              WHERE jls.judgment_id = lj.id) AS linked_provisions_summary
      FROM legal_judgments lj
      LEFT JOIN high_courts hc ON lj.high_court_id = hc.id
      LEFT JOIN high_court_benches hcb ON lj.bench_id = hcb.id
      WHERE lj.court_tier = 'High Court'
        AND lj.is_synthetic = 0
        AND lj.record_provenance = 'REAL_VERIFIED'
    `;
    const params = [];

    if (filter.high_court_id) {
      query += ' AND lj.high_court_id = ?';
      params.push(filter.high_court_id);
    }
    if (filter.domain) {
      query += ' AND lj.domain = ?';
      params.push(filter.domain);
    }
    if (filter.year) {
      query += ' AND YEAR(lj.judgment_date) = ?';
      params.push(filter.year);
    }
    if (filter.pdf_only === '1' || filter.pdf_only === 'true') {
      query += ' AND EXISTS (SELECT 1 FROM judgment_documents jd WHERE jd.judgment_id = lj.id AND jd.is_verified = 1)';
    }
    if (filter.search && filter.search.trim()) {
      const s = filter.search.trim().slice(0, 200);
      query += ' AND (lj.case_name LIKE ? OR lj.citation LIKE ? OR lj.neutral_citation LIKE ? OR lj.case_number LIKE ? OR lj.legal_issue LIKE ? OR lj.key_ratio LIKE ? OR lj.key_holding LIKE ? OR lj.keywords LIKE ? OR lj.court_name LIKE ?)';
      params.push(`%${s}%`, `%${s}%`, `%${s}%`, `%${s}%`, `%${s}%`, `%${s}%`, `%${s}%`, `%${s}%`, `%${s}%`);
    }

    query += ' ORDER BY lj.judgment_date DESC, lj.id ASC';

    const page = Math.max(1, Math.min(10000, parseInt(filter.page || 1, 10) || 1));
    const limit = Math.max(1, Math.min(100, parseInt(filter.limit || 20, 10) || 20));
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as count FROM (${query}) as total`;
    const [[{ count }]] = await db.query(countQuery, params);

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.query(query, params);
    return {
      judgments: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  static async getRecentLandmarks(limit = 6) {
    const safeLimit = Math.max(1, Math.min(50, parseInt(limit || 6, 10) || 6));
    const [rows] = await db.query(
      `SELECT lj.*, hc.name as high_court_name, hc.principal_seat_city,
              (SELECT GROUP_CONCAT(su.name ORDER BY hcj.is_primary DESC, su.name ASC SEPARATOR ', ')
               FROM high_court_jurisdictions hcj
               JOIN states_uts su ON hcj.state_ut_id = su.id
               WHERE hcj.high_court_id = lj.high_court_id) AS hc_jurisdiction_states,
              (SELECT COUNT(*) FROM judgment_documents jd WHERE jd.judgment_id = lj.id AND jd.is_verified = 1) AS has_verified_pdf,
              (SELECT jd.file_size_bytes FROM judgment_documents jd WHERE jd.judgment_id = lj.id AND jd.is_verified = 1 ORDER BY jd.id ASC LIMIT 1) AS pdf_file_size_bytes,
              (SELECT GROUP_CONCAT(CONCAT(la.short_title, ' ', CASE WHEN la.act_code = 'CONST_1950' THEN ls.section_number ELSE CONCAT('Sec ', ls.section_number) END) ORDER BY la.id ASC, ls.section_order ASC SEPARATOR ' • ')
               FROM judgment_legal_sections jls
               JOIN legal_sections ls ON jls.section_id = ls.id
               JOIN legal_acts la ON ls.act_id = la.id
               WHERE jls.judgment_id = lj.id) AS linked_provisions_summary
       FROM legal_judgments lj
       LEFT JOIN high_courts hc ON lj.high_court_id = hc.id
       WHERE lj.is_landmark = 1
         AND lj.is_synthetic = 0
         AND lj.record_provenance = 'REAL_VERIFIED'
       ORDER BY has_verified_pdf DESC, (lj.court_reasoning IS NOT NULL) DESC, lj.judgment_date DESC
       LIMIT ?`,
      [safeLimit]
    );
    return rows;
  }

  static async getRecentVerifiedJudgments(limit = 6) {
    const safeLimit = Math.max(1, Math.min(50, parseInt(limit || 6, 10) || 6));
    const [rows] = await db.query(
      `SELECT lj.*, hc.name as high_court_name, hc.principal_seat_city,
              (SELECT GROUP_CONCAT(su.name ORDER BY hcj.is_primary DESC, su.name ASC SEPARATOR ', ')
               FROM high_court_jurisdictions hcj
               JOIN states_uts su ON hcj.state_ut_id = su.id
               WHERE hcj.high_court_id = lj.high_court_id) AS hc_jurisdiction_states,
              (SELECT COUNT(*) FROM judgment_documents jd WHERE jd.judgment_id = lj.id AND jd.is_verified = 1) AS has_verified_pdf,
              (SELECT jd.file_size_bytes FROM judgment_documents jd WHERE jd.judgment_id = lj.id AND jd.is_verified = 1 ORDER BY jd.id ASC LIMIT 1) AS pdf_file_size_bytes,
              (SELECT GROUP_CONCAT(CONCAT(la.short_title, ' ', CASE WHEN la.act_code = 'CONST_1950' THEN ls.section_number ELSE CONCAT('Sec ', ls.section_number) END) ORDER BY la.id ASC, ls.section_order ASC SEPARATOR ' • ')
               FROM judgment_legal_sections jls
               JOIN legal_sections ls ON jls.section_id = ls.id
               JOIN legal_acts la ON ls.act_id = la.id
               WHERE jls.judgment_id = lj.id) AS linked_provisions_summary
       FROM legal_judgments lj
       LEFT JOIN high_courts hc ON lj.high_court_id = hc.id
       WHERE lj.is_synthetic = 0
         AND lj.record_provenance = 'REAL_VERIFIED'
       ORDER BY lj.judgment_date DESC, lj.id DESC
       LIMIT ?`,
      [safeLimit]
    );
    return rows;
  }

  static async universalSearch(queryStr, options = {}) {
    const safeStr = (queryStr || '').trim().slice(0, 200);
    const term = `%${safeStr}%`;
    const page = Math.max(1, Math.min(1000, parseInt(options.page || 1, 10) || 1));
    const limit = Math.max(1, Math.min(100, parseInt(options.limit || 20, 10) || 20));
    const offset = (page - 1) * limit;

    let jQuery = `
      SELECT lj.*, hc.name as high_court_name, hc.principal_seat_city,
             (SELECT GROUP_CONCAT(su.name ORDER BY hcj.is_primary DESC, su.name ASC SEPARATOR ', ')
              FROM high_court_jurisdictions hcj
              JOIN states_uts su ON hcj.state_ut_id = su.id
              WHERE hcj.high_court_id = lj.high_court_id) AS hc_jurisdiction_states,
             (SELECT COUNT(*) FROM judgment_documents jd WHERE jd.judgment_id = lj.id AND jd.is_verified = 1) AS has_verified_pdf,
             (SELECT jd.file_size_bytes FROM judgment_documents jd WHERE jd.judgment_id = lj.id AND jd.is_verified = 1 ORDER BY jd.id ASC LIMIT 1) AS pdf_file_size_bytes,
             (SELECT GROUP_CONCAT(CONCAT(la.short_title, ' ', CASE WHEN la.act_code = 'CONST_1950' THEN ls.section_number ELSE CONCAT('Sec ', ls.section_number) END) ORDER BY la.id ASC, ls.section_order ASC SEPARATOR ' • ')
              FROM judgment_legal_sections jls
              JOIN legal_sections ls ON jls.section_id = ls.id
              JOIN legal_acts la ON ls.act_id = la.id
              WHERE jls.judgment_id = lj.id) AS linked_provisions_summary
      FROM legal_judgments lj
      LEFT JOIN high_courts hc ON lj.high_court_id = hc.id
      WHERE lj.is_synthetic = 0
        AND lj.record_provenance = 'REAL_VERIFIED'
    `;
    const jParams = [];

    if (safeStr) {
      jQuery += ` AND (
        lj.case_name LIKE ? OR lj.citation LIKE ? OR lj.neutral_citation LIKE ?
        OR lj.case_number LIKE ? OR lj.legal_issue LIKE ? OR lj.key_ratio LIKE ?
        OR lj.key_holding LIKE ? OR lj.keywords LIKE ? OR lj.court_name LIKE ?
      )`;
      jParams.push(term, term, term, term, term, term, term, term, term);
    }

    if (options.court_tier) {
      jQuery += ' AND lj.court_tier = ?';
      paramsPush(jParams, options.court_tier);
    }
    if (options.domain) {
      jQuery += ' AND lj.domain = ?';
      jParams.push(options.domain);
    }
    if (options.year) {
      jQuery += ' AND YEAR(lj.judgment_date) = ?';
      jParams.push(options.year);
    }
    if (options.landmark === '1' || options.landmark === 'true') {
      jQuery += ' AND lj.is_landmark = 1';
    }
    if (options.pdf_only === '1' || options.pdf_only === 'true') {
      jQuery += ' AND EXISTS (SELECT 1 FROM judgment_documents jd WHERE jd.judgment_id = lj.id AND jd.is_verified = 1)';
    }

    const [[{ count: totalJudgments }]] = await db.query(
      `SELECT COUNT(*) as count FROM (${jQuery}) as sub`,
      jParams
    );

    jQuery += ' ORDER BY has_verified_pdf DESC, lj.is_landmark DESC, lj.judgment_date DESC LIMIT ? OFFSET ?';
    jParams.push(limit, offset);

    const [judgments] = await db.query(jQuery, jParams);

    // Compute truthful search match context fields when query is provided
    if (safeStr) {
      const qLower = safeStr.toLowerCase();
      judgments.forEach(j => {
        const matched = [];
        if (j.case_name && j.case_name.toLowerCase().includes(qLower)) matched.push('Case Title');
        if ((j.citation && j.citation.toLowerCase().includes(qLower)) ||
            (j.neutral_citation && j.neutral_citation.toLowerCase().includes(qLower))) matched.push('Citation');
        if (j.case_number && j.case_number.toLowerCase().includes(qLower)) matched.push('Case Number');
        if (j.legal_issue && j.legal_issue.toLowerCase().includes(qLower)) matched.push('Legal Issue');
        if ((j.key_holding && j.key_holding.toLowerCase().includes(qLower)) ||
            (j.key_ratio && j.key_ratio.toLowerCase().includes(qLower))) matched.push('Ratio / Holding');
        if (j.keywords && j.keywords.toLowerCase().includes(qLower)) matched.push('Keywords');
        if (j.court_name && j.court_name.toLowerCase().includes(qLower)) matched.push('Court');
        j.match_fields = matched;
      });
    }

    // Search sections and acts when a text query is present
    let sections = [];
    let acts = [];
    if (safeStr) {
      const [secRows] = await db.query(
        `SELECT ls.*, la.act_code, la.short_title as act_short_title, lc.chapter_number
         FROM legal_sections ls
         JOIN legal_acts la ON ls.act_id = la.id
         LEFT JOIN legal_chapters lc ON ls.chapter_id = lc.id
         WHERE ls.section_number LIKE ? OR ls.section_title LIKE ? OR ls.section_text LIKE ?
         ORDER BY la.id ASC, ls.section_order ASC
         LIMIT 12`,
        [term, term, term]
      );
      sections = secRows;

      const [actRows] = await db.query(
        `SELECT * FROM legal_acts 
         WHERE title LIKE ? OR short_title LIKE ? OR act_code LIKE ? OR description LIKE ?
         LIMIT 6`,
        [term, term, term, term]
      );
      acts = actRows;
    }

    return {
      judgments,
      totalJudgments,
      page,
      limit,
      totalPages: Math.ceil(totalJudgments / limit),
      sections,
      acts,
      query: queryStr
    };
  }
}

function paramsPush(arr, val) {
  arr.push(val);
}

module.exports = LegalJudgment;
