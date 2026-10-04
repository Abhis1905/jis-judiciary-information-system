'use strict';

const pool = require('../config/db');

/** Search and filter simulated Supreme Court judgements / precedents (J3). */
exports.search = async ({ query, year, courtName } = {}) => {
  let sql = 'SELECT * FROM case_laws WHERE 1=1';
  const params = [];

  if (query && query.trim()) {
    sql += ' AND (case_name LIKE ? OR summary LIKE ? OR citation_number LIKE ?)';
    const like = `%${query.trim()}%`;
    params.push(like, like, like);
  }

  if (year && !isNaN(parseInt(year, 10))) {
    sql += ' AND year = ?';
    params.push(parseInt(year, 10));
  }

  if (courtName && courtName.trim()) {
    sql += ' AND court_name LIKE ?';
    params.push(`%${courtName.trim()}%`);
  }

  sql += ' ORDER BY year DESC, case_name ASC LIMIT 50';
  const [rows] = await pool.query(sql, params);
  return rows;
};

/** Get distinct years available in precedent repository for filter dropdown. */
exports.getDistinctYears = async () => {
  const [rows] = await pool.query('SELECT DISTINCT year FROM case_laws ORDER BY year DESC');
  return rows.map(r => r.year);
};
