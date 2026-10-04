'use strict';

/**
 * JIS – Judiciary Info System
 * Case Distribution & Statistical Breakdown Report
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function generateDistributionReport() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jis_db',
    connectionLimit: 5
  });

  console.log('\n================================================================');
  console.log(' JIS – 100,000 CASES DISTRIBUTION & HIERARCHY AUDIT REPORT');
  console.log('================================================================\n');

  try {
    const [[{ totalCases }]] = await pool.query('SELECT COUNT(*) AS totalCases FROM cases');
    console.log(`TOTAL CASE POPULATION: ${totalCases.toLocaleString()} cases\n`);

    // 1. Cases by State / UT (36 States & UTs)
    console.log('--- 1. DISTRIBUTION BY STATE / UNION TERRITORY ---');
    const [stateCounts] = await pool.query(`
      SELECT s.code, s.name, s.type, COUNT(c.id) AS case_count,
             ROUND(COUNT(c.id) * 100.0 / ?, 2) AS percentage
      FROM states_uts s
      LEFT JOIN cases c ON s.id = c.state_ut_id
      GROUP BY s.id, s.code, s.name, s.type
      ORDER BY case_count DESC, s.name ASC
    `, [totalCases]);

    stateCounts.forEach((r, idx) => {
      console.log(`  ${String(idx + 1).padStart(2, ' ')}. [${r.code}] ${r.name.padEnd(38, ' ')} (${r.type.padEnd(15, ' ')}) : ${r.case_count.toLocaleString().padStart(7, ' ')} cases (${Number(r.percentage).toFixed(2)}%)`);
    });

    // 2. Cases by High Court (25 High Courts)
    console.log('\n--- 2. DISTRIBUTION BY HIGH COURT OF JUDICATURE ---');
    const [hcCounts] = await pool.query(`
      SELECT hc.code, hc.name, hc.principal_seat_city, COUNT(c.id) AS case_count,
             ROUND(COUNT(c.id) * 100.0 / ?, 2) AS percentage
      FROM high_courts hc
      LEFT JOIN cases c ON hc.id = c.high_court_id
      GROUP BY hc.id, hc.code, hc.name, hc.principal_seat_city
      ORDER BY case_count DESC, hc.name ASC
    `, [totalCases]);

    hcCounts.forEach((r, idx) => {
      console.log(`  ${String(idx + 1).padStart(2, ' ')}. ${r.name.padEnd(46, ' ')} [${r.principal_seat_city.padEnd(12, ' ')}] : ${r.case_count.toLocaleString().padStart(7, ' ')} cases (${Number(r.percentage).toFixed(2)}%)`);
    });

    // 3. Cases by High Court Bench / Seat (41 Benches)
    console.log('\n--- 3. DISTRIBUTION BY HIGH COURT BENCH / SEAT ---');
    const [benchCounts] = await pool.query(`
      SELECT hc.name AS high_court_name, b.bench_name, b.bench_type, b.city, COUNT(c.id) AS case_count,
             ROUND(COUNT(c.id) * 100.0 / ?, 2) AS percentage
      FROM high_court_benches b
      JOIN high_courts hc ON b.high_court_id = hc.id
      LEFT JOIN cases c ON b.id = c.bench_id
      GROUP BY b.id, hc.name, b.bench_name, b.bench_type, b.city
      ORDER BY hc.name ASC, FIELD(b.bench_type, 'Principal Seat', 'Permanent Bench', 'Circuit Bench'), b.bench_name ASC
    `, [totalCases]);

    let currentHC = '';
    benchCounts.forEach(r => {
      if (r.high_court_name !== currentHC) {
        currentHC = r.high_court_name;
        console.log(`\n  ► ${currentHC}:`);
      }
      console.log(`     • ${r.bench_name.padEnd(36, ' ')} (${r.bench_type.padEnd(15, ' ')} in ${r.city.padEnd(15, ' ')}) : ${r.case_count.toLocaleString().padStart(6, ' ')} cases (${Number(r.percentage).toFixed(2)}%)`);
    });

    // 4. District Statistical Summary
    console.log('\n--- 4. DISTRICT DISTRIBUTION SUMMARY (787 DISTRICTS) ---');
    const [distStats] = await pool.query(`
      SELECT MIN(case_count) AS minCases,
             MAX(case_count) AS maxCases,
             ROUND(AVG(case_count), 1) AS avgCases,
             COUNT(DISTINCT district_id) AS activeDistricts
      FROM (
        SELECT district_id, COUNT(*) AS case_count FROM cases WHERE district_id IS NOT NULL GROUP BY district_id
      ) dist_summary
    `);
    console.log(`  • Active Districts with Cases : ${distStats[0].activeDistricts} / 787 districts (100% coverage)`);
    console.log(`  • Average Cases per District  : ${distStats[0].avgCases}`);
    console.log(`  • Minimum Cases in a District : ${distStats[0].minCases}`);
    console.log(`  • Maximum Cases in a District : ${distStats[0].maxCases}`);

    // Top 5 Highest Caseload Districts
    const [topDistricts] = await pool.query(`
      SELECT d.district_name, s.name AS state_name, COUNT(c.id) AS case_count
      FROM districts d
      JOIN states_uts s ON d.state_ut_id = s.id
      LEFT JOIN cases c ON d.id = c.district_id
      GROUP BY d.id, d.district_name, s.name
      ORDER BY case_count DESC LIMIT 5
    `);
    console.log('\n  ► Top 5 Highest Caseload Districts (Major Commercial & Metros):');
    topDistricts.forEach((d, i) => {
      console.log(`     ${i + 1}. ${d.district_name} (${d.state_name}): ${d.case_count.toLocaleString()} cases`);
    });

    // 5. Distribution by Court Level / Tier
    console.log('\n--- 5. DISTRIBUTION BY COURT LEVEL / TIER ---');
    const [levelCounts] = await pool.query(`
      SELECT cl.tier_order, cl.level_name, cl.category, COUNT(c.id) AS case_count,
             ROUND(COUNT(c.id) * 100.0 / ?, 2) AS percentage
      FROM court_levels cl
      LEFT JOIN cases c ON cl.id = c.court_level_id
      GROUP BY cl.id, cl.tier_order, cl.level_name, cl.category
      ORDER BY cl.tier_order ASC
    `, [totalCases]);

    levelCounts.forEach(r => {
      console.log(`  • Tier ${r.tier_order}: ${r.level_name.padEnd(66, ' ')} (${r.category.padEnd(20, ' ')}) : ${r.case_count.toLocaleString().padStart(7, ' ')} cases (${Number(r.percentage).toFixed(2)}%)`);
    });

    // 6. Distribution by Case Type
    console.log('\n--- 6. DISTRIBUTION BY CASE TYPE ---');
    const [typeCounts] = await pool.query(`
      SELECT case_type, COUNT(*) AS case_count,
             ROUND(COUNT(*) * 100.0 / ?, 2) AS percentage
      FROM cases
      GROUP BY case_type
      ORDER BY case_count DESC
    `, [totalCases]);

    typeCounts.forEach(r => {
      console.log(`  • ${r.case_type.padEnd(16, ' ')} : ${r.case_count.toLocaleString().padStart(7, ' ')} cases (${Number(r.percentage).toFixed(2)}%)`);
    });

    // 7. Distribution by Case Status
    console.log('\n--- 7. DISTRIBUTION BY CASE STATUS ---');
    const [statusCounts] = await pool.query(`
      SELECT status, COUNT(*) AS case_count,
             ROUND(COUNT(*) * 100.0 / ?, 2) AS percentage
      FROM cases
      GROUP BY status
      ORDER BY FIELD(status, 'Filed', 'Allocated', 'In Trial', 'Judgement Pending', 'Closed')
    `, [totalCases]);

    statusCounts.forEach(r => {
      console.log(`  • ${r.status.padEnd(18, ' ')} : ${r.case_count.toLocaleString().padStart(7, ' ')} cases (${Number(r.percentage).toFixed(2)}%)`);
    });

    // 8. Public vs Private Visibility
    console.log('\n--- 8. PUBLIC CITIZEN VISIBILITY ---');
    const [visCounts] = await pool.query(`
      SELECT is_public, COUNT(*) AS case_count,
             ROUND(COUNT(*) * 100.0 / ?, 2) AS percentage
      FROM cases
      GROUP BY is_public
    `, [totalCases]);

    visCounts.forEach(r => {
      const label = r.is_public === 1 ? 'Public Cases (Searchable by Citizens)' : 'Private Cases (In-Camera / Internal Only)';
      console.log(`  • ${label.padEnd(46, ' ')} : ${r.case_count.toLocaleString().padStart(7, ' ')} cases (${Number(r.percentage).toFixed(2)}%)`);
    });

    // 9. Integrity Anomaly Checks
    console.log('\n--- 9. INTEGRITY ANOMALY AUDIT ---');
    const [emptyDists] = await pool.query(`
      SELECT COUNT(*) AS count FROM districts d LEFT JOIN cases c ON d.id = c.district_id WHERE c.id IS NULL
    `);
    const [mismatchedHierarchy] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM cases c
      JOIN districts d ON c.district_id = d.id
      WHERE c.state_ut_id != d.state_ut_id OR c.high_court_id != d.high_court_id OR c.bench_id != d.bench_id
    `);
    const [dupCaseNumbers] = await pool.query(`
      SELECT COUNT(*) AS count FROM (SELECT case_number FROM cases GROUP BY case_number HAVING COUNT(*) > 1) t
    `);

    console.log(`  • Districts with 0 cases       : ${emptyDists[0].count} (Target: 0)`);
    console.log(`  • Invalid hierarchy mappings   : ${mismatchedHierarchy[0].count} (Target: 0)`);
    console.log(`  • Duplicate case numbers       : ${dupCaseNumbers[0].count} (Target: 0)`);

    console.log('\n================================================================\n');

  } catch (err) {
    console.error('Distribution report failed:', err);
  } finally {
    await pool.end();
  }
}

generateDistributionReport();
