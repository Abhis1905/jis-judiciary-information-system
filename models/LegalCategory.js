'use strict';

const db = require('../config/db');

class LegalCategory {
  static async getAll() {
    const [rows] = await db.query(
      `SELECT lc.*, COUNT(lsc.section_id) as section_count
       FROM legal_categories lc
       LEFT JOIN legal_section_categories lsc ON lc.id = lsc.category_id
       GROUP BY lc.id
       ORDER BY lc.domain ASC, lc.name ASC`
    );
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM legal_categories WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async getSectionsByCategory(categoryId) {
    const [rows] = await db.query(
      `SELECT ls.*, la.act_code, la.short_title as act_short_title, la.status as act_status
       FROM legal_section_categories lsc
       JOIN legal_sections ls ON lsc.section_id = ls.id
       JOIN legal_acts la ON ls.act_id = la.id
       WHERE lsc.category_id = ?
       ORDER BY la.id ASC, ls.section_order ASC`,
      [categoryId]
    );
    return rows;
  }
}

module.exports = LegalCategory;
