'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function migrate() {
  console.log('--- Migrating Appellate Workflow Schema ---');
  try {
    const sqlPath = path.join(__dirname, 'appellate_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await db.query(sql);
    console.log('✓ Successfully created/verified `case_appeals` table.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
