'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function migrateCaseLegal() {
  const sqlPath = path.join(__dirname, 'case_legal_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split queries by semicolon
  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.toLowerCase().startsWith('use '));

  const conn = await db.getConnection();
  console.log('\n[MIGRATE] Running Case Legal Integration schema migration...');

  try {
    for (const stmt of statements) {
      if (stmt.trim()) {
        await conn.query(stmt);
      }
    }
    console.log('[MIGRATE] Successfully created case_legal_sections and case_legal_judgments tables.\n');
  } catch (err) {
    console.error('[MIGRATE] Migration error:', err.message);
    throw err;
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  migrateCaseLegal()
    .then(() => {
      console.log('Migration finished successfully.');
      process.exit(0);
    })
    .catch(() => process.exit(1));
}

module.exports = migrateCaseLegal;
