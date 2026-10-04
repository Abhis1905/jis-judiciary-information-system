'use strict';

const db = require('../config/db');

class LegalAct {
  static async getAll(filter = {}) {
    let query = 'SELECT * FROM legal_acts WHERE 1=1';
    const params = [];

    if (filter.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter.search) {
      query += ' AND (title LIKE ? OR short_title LIKE ? OR act_code LIKE ?)';
      params.push(`%${filter.search}%`, `%${filter.search}%`, `%${filter.search}%`);
    }

    query += ' ORDER BY enactment_year ASC, id ASC';
    const [rows] = await db.query(query, params);
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM legal_acts WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async getByCode(actCode) {
    const [rows] = await db.query('SELECT * FROM legal_acts WHERE act_code = ?', [actCode]);
    return rows[0] || null;
  }

  static async getChapters(actId) {
    const [rows] = await db.query(
      'SELECT * FROM legal_chapters WHERE act_id = ? ORDER BY chapter_order ASC, id ASC',
      [actId]
    );
    return rows;
  }

  static async getWithStructure(actId) {
    const act = await this.getById(actId);
    if (!act) return null;

    const chapters = await this.getChapters(actId);
    const [sections] = await db.query(
      `SELECT ls.*, lc.chapter_number, lc.title as chapter_title 
       FROM legal_sections ls
       LEFT JOIN legal_chapters lc ON ls.chapter_id = lc.id
       WHERE ls.act_id = ?
       ORDER BY ls.section_order ASC, ls.id ASC`,
      [actId]
    );

    // Group sections by chapter
    const chapterMap = {};
    chapters.forEach(ch => {
      chapterMap[ch.id] = { ...ch, sections: [] };
    });

    const unassignedSections = [];
    sections.forEach(sec => {
      if (sec.chapter_id && chapterMap[sec.chapter_id]) {
        chapterMap[sec.chapter_id].sections.push(sec);
      } else {
        unassignedSections.push(sec);
      }
    });

    return {
      act,
      chapters: Object.values(chapterMap),
      unassignedSections,
      totalSections: sections.length
    };
  }

  static async getStats() {
    const [[actsCount]] = await db.query('SELECT COUNT(*) as count FROM legal_acts');
    const [[sectionsCount]] = await db.query('SELECT COUNT(*) as count FROM legal_sections');
    const [[relationsCount]] = await db.query('SELECT COUNT(*) as count FROM legal_section_relations');
    const [[scJudgmentsCount]] = await db.query("SELECT COUNT(*) as count FROM legal_judgments WHERE court_tier = 'Supreme Court of India'");
    const [[hcJudgmentsCount]] = await db.query("SELECT COUNT(*) as count FROM legal_judgments WHERE court_tier = 'High Court'");
    const [[distJudgmentsCount]] = await db.query("SELECT COUNT(*) as count FROM legal_judgments WHERE court_tier = 'District & Subordinate Court'");
    const [[realJudgmentsCount]] = await db.query("SELECT COUNT(*) as count FROM legal_judgments WHERE is_synthetic = 0");
    const [[syntheticJudgmentsCount]] = await db.query("SELECT COUNT(*) as count FROM legal_judgments WHERE is_synthetic = 1");
    const [[realScCount]] = await db.query("SELECT COUNT(*) as count FROM legal_judgments WHERE court_tier = 'Supreme Court of India' AND is_synthetic = 0 AND record_provenance = 'REAL_VERIFIED'");
    const [[realHcCount]] = await db.query("SELECT COUNT(*) as count FROM legal_judgments WHERE court_tier = 'High Court' AND is_synthetic = 0 AND record_provenance = 'REAL_VERIFIED'");
    const [[verifiedPdfCount]] = await db.query(
      `SELECT COUNT(DISTINCT jd.judgment_id) as count
       FROM judgment_documents jd
       JOIN legal_judgments lj ON jd.judgment_id = lj.id
       WHERE jd.is_verified = 1 AND lj.is_synthetic = 0 AND lj.record_provenance = 'REAL_VERIFIED'`
    );
    const [[landmarkVerifiedCount]] = await db.query(
      "SELECT COUNT(*) as count FROM legal_judgments WHERE is_landmark = 1 AND is_synthetic = 0 AND record_provenance = 'REAL_VERIFIED'"
    );

    return {
      acts: actsCount.count,
      sections: sectionsCount.count,
      relations: relationsCount.count,
      supremeCourtJudgments: scJudgmentsCount.count,
      highCourtJudgments: hcJudgmentsCount.count,
      districtJudgments: distJudgmentsCount.count,
      totalJudgments: scJudgmentsCount.count + hcJudgmentsCount.count + distJudgmentsCount.count,
      realJudgments: realJudgmentsCount.count,
      syntheticJudgments: syntheticJudgmentsCount.count,
      realSupremeCourtJudgments: realScCount.count,
      syntheticSupremeCourtJudgments: scJudgmentsCount.count - realScCount.count,
      realHighCourtJudgments: realHcCount.count,
      syntheticHighCourtJudgments: hcJudgmentsCount.count - realHcCount.count,
      verifiedPdfCount: verifiedPdfCount.count,
      landmarkVerifiedCount: landmarkVerifiedCount.count
    };
  }
}

module.exports = LegalAct;
