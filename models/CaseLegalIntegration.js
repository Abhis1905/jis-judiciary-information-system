'use strict';

const db = require('../config/db');

class CaseLegalIntegration {
  /**
   * Determine date-aware legal framework
   */
  static getLegalFrameworkForCase(caseObj) {
    if (!caseObj || !caseObj.filing_date) {
      return {
        framework: 'General Indian Law',
        substantiveCode: 'BNS 2023 / IPC 1860',
        proceduralCode: 'BNSS 2023 / CrPC 1973',
        evidenceCode: 'BSA 2023 / IEA 1872',
        period: 'Date indeterminate',
        isTransition: false,
        isSyntheticClassification: true,
        label: 'Standard Framework'
      };
    }

    const filingDate = new Date(caseObj.filing_date);
    const transitionDate = new Date('2024-07-01');

    if (filingDate < transitionDate) {
      return {
        framework: 'Historical Indian Criminal Law Framework',
        substantiveCode: 'Indian Penal Code, 1860 (IPC)',
        proceduralCode: 'Code of Criminal Procedure, 1973 (CrPC)',
        evidenceCode: 'Indian Evidence Act, 1872 (IEA)',
        period: 'Pre-1 July 2024 (Historical)',
        isTransition: false,
        isSyntheticClassification: true,
        label: 'Historical Criminal Jurisprudence (IPC / CrPC / IEA)'
      };
    } else {
      return {
        framework: 'Reformed Indian Criminal Law Framework',
        substantiveCode: 'Bharatiya Nyaya Sanhita, 2023 (BNS)',
        proceduralCode: 'Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)',
        evidenceCode: 'Bharatiya Sakshya Adhiniyam, 2023 (BSA)',
        period: 'Post-1 July 2024 (Active Modern Law)',
        isTransition: true,
        isSyntheticClassification: true,
        label: 'Reformed Criminal Sanhitas (BNS / BNSS / BSA)'
      };
    }
  }

  /**
   * Get all legal sections linked to a case (with Old/New equivalents)
   */
  static async getSectionsForCase(caseId) {
    const [sections] = await db.query(
      `SELECT cls.id as relation_id, cls.relevance_type, cls.is_synthetic, cls.notes as relation_notes,
              ls.id as section_id, ls.section_number, ls.section_title, ls.legal_nature, ls.valid_from, ls.valid_until, ls.status as section_status, ls.source_url,
              la.id as act_id, la.act_code, la.title as act_title, la.short_title as act_short_title, la.status as act_status,
              lc.chapter_number, lc.title as chapter_title
       FROM case_legal_sections cls
       JOIN legal_sections ls ON cls.legal_section_id = ls.id
       JOIN legal_acts la ON ls.act_id = la.id
       LEFT JOIN legal_chapters lc ON ls.chapter_id = lc.id
       WHERE cls.case_id = ?
       ORDER BY FIELD(cls.relevance_type, 'PRIMARY', 'SECONDARY', 'PROCEDURAL', 'EVIDENTIARY'), la.id ASC, ls.section_order ASC`,
      [caseId]
    );

    // Enrich each section with verified Old <-> New mappings
    for (const sec of sections) {
      const [mappings] = await db.query(
        `SELECT lsr.relation_type, lsr.notes as mapping_notes,
                ts.id as target_sec_id, ts.section_number as target_sec_number, ts.section_title as target_sec_title,
                ta.act_code as target_act_code, ta.short_title as target_act_title
         FROM legal_section_relations lsr
         JOIN legal_sections ts ON (lsr.to_section_id = ts.id OR lsr.from_section_id = ts.id)
         JOIN legal_acts ta ON ts.act_id = ta.id
         WHERE (lsr.from_section_id = ? AND lsr.to_section_id = ts.id)
            OR (lsr.to_section_id = ? AND lsr.from_section_id = ts.id)
         LIMIT 3`,
        [sec.section_id, sec.section_id]
      );
      sec.equivalents = mappings;
    }

    return sections;
  }

  /**
   * Get all legal judgments linked to a case
   */
  static async getJudgmentsForCase(caseId, options = {}) {
    const publicFilter = options.publicOnly
      ? "AND lj.is_synthetic = 0 AND lj.record_provenance = 'REAL_VERIFIED'"
      : '';
    const [judgments] = await db.query(
      `SELECT clj.id as relation_id, clj.relevance_type, clj.is_synthetic, clj.notes as relation_notes,
              lj.id as judgment_id, lj.case_name, lj.citation, lj.neutral_citation, lj.judgment_date, lj.bench_judges,
              lj.court_tier, lj.court_name, lj.domain, lj.key_ratio, lj.key_holding, lj.source_url,
              lj.is_synthetic as judgment_is_synthetic, lj.record_provenance
       FROM case_legal_judgments clj
       JOIN legal_judgments lj ON clj.judgment_id = lj.id
       WHERE clj.case_id = ? ${publicFilter}
       ORDER BY lj.is_synthetic ASC, FIELD(clj.relevance_type, 'PRECEDENT', 'CITED', 'RELATED', 'RESEARCH'), lj.judgment_date DESC`,
      [caseId]
    );

    if (options.publicOnly && judgments.length === 0) {
      // Fallback to REAL_VERIFIED landmark judgments linked to the statutory sections of this case
      const [secJudgments] = await db.query(
        `SELECT DISTINCT lj.id as judgment_id, 'PRECEDENT' as relevance_type, 1 as is_synthetic,
                lj.case_name, lj.citation, lj.neutral_citation, lj.judgment_date, lj.bench_judges,
                lj.court_tier, lj.court_name, lj.domain, lj.key_ratio, lj.key_holding, lj.source_url,
                lj.is_landmark, lj.is_synthetic as judgment_is_synthetic, lj.record_provenance
         FROM case_legal_sections cls
         JOIN judgment_legal_sections jls ON cls.legal_section_id = jls.section_id
         JOIN legal_judgments lj ON jls.judgment_id = lj.id
         WHERE cls.case_id = ?
           AND lj.is_synthetic = 0
           AND lj.record_provenance = 'REAL_VERIFIED'
         ORDER BY lj.is_landmark DESC, lj.judgment_date DESC
         LIMIT 3`,
        [caseId]
      );
      return secJudgments;
    }

    return judgments;
  }

  /**
   * Add a legal section to a case
   */
  static async addSectionToCase(caseId, legalSectionId, relevanceType = 'PRIMARY', isSynthetic = 0, notes = null) {
    const validRelevance = ['PRIMARY', 'SECONDARY', 'PROCEDURAL', 'EVIDENTIARY'];
    const rel = validRelevance.includes(relevanceType) ? relevanceType : 'PRIMARY';

    const [res] = await db.query(
      `INSERT INTO case_legal_sections (case_id, legal_section_id, relevance_type, is_synthetic, notes)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE relevance_type = VALUES(relevance_type), notes = VALUES(notes), is_synthetic = VALUES(is_synthetic)`,
      [caseId, legalSectionId, rel, isSynthetic ? 1 : 0, notes]
    );
    return res;
  }

  /**
   * Remove a legal section from a case
   */
  static async removeSectionFromCase(caseId, legalSectionId) {
    const [res] = await db.query(
      'DELETE FROM case_legal_sections WHERE case_id = ? AND legal_section_id = ?',
      [caseId, legalSectionId]
    );
    return res;
  }

  /**
   * Add a judgment to a case
   */
  static async addJudgmentToCase(caseId, judgmentId, relevanceType = 'PRECEDENT', isSynthetic = 0, notes = null) {
    const validRelevance = ['PRECEDENT', 'RELATED', 'CITED', 'RESEARCH'];
    const rel = validRelevance.includes(relevanceType) ? relevanceType : 'PRECEDENT';

    const [res] = await db.query(
      `INSERT INTO case_legal_judgments (case_id, judgment_id, relevance_type, is_synthetic, notes)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE relevance_type = VALUES(relevance_type), notes = VALUES(notes), is_synthetic = VALUES(is_synthetic)`,
      [caseId, judgmentId, rel, isSynthetic ? 1 : 0, notes]
    );
    return res;
  }

  /**
   * Remove a judgment from a case
   */
  static async removeJudgmentFromCase(caseId, judgmentId) {
    const [res] = await db.query(
      'DELETE FROM case_legal_judgments WHERE case_id = ? AND judgment_id = ?',
      [caseId, judgmentId]
    );
    return res;
  }

  /**
   * Reverse navigation: Get JIS cases associated with a legal section
   */
  static async getCasesForSection(legalSectionId, page = 1, limit = 10) {
    const p = Math.max(1, parseInt(page || 1, 10));
    const lim = Math.max(1, Math.min(100, parseInt(limit || 10, 10)));
    const offset = (p - 1) * lim;

    const countQuery = `
      SELECT COUNT(*) as count 
      FROM case_legal_sections cls 
      JOIN cases c ON cls.case_id = c.id 
      WHERE cls.legal_section_id = ?
    `;
    const [[{ count }]] = await db.query(countQuery, [legalSectionId]);

    const [cases] = await db.query(
      `SELECT c.id, c.case_number, c.title, c.case_type, c.status, c.filing_date, c.is_public,
              cls.relevance_type, cls.is_synthetic, cls.notes as relation_notes,
              hc.name as high_court_name, d.district_name
       FROM case_legal_sections cls
       JOIN cases c ON cls.case_id = c.id
       LEFT JOIN high_courts hc ON c.high_court_id = hc.id
       LEFT JOIN districts d ON c.district_id = d.id
       WHERE cls.legal_section_id = ?
       ORDER BY c.filing_date DESC, c.id DESC
       LIMIT ? OFFSET ?`,
      [legalSectionId, lim, offset]
    );

    return {
      cases,
      total: count,
      page: p,
      limit: lim,
      totalPages: Math.ceil(count / lim)
    };
  }

  /**
   * Reverse navigation: Get JIS cases referencing a legal judgment
   */
  static async getCasesForJudgment(judgmentId, page = 1, limit = 10) {
    const p = Math.max(1, parseInt(page || 1, 10));
    const lim = Math.max(1, Math.min(100, parseInt(limit || 10, 10)));
    const offset = (p - 1) * lim;

    const countQuery = `
      SELECT COUNT(*) as count 
      FROM case_legal_judgments clj 
      JOIN cases c ON clj.case_id = c.id 
      WHERE clj.judgment_id = ?
    `;
    const [[{ count }]] = await db.query(countQuery, [judgmentId]);

    const [cases] = await db.query(
      `SELECT c.id, c.case_number, c.title, c.case_type, c.status, c.filing_date, c.is_public,
              clj.relevance_type, clj.is_synthetic, clj.notes as relation_notes,
              hc.name as high_court_name, d.district_name
       FROM case_legal_judgments clj
       JOIN cases c ON clj.case_id = c.id
       LEFT JOIN high_courts hc ON c.high_court_id = hc.id
       LEFT JOIN districts d ON c.district_id = d.id
       WHERE clj.judgment_id = ?
       ORDER BY c.filing_date DESC, c.id DESC
       LIMIT ? OFFSET ?`,
      [judgmentId, lim, offset]
    );

    return {
      cases,
      total: count,
      page: p,
      limit: lim,
      totalPages: Math.ceil(count / lim)
    };
  }

  /**
   * Reverse navigation: Get legal provisions discussed in a judgment
   */
  static async getSectionsForJudgment(judgmentId) {
    const [sections] = await db.query(
      `SELECT ls.id as section_id, ls.section_number, ls.section_title, ls.legal_nature, ls.valid_from, ls.valid_until, ls.status as section_status,
              la.id as act_id, la.act_code, la.short_title as act_short_title, la.status as act_status,
              lc.chapter_number, lc.title as chapter_title,
              jls.relevance_nature
       FROM judgment_legal_sections jls
       JOIN legal_sections ls ON jls.section_id = ls.id
       JOIN legal_acts la ON ls.act_id = la.id
       LEFT JOIN legal_chapters lc ON ls.chapter_id = lc.id
       WHERE jls.judgment_id = ?
       ORDER BY la.id ASC, ls.section_order ASC`,
      [judgmentId]
    );
    return sections;
  }

  /**
   * Fetch sections by Act ID for selection dropdowns / API
   */
  static async getSectionsByAct(actId) {
    const [rows] = await db.query(
      `SELECT ls.id, ls.section_number, ls.section_title, ls.legal_nature, ls.status,
              lc.chapter_number, lc.title as chapter_title
       FROM legal_sections ls
       LEFT JOIN legal_chapters lc ON ls.chapter_id = lc.id
       WHERE ls.act_id = ?
       ORDER BY ls.section_order ASC, ls.id ASC`,
      [actId]
    );
    return rows;
  }

  /**
   * Global legal statistics for dashboard
   */
  static async getIntegratedStats() {
    const [[actsCount]] = await db.query('SELECT COUNT(*) as count FROM legal_acts');
    const [[sectionsCount]] = await db.query('SELECT COUNT(*) as count FROM legal_sections');
    const [[scJudgmentsCount]] = await db.query("SELECT COUNT(*) as count FROM legal_judgments WHERE court_tier = 'Supreme Court of India'");
    const [[hcJudgmentsCount]] = await db.query("SELECT COUNT(*) as count FROM legal_judgments WHERE court_tier = 'High Court'");
    const [[distJudgmentsCount]] = await db.query("SELECT COUNT(*) as count FROM legal_judgments WHERE court_tier = 'District & Subordinate Court'");
    const [[realJudgmentsCount]] = await db.query("SELECT COUNT(*) as count FROM legal_judgments WHERE is_synthetic = 0");
    const [[syntheticJudgmentsCount]] = await db.query("SELECT COUNT(*) as count FROM legal_judgments WHERE is_synthetic = 1");
    const [[categoriesCount]] = await db.query('SELECT COUNT(*) as count FROM legal_categories');
    const [[relationsCount]] = await db.query('SELECT COUNT(*) as count FROM legal_section_relations');

    const [[caseSectionsCount]] = await db.query('SELECT COUNT(DISTINCT case_id) as count FROM case_legal_sections');
    const [[caseJudgmentsCount]] = await db.query('SELECT COUNT(DISTINCT case_id) as count FROM case_legal_judgments');
    const [[totalCaseSectionLinks]] = await db.query('SELECT COUNT(*) as count FROM case_legal_sections');
    const [[totalCaseJudgmentLinks]] = await db.query('SELECT COUNT(*) as count FROM case_legal_judgments');
    const [[totalCasesCount]] = await db.query('SELECT COUNT(*) as count FROM cases');

    return {
      acts: actsCount.count,
      sections: sectionsCount.count,
      totalJudgments: scJudgmentsCount.count + hcJudgmentsCount.count + distJudgmentsCount.count,
      realJudgments: realJudgmentsCount.count,
      syntheticJudgments: syntheticJudgmentsCount.count,
      supremeCourtJudgments: scJudgmentsCount.count,
      highCourtJudgments: hcJudgmentsCount.count,
      districtJudgments: distJudgmentsCount.count,
      categories: categoriesCount.count,
      relations: relationsCount.count,
      totalCases: totalCasesCount.count,
      casesLinkedToSections: caseSectionsCount.count,
      casesLinkedToJudgments: caseJudgmentsCount.count,
      totalCaseSectionLinks: totalCaseSectionLinks.count,
      totalCaseJudgmentLinks: totalCaseJudgmentLinks.count
    };
  }
}

module.exports = CaseLegalIntegration;
