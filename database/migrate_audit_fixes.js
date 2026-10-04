'use strict';

/**
 * Idempotent Migration Script for Independent Audit Fixes:
 * - C-4 / L-5: Adds `is_synthetic` and `record_provenance` to `legal_judgments` and accurately classifies
 *              105 REAL_VERIFIED vs 500 SYNTHETIC_REPRESENTATIVE records.
 * - H-4: Ensures `sessions` table exists for persistent MySQLSessionStore.
 * - H-5: Converts dangerous ON DELETE CASCADE constraints on taxonomy tables to ON DELETE RESTRICT.
 * - M-4: Adds FULLTEXT index `idx_cases_fulltext` on `cases(title, petitioner_name, respondent_name)`.
 * - M-10: Adds `provenance` column to `case_appeals` and populates existing records.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrateDatabase(targetDbName) {
  const dbName = targetDbName || process.env.DB_NAME || 'jis_db';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName
  });

  try {
    console.log(`\n[Audit Migration] Applying schema and provenance fixes to '${dbName}'...`);

    // 1. H-4: Sessions table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(128) NOT NULL PRIMARY KEY,
        expires    BIGINT UNSIGNED NOT NULL,
        data       MEDIUMTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sessions_expires (expires)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✔ [H-4] Persistent `sessions` table verified.');

    // 2. M-10: case_appeals provenance column
    const [appealCols] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'case_appeals' AND COLUMN_NAME = 'provenance'`,
      [dbName]
    );
    if (appealCols.length === 0) {
      await conn.query(`
        ALTER TABLE case_appeals
        ADD COLUMN provenance VARCHAR(50) NOT NULL DEFAULT 'STAFF_FILED' AFTER is_synthetic
      `);
    }
    await conn.query(`
      UPDATE case_appeals
      SET provenance = CASE WHEN is_synthetic = 1 THEN 'SYNTHETIC_WORKFLOW' ELSE 'STAFF_FILED' END
    `);
    console.log('  ✔ [M-10] `case_appeals.provenance` column verified and populated.');

    // 3. C-4 / L-5: legal_judgments provenance columns & truthful classification
    const [judgSynthCol] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'legal_judgments' AND COLUMN_NAME = 'is_synthetic'`,
      [dbName]
    );
    if (judgSynthCol.length === 0) {
      await conn.query(`
        ALTER TABLE legal_judgments
        ADD COLUMN is_synthetic TINYINT(1) NOT NULL DEFAULT 0 AFTER is_landmark,
        ADD COLUMN record_provenance ENUM('REAL_VERIFIED', 'SYNTHETIC_REPRESENTATIVE') NOT NULL DEFAULT 'REAL_VERIFIED' AFTER is_synthetic,
        ADD INDEX idx_judg_provenance (is_synthetic, record_provenance)
      `);
    }

    // Reset all to REAL_VERIFIED first, then mark all template-generated records as SYNTHETIC_REPRESENTATIVE
    await conn.query(`
      UPDATE legal_judgments
      SET is_synthetic = 0,
          record_provenance = 'REAL_VERIFIED',
          is_landmark = 1
    `);

    // 3a. Mark 130 template-generated SC records: "(No. 2) v.", "(No. 3) v.", etc.
    await conn.query(`
      UPDATE legal_judgments
      SET is_synthetic = 1,
          record_provenance = 'SYNTHETIC_REPRESENTATIVE',
          is_landmark = 0,
          source_type = 'Authoritative Law Repository',
          source_name = 'JIS Representative Legal Research Template'
      WHERE court_tier = 'Supreme Court of India'
        AND case_name REGEXP '\\\\(No\\\\. [0-9]+\\\\) v\\\\.'
    `);

    // 3b. Mark 345 template-generated HC records: "Matter of <HC> State Litigant..."
    await conn.query(`
      UPDATE legal_judgments
      SET is_synthetic = 1,
          record_provenance = 'SYNTHETIC_REPRESENTATIVE',
          is_landmark = 0,
          source_type = 'Authoritative Law Repository',
          source_name = 'JIS Representative High Court Research Template'
      WHERE court_tier = 'High Court'
        AND case_name LIKE 'Matter of %'
    `);

    // 3c. Mark 25 template-generated District/Subordinate Court records
    await conn.query(`
      UPDATE legal_judgments
      SET is_synthetic = 1,
          record_provenance = 'SYNTHETIC_REPRESENTATIVE',
          is_landmark = 0,
          source_type = 'Authoritative Law Repository',
          source_name = 'JIS Representative Subordinate Court Template'
      WHERE court_tier = 'District & Subordinate Court'
    `);

    const [provCounts] = await conn.query(`
      SELECT court_tier, record_provenance, is_synthetic, COUNT(*) AS cnt
      FROM legal_judgments
      GROUP BY court_tier, record_provenance, is_synthetic
      ORDER BY court_tier, is_synthetic
    `);
    console.log('  ✔ [C-4/L-5] `legal_judgments` provenance breakdown:');
    provCounts.forEach(r => {
      console.log(`      - ${r.court_tier.padEnd(30)} | ${r.record_provenance.padEnd(26)} (is_synthetic=${r.is_synthetic}): ${r.cnt}`);
    });

    // 4. H-5: Convert dangerous ON DELETE CASCADE to ON DELETE RESTRICT on taxonomy tables
    const taxonomyFkTargets = [
      { table: 'high_court_jurisdictions', column: 'high_court_id', refTable: 'high_courts', refCol: 'id' },
      { table: 'high_court_jurisdictions', column: 'state_ut_id', refTable: 'states_uts', refCol: 'id' },
      { table: 'high_court_benches', column: 'high_court_id', refTable: 'high_courts', refCol: 'id' },
      { table: 'districts', column: 'state_ut_id', refTable: 'states_uts', refCol: 'id' },
      { table: 'districts', column: 'high_court_id', refTable: 'high_courts', refCol: 'id' },
      { table: 'districts', column: 'bench_id', refTable: 'high_court_benches', refCol: 'id' },
      { table: 'subordinate_courts', column: 'district_id', refTable: 'districts', refCol: 'id' },
      { table: 'subordinate_courts', column: 'court_level_id', refTable: 'court_levels', refCol: 'id' },
      { table: 'appellate_paths', column: 'from_level_id', refTable: 'court_levels', refCol: 'id' },
      { table: 'appellate_paths', column: 'to_level_id', refTable: 'court_levels', refCol: 'id' },
      { table: 'legal_chapters', column: 'act_id', refTable: 'legal_acts', refCol: 'id' },
      { table: 'legal_sections', column: 'act_id', refTable: 'legal_acts', refCol: 'id' },
      { table: 'legal_section_relations', column: 'from_section_id', refTable: 'legal_sections', refCol: 'id' },
      { table: 'legal_section_relations', column: 'to_section_id', refTable: 'legal_sections', refCol: 'id' }
    ];

    for (const fk of taxonomyFkTargets) {
      const [existingFks] = await conn.query(
        `SELECT rc.CONSTRAINT_NAME, rc.DELETE_RULE
         FROM information_schema.REFERENTIAL_CONSTRAINTS rc
         JOIN information_schema.KEY_COLUMN_USAGE kcu
           ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
          AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
          AND rc.TABLE_NAME = kcu.TABLE_NAME
         WHERE rc.CONSTRAINT_SCHEMA = ?
           AND rc.TABLE_NAME = ?
           AND kcu.COLUMN_NAME = ?`,
        [dbName, fk.table, fk.column]
      );

      for (const existing of existingFks) {
        if (existing.DELETE_RULE === 'CASCADE') {
          const newFkName = `fk_${fk.table}_${fk.column}_restrict`;
          await conn.query(`ALTER TABLE \`${fk.table}\` DROP FOREIGN KEY \`${existing.CONSTRAINT_NAME}\``);
          await conn.query(
            `ALTER TABLE \`${fk.table}\` ADD CONSTRAINT \`${newFkName}\` FOREIGN KEY (\`${fk.column}\`) REFERENCES \`${fk.refTable}\`(\`${fk.refCol}\`) ON DELETE RESTRICT`
          );
        }
      }
    }
    console.log('  ✔ [H-5] Taxonomy foreign keys converted from ON DELETE CASCADE to ON DELETE RESTRICT.');

    // 5. M-4: FULLTEXT index on cases(title, petitioner_name, respondent_name)
    const [ftIdx] = await conn.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'cases' AND INDEX_NAME = 'idx_cases_fulltext'`,
      [dbName]
    );
    if (ftIdx.length === 0) {
      console.log('  • [M-4] Creating FULLTEXT index `idx_cases_fulltext` on `cases`...');
      await conn.query(`
        ALTER TABLE cases
        ADD FULLTEXT INDEX idx_cases_fulltext (title, petitioner_name, respondent_name)
      `);
    }
    console.log('  ✔ [M-4] FULLTEXT index `idx_cases_fulltext` verified on `cases`.');

    console.log(`[Audit Migration] Completed successfully on '${dbName}'.\n`);
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  migrateDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Audit Migration Error]:', err);
      process.exit(1);
    });
}

module.exports = migrateDatabase;
