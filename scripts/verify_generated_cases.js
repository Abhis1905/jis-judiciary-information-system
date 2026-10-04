'use strict';

/**
 * JIS – Judiciary Info System
 * Synthetic Case Generation Verification Suite
 *
 * Verifies all 10 integrity checkpoints:
 * 1. Total cases = 100,000
 * 2. Case numbers are unique across all 100k records
 * 3. No NULL hierarchy IDs for synthetic cases
 * 4. Relational integrity: District -> State, High Court, Bench
 * 5. All 787 districts contain cases (0 empty districts)
 * 6. Subordinate Court & Court Level foreign keys exist and match
 * 7. Public (is_public=1) vs Private (is_public=0) filtering
 * 8. Existing seed cases preserved
 * 9. Status and role assignment validity
 * 10. Filing dates are valid historical dates (<= current date)
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function verifyGeneratedCases() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jis_db',
    connectionLimit: 5
  });

  console.log('\n================================================================');
  console.log(' JIS – 100,000 Case Generation Verification Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✔ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✖ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Total Case Count Verification
    const [[{ totalCases }]] = await pool.query('SELECT COUNT(*) AS totalCases FROM cases');
    assert(totalCases === 100000, `Total cases in database is exactly 100,000 (found: ${totalCases.toLocaleString()})`);

    // 2. Uniqueness of Case Numbers
    const [duplicates] = await pool.query(`
      SELECT case_number, COUNT(*) AS count 
      FROM cases 
      GROUP BY case_number 
      HAVING count > 1
    `);
    assert(duplicates.length === 0, `All case numbers are strictly unique (duplicates found: ${duplicates.length})`);

    // 3. Synthetic Cases Hierarchy Nullability Check
    const [nullHierarchy] = await pool.query(`
      SELECT COUNT(*) AS nullCount 
      FROM cases 
      WHERE case_number LIKE 'JIS/SYN/%' 
        AND (state_ut_id IS NULL OR high_court_id IS NULL OR bench_id IS NULL OR district_id IS NULL OR court_level_id IS NULL OR subordinate_court_id IS NULL)
    `);
    assert(nullHierarchy[0].nullCount === 0, `All synthetic cases have complete non-null hierarchy foreign keys (nulls: ${nullHierarchy[0].nullCount})`);

    // 4. Relational Hierarchy Consistency Check (District -> State, High Court, Bench)
    const [mismatchedDistrictLinks] = await pool.query(`
      SELECT COUNT(*) AS mismatchCount
      FROM cases c
      JOIN districts d ON c.district_id = d.id
      WHERE c.state_ut_id != d.state_ut_id
         OR c.high_court_id != d.high_court_id
         OR c.bench_id != d.bench_id
    `);
    assert(mismatchedDistrictLinks[0].mismatchCount === 0,
      `All cases strictly conform to district jurisdiction mapping (State, High Court, Bench mismatches: ${mismatchedDistrictLinks[0].mismatchCount})`);

    // 5. Subordinate Court & Tier Alignment
    const [mismatchedSubCourts] = await pool.query(`
      SELECT COUNT(*) AS mismatchCount
      FROM cases c
      JOIN subordinate_courts sc ON c.subordinate_court_id = sc.id
      WHERE c.district_id != sc.district_id
         OR c.court_level_id != sc.court_level_id
    `);
    assert(mismatchedSubCourts[0].mismatchCount === 0,
      `All subordinate court foreign keys align with district and court level (mismatches: ${mismatchedSubCourts[0].mismatchCount})`);

    // 6. District Coverage: All 787 districts have cases
    const [[{ totalDistricts }]] = await pool.query('SELECT COUNT(*) AS totalDistricts FROM districts');
    const [emptyDistricts] = await pool.query(`
      SELECT d.id, d.district_name, s.name AS state_name
      FROM districts d
      JOIN states_uts s ON d.state_ut_id = s.id
      LEFT JOIN cases c ON d.id = c.district_id
      WHERE c.id IS NULL
    `);
    assert(totalDistricts === 787, `All 787 judicial districts verified in master table (found: ${totalDistricts})`);
    assert(emptyDistricts.length === 0, `Every single district across India contains cases (empty districts: ${emptyDistricts.length})`);

    // 7. Case Status & Judicial Assignment Consistency
    const [unassignedInTrial] = await pool.query(`
      SELECT COUNT(*) AS invalidCount
      FROM cases
      WHERE status IN ('Allocated', 'In Trial', 'Judgement Pending', 'Closed')
        AND judge_id IS NULL
    `);
    assert(unassignedInTrial[0].invalidCount === 0,
      `All allocated / active / closed cases have valid assigned judges (unassigned: ${unassignedInTrial[0].invalidCount})`);

    // 8. Filing Dates Sanity Check (no future dates, valid range)
    const [futureDates] = await pool.query(`
      SELECT COUNT(*) AS futureCount
      FROM cases
      WHERE filing_date > CURDATE()
    `);
    assert(futureDates[0].futureCount === 0,
      `No case has a future filing date (future dates: ${futureDates[0].futureCount})`);

    // 9. Preservation of Seed Cases
    const [seedCases] = await pool.query(`
      SELECT case_number FROM cases 
      WHERE case_number IN ('JIS/CRI/2024/001', 'JIS/CIV/2024/002', 'JIS/CON/2024/003', 'JIS/FAM/2024/004')
    `);
    assert(seedCases.length === 4, `All 4 original seed cases preserved (found: ${seedCases.length}/4)`);

    // 10. Public vs Private Visibility Separation
    const [[{ publicCount }]] = await pool.query('SELECT COUNT(*) AS publicCount FROM cases WHERE is_public = 1');
    const [[{ privateCount }]] = await pool.query('SELECT COUNT(*) AS privateCount FROM cases WHERE is_public = 0');
    assert(publicCount > 0 && privateCount > 0 && (publicCount + privateCount) === totalCases,
      `Public / Private separation valid (${publicCount.toLocaleString()} public, ${privateCount.toLocaleString()} private)`);

    // Summary
    console.log('\n================================================================');
    console.log(` Verification Summary: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Verification failed with error:', err);
    failed++;
  } finally {
    await pool.end();
    process.exit(failed === 0 ? 0 : 1);
  }
}

verifyGeneratedCases();
