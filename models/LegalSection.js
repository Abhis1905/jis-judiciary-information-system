'use strict';

const db = require('../config/db');

class LegalSection {
  static async getById(id) {
    const [rows] = await db.query(
      `SELECT ls.*, 
              la.act_code, la.title as act_title, la.short_title as act_short_title, la.status as act_status,
              lc.chapter_number, lc.title as chapter_title
       FROM legal_sections ls
       JOIN legal_acts la ON ls.act_id = la.id
       LEFT JOIN legal_chapters lc ON ls.chapter_id = lc.id
       WHERE ls.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async getByActAndNumber(actCode, sectionNumber) {
    const [rows] = await db.query(
      `SELECT ls.*, 
              la.act_code, la.title as act_title, la.short_title as act_short_title, la.status as act_status,
              lc.chapter_number, lc.title as chapter_title
       FROM legal_sections ls
       JOIN legal_acts la ON ls.act_id = la.id
       LEFT JOIN legal_chapters lc ON ls.chapter_id = lc.id
       WHERE la.act_code = ? AND ls.section_number = ?`,
      [actCode, sectionNumber]
    );
    return rows[0] || null;
  }

  static async getRelations(sectionId) {
    // Forward relations (this section -> other section)
    const [forward] = await db.query(
      `SELECT lsr.*, 
              ts.id as target_section_id, ts.section_number as target_section_number, ts.section_title as target_section_title,
              ta.act_code as target_act_code, ta.short_title as target_act_title, ta.status as target_act_status
       FROM legal_section_relations lsr
       JOIN legal_sections ts ON lsr.to_section_id = ts.id
       JOIN legal_acts ta ON ts.act_id = ta.id
       WHERE lsr.from_section_id = ?`,
      [sectionId]
    );

    // Backward relations (other section -> this section)
    const [backward] = await db.query(
      `SELECT lsr.*, 
              fs.id as source_section_id, fs.section_number as source_section_number, fs.section_title as source_section_title,
              fa.act_code as source_act_code, fa.short_title as source_act_title, fa.status as source_act_status
       FROM legal_section_relations lsr
       JOIN legal_sections fs ON lsr.from_section_id = fs.id
       JOIN legal_acts fa ON fs.act_id = fa.id
       WHERE lsr.to_section_id = ?`,
      [sectionId]
    );

    return { forward, backward };
  }

  static async getProceduralClassification(sectionId) {
    const [rows] = await db.query(
      'SELECT * FROM legal_procedural_classifications WHERE section_id = ?',
      [sectionId]
    );
    return rows[0] || null;
  }

  static async getCategories(sectionId) {
    const [rows] = await db.query(
      `SELECT lc.* 
       FROM legal_section_categories lsc
       JOIN legal_categories lc ON lsc.category_id = lc.id
       WHERE lsc.section_id = ?`,
      [sectionId]
    );
    return rows;
  }

  static async getLinkedJudgments(sectionId) {
    const [rows] = await db.query(
      `SELECT lj.*, jls.relevance_nature
       FROM judgment_legal_sections jls
       JOIN legal_judgments lj ON jls.judgment_id = lj.id
       WHERE jls.section_id = ?
         AND lj.is_synthetic = 0
         AND lj.record_provenance = 'REAL_VERIFIED'
       ORDER BY lj.is_landmark DESC, lj.judgment_date DESC`,
      [sectionId]
    );
    return rows;
  }

  static async search(filter = {}) {
    let query = `
      SELECT ls.*, 
             la.act_code, la.short_title as act_short_title, la.status as act_status,
             lc.chapter_number, lc.title as chapter_title
      FROM legal_sections ls
      JOIN legal_acts la ON ls.act_id = la.id
      LEFT JOIN legal_chapters lc ON ls.chapter_id = lc.id
      WHERE 1=1
    `;
    const params = [];

    if (filter.act_id) {
      query += ' AND ls.act_id = ?';
      params.push(filter.act_id);
    }
    if (filter.act_code) {
      query += ' AND la.act_code = ?';
      params.push(filter.act_code);
    }
    if (filter.status) {
      query += ' AND ls.status = ?';
      params.push(filter.status);
    }
    if (filter.legal_nature) {
      query += ' AND ls.legal_nature = ?';
      params.push(filter.legal_nature);
    }
    if (filter.search && filter.search.trim()) {
      const s = filter.search.trim().slice(0, 200);
      query += ' AND (ls.section_number LIKE ? OR ls.section_title LIKE ? OR ls.section_text LIKE ?)';
      params.push(`%${s}%`, `%${s}%`, `%${s}%`);
    }

    query += ' ORDER BY la.id ASC, ls.section_order ASC';

    const page = Math.max(1, Math.min(1000, parseInt(filter.page || 1, 10) || 1));
    const limit = Math.max(1, Math.min(100, parseInt(filter.limit || 50, 10) || 50));
    const offset = (page - 1) * limit;

    // Count query
    const countQuery = `SELECT COUNT(*) as count FROM (${query}) as total`;
    const [[{ count }]] = await db.query(countQuery, params);

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.query(query, params);
    return {
      sections: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  static async getAllMappings(filter = {}) {
    let query = `
      SELECT lsr.*,
             fs.id as from_id, fs.section_number as from_sec, fs.section_title as from_title, fs.valid_from as from_valid_from, fs.valid_until as from_valid_until,
             fa.act_code as from_act_code, fa.short_title as from_act_title,
             ts.id as to_id, ts.section_number as to_sec, ts.section_title as to_title, ts.valid_from as to_valid_from, ts.valid_until as to_valid_until,
             ta.act_code as to_act_code, ta.short_title as to_act_title
      FROM legal_section_relations lsr
      JOIN legal_sections fs ON lsr.from_section_id = fs.id
      JOIN legal_acts fa ON fs.act_id = fa.id
      JOIN legal_sections ts ON lsr.to_section_id = ts.id
      JOIN legal_acts ta ON ts.act_id = ta.id
      WHERE 1=1
    `;
    const params = [];

    if (filter.act_pair) {
      if (filter.act_pair === 'IPC_BNS') {
        query += ' AND fa.act_code = "IPC_1860" AND ta.act_code = "BNS_2023"';
      } else if (filter.act_pair === 'CRPC_BNSS') {
        query += ' AND fa.act_code = "CRPC_1973" AND ta.act_code = "BNSS_2023"';
      } else if (filter.act_pair === 'IEA_BSA') {
        query += ' AND fa.act_code = "IEA_1872" AND ta.act_code = "BSA_2023"';
      }
    }
    if (filter.relation_type) {
      query += ' AND lsr.relation_type = ?';
      params.push(filter.relation_type);
    }
    if (filter.search) {
      query += ' AND (fs.section_number LIKE ? OR fs.section_title LIKE ? OR ts.section_number LIKE ? OR ts.section_title LIKE ? OR lsr.notes LIKE ?)';
      params.push(`%${filter.search}%`, `%${filter.search}%`, `%${filter.search}%`, `%${filter.search}%`, `%${filter.search}%`);
    }

    query += ' ORDER BY fa.id ASC, fs.section_order ASC';
    const [rows] = await db.query(query, params);
    return rows;
  }
}

module.exports = LegalSection;
