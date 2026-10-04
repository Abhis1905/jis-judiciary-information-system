'use strict';

/**
 * JIS – Backup Verification Utility
 *
 * Verifies that generated SQL backup files in backups/ are non-empty,
 * structurally sound, contain valid DDL/DML, and include all critical tables.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function verifyBackup(targetFile = null) {
  console.log('\n======================================================');
  console.log(' JIS – Database Backup Verification Utility           ');
  console.log('======================================================\n');

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    console.error('[Verify ERROR] backups/ directory does not exist.');
    process.exit(1);
  }

  let filePath = targetFile;
  if (!filePath) {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.sql'))
      .sort((a, b) => fs.statSync(path.join(backupDir, b)).mtimeMs - fs.statSync(path.join(backupDir, a)).mtimeMs);

    if (files.length === 0) {
      console.error('[Verify ERROR] No .sql backup files found in backups/ directory.');
      process.exit(1);
    }
    filePath = path.join(backupDir, files[0]);
  }

  console.log(`[Verify] Inspecting backup: ${path.basename(filePath)}`);

  if (!fs.existsSync(filePath)) {
    console.error(`[Verify ERROR] File not found: ${filePath}`);
    process.exit(1);
  }

  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    console.error('[Verify ERROR] Backup file is empty (0 bytes).');
    process.exit(1);
  }

  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`[Verify] File size: ${sizeMb} MB (${stats.size} bytes)`);

  const criticalTables = [
    'users',
    'cases',
    'case_appeals',
    'case_legal_sections',
    'case_legal_judgments',
    'legal_acts',
    'legal_sections',
    'legal_judgments',
    'states_uts',
    'high_courts',
    'high_court_benches',
    'districts',
    'court_levels'
  ];

  const foundTables = new Set();
  let hasCreateTable = false;
  let hasInsert = false;
  let lineCount = 0;

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    lineCount++;
    if (line.includes('CREATE TABLE')) {
      hasCreateTable = true;
      for (const ct of criticalTables) {
        if (line.includes(`\`${ct}\``) || line.includes(` ${ct} `)) {
          foundTables.add(ct);
        }
      }
    }
    if (line.startsWith('INSERT INTO')) {
      hasInsert = true;
    }
  }

  console.log(`[Verify] Processed ${lineCount.toLocaleString()} lines.`);
  console.log(`[Verify] Found DDL (CREATE TABLE): ${hasCreateTable ? 'YES' : 'NO'}`);
  console.log(`[Verify] Found DML (INSERT INTO):   ${hasInsert ? 'YES' : 'NO'}`);
  console.log(`[Verify] Critical tables matched:  ${foundTables.size} / ${criticalTables.length}`);

  const missing = criticalTables.filter(t => !foundTables.has(t));
  if (missing.length > 0) {
    console.warn(`[Verify WARNING] Missing table DDL definitions: ${missing.join(', ')}`);
  }

  const isValid = hasCreateTable && hasInsert && missing.length === 0;

  console.log('\n======================================================');
  if (isValid) {
    console.log('✔ BACKUP VERIFICATION PASSED: File is valid, non-empty,');
    console.log('  and structurally complete with all critical tables.');
  } else {
    console.error('✖ BACKUP VERIFICATION FAILED: Structural checks failed.');
  }
  console.log('======================================================\n');

  if (!isValid) process.exit(1);
  process.exit(0);
}

verifyBackup(process.argv[2]);
