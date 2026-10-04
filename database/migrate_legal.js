'use strict';

/**
 * Migration Script for JIS Legal Knowledge Repository
 * Applies database/legal_schema.sql to jis_db.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function migrateLegal() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jis_db',
    multipleStatements: true
  });

  console.log('\n======================================================');
  console.log(' JIS – Legal Knowledge Repository Schema Migration');
  console.log('======================================================\n');

  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'legal_schema.sql'), 'utf8');
    console.log('  • Executing legal_schema.sql...');
    await pool.query(schemaSql);
    console.log('  [✓] Legal tables created successfully.\n');

    // Verify all 10 tables exist
    const [tables] = await pool.query(`
      SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (
        'legal_acts', 'legal_chapters', 'legal_sections', 'legal_categories',
        'legal_section_categories', 'legal_section_relations', 'legal_procedural_classifications',
        'legal_judgments', 'judgment_legal_sections', 'judgment_citations'
      )
    `, [process.env.DB_NAME || 'jis_db']);

    console.log(`  • Verified ${tables.length} / 10 legal repository tables in database:`);
    tables.forEach(t => console.log(`     - ${t.TABLE_NAME}`));
    console.log('\n======================================================\n');
  } catch (err) {
    console.error('Legal migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateLegal();
