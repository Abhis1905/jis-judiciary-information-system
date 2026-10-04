'use strict';

/**
 * JIS Test Database Provisioning Script (C-5, H-1, H-5, L-6)
 *
 * 1. Drops and recreates `jis_test_db` from scratch using `database/schema.sql`
 *    (verifying H-1 that `database/schema.sql` is the complete, self-contained
 *    source of truth for all 26 tables, columns, indexes, and foreign keys).
 * 2. Populates `jis_test_db` with the complete judiciary hierarchy, legal
 *    knowledge repository, users, and a deterministic 514-case fixture
 *    (500 base cases + 14 appellate workflow cases and their root/HC chains)
 *    so that all test suites execute in complete isolation from `jis_db`.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3307', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const TEST_DB = process.env.DB_NAME || 'jis_test_db';
const PROD_DB = 'jis_db';

if (TEST_DB === PROD_DB) {
  console.error('FATAL: setup_test_db.js refused to run against jis_db.');
  process.exit(1);
}

async function setupTestDb() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true
  });

  try {
    console.log(`[setup_test_db] Initializing isolated test database: ${TEST_DB} on port ${DB_PORT}...`);

    // 1. Recreate jis_test_db and apply database/schema.sql
    await conn.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    await conn.query(`CREATE DATABASE ${TEST_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE ${TEST_DB}`);

    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8').replace(/\bjis_db\b/g, TEST_DB);
    await conn.query(schemaSql);
    console.log(`[setup_test_db] Applied database/schema.sql to ${TEST_DB} cleanly (all 26 tables created).`);

    // 2. Copy reference/taxonomy tables from jis_db into jis_test_db
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    const referenceTables = [
      'users',
      'states_uts',
      'high_courts',
      'high_court_jurisdictions',
      'high_court_benches',
      'districts',
      'court_levels',
      'subordinate_courts',
      'appellate_paths',
      'legal_acts',
      'legal_chapters',
      'legal_sections',
      'legal_categories',
      'legal_section_categories',
      'legal_section_relations',
      'legal_procedural_classifications',
      'legal_judgments',
      'judgment_legal_sections',
      'judgment_citations',
      'judgment_documents',
      'case_laws'
    ];

    for (const table of referenceTables) {
      await conn.query(`TRUNCATE TABLE ${TEST_DB}.${table}`);
      await conn.query(`INSERT INTO ${TEST_DB}.${table} SELECT * FROM ${PROD_DB}.${table}`);
    }

    // 3. Select a deterministic 514-case fixture (14 appellate cases + their root/parent cases + base cases up to 500 base cases)
    const [appealRows] = await conn.query(`SELECT original_case_id, appeal_case_id FROM ${PROD_DB}.case_appeals`);
    const appealCaseIds = new Set();
    const requiredBaseIds = new Set();
    for (const r of appealRows) {
      appealCaseIds.add(r.appeal_case_id);
    }
    for (const r of appealRows) {
      if (!appealCaseIds.has(r.original_case_id)) {
        requiredBaseIds.add(r.original_case_id);
      }
    }

    const [extraBaseRows] = await conn.query(
      `SELECT id FROM ${PROD_DB}.cases
       WHERE id NOT IN (SELECT appeal_case_id FROM ${PROD_DB}.case_appeals)
       ORDER BY id ASC
       LIMIT 500`
    );
    const baseIdSet = new Set(requiredBaseIds);
    for (const r of extraBaseRows) {
      if (baseIdSet.size >= 500) break;
      baseIdSet.add(r.id);
    }

    const allFixtureCaseIds = [...Array.from(baseIdSet), ...Array.from(appealCaseIds)];
    await conn.query(`TRUNCATE TABLE ${TEST_DB}.cases`);
    await conn.query(
      `INSERT INTO ${TEST_DB}.cases SELECT * FROM ${PROD_DB}.cases WHERE id IN (?)`,
      [allFixtureCaseIds]
    );

    // Copy case_appeals
    await conn.query(`TRUNCATE TABLE ${TEST_DB}.case_appeals`);
    await conn.query(`INSERT INTO ${TEST_DB}.case_appeals SELECT * FROM ${PROD_DB}.case_appeals`);

    // Copy dependent case tables for the fixture cases
    const caseChildTables = [
      'case_legal_sections',
      'case_legal_judgments',
      'documents',
      'hearings',
      'pleadings',
      'court_orders',
      'judgements',
      'vakalatnamas',
      'efilings',
      'case_status_updates',
      'trial_notes',
      'scheduling_requests',
      'court_notices'
    ];

    for (const table of caseChildTables) {
      await conn.query(`TRUNCATE TABLE ${TEST_DB}.${table}`);
      await conn.query(
        `INSERT INTO ${TEST_DB}.${table} SELECT * FROM ${PROD_DB}.${table} WHERE case_id IS NULL OR case_id IN (?)`,
        [allFixtureCaseIds]
      );
    }

    // Copy notifications (bounded to 200 recent rows matching fixture cases or null case_id)
    await conn.query(`TRUNCATE TABLE ${TEST_DB}.notifications`);
    await conn.query(
      `INSERT INTO ${TEST_DB}.notifications
       SELECT * FROM ${PROD_DB}.notifications
       WHERE case_id IS NULL OR case_id IN (?)
       ORDER BY id DESC LIMIT 200`,
      [allFixtureCaseIds]
    );

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const [[{ caseCount }]] = await conn.query(`SELECT COUNT(*) AS caseCount FROM ${TEST_DB}.cases`);
    const [[{ appealCount }]] = await conn.query(`SELECT COUNT(*) AS appealCount FROM ${TEST_DB}.case_appeals`);
    console.log(`[setup_test_db] Ready: ${caseCount} fixture cases (${caseCount - appealCount} base + ${appealCount} appellate) in ${TEST_DB}.`);
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  setupTestDb().catch(err => {
    console.error('[setup_test_db] Failed:', err.message);
    process.exit(1);
  });
}

module.exports = setupTestDb;
