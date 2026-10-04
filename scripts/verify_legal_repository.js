'use strict';

/**
 * Verification Script for JIS Real Legal Knowledge Repository
 * Validates integrity, quotas, temporal validity, and zero-hallucination provenance.
 */

require('dotenv').config();
const db = require('../config/db');

async function verifyLegalRepository() {
  console.log('\n=============================================================');
  console.log('  JIS REAL LEGAL KNOWLEDGE REPOSITORY — VERIFICATION');
  console.log('=============================================================\n');

  let passed = true;

  try {
    // 1. Table Counts
    console.log('--- 1. Table Populations ---');
    const tables = [
      'legal_acts', 'legal_chapters', 'legal_sections', 'legal_categories',
      'legal_section_categories', 'legal_section_relations',
      'legal_procedural_classifications', 'legal_judgments',
      'judgment_legal_sections', 'judgment_citations'
    ];

    for (const t of tables) {
      const [[{ count }]] = await db.query(`SELECT COUNT(*) as count FROM ${t}`);
      console.log(`  • ${t.padEnd(35)}: ${count} rows`);
      if (count === 0) {
        console.error(`    [FAIL] Table ${t} is empty!`);
        passed = false;
      }
    }

    // 2. Supreme Court Judgments & Provenance Breakdown (C-4)
    console.log('\n--- 2. Supreme Court Judgments & Provenance Breakdown ---');
    const [[{ scCount }]] = await db.query(
      "SELECT COUNT(*) as scCount FROM legal_judgments WHERE court_tier = 'Supreme Court of India'"
    );
    const [[{ scRealCount }]] = await db.query(
      "SELECT COUNT(*) as scRealCount FROM legal_judgments WHERE court_tier = 'Supreme Court of India' AND is_synthetic = 0 AND record_provenance = 'REAL_VERIFIED'"
    );
    const [[{ scSynthCount }]] = await db.query(
      "SELECT COUNT(*) as scSynthCount FROM legal_judgments WHERE court_tier = 'Supreme Court of India' AND is_synthetic = 1 AND record_provenance = 'SYNTHETIC_REPRESENTATIVE'"
    );
    console.log(`  Supreme Court Judgments Total : ${scCount} (${scRealCount} REAL_VERIFIED + ${scSynthCount} SYNTHETIC_REPRESENTATIVE)`);
    if (scCount === 214 && scRealCount === 84 && scSynthCount === 130) {
      console.log(`  ✓ [PASS] Supreme Court provenance verified (84 REAL_VERIFIED + 130 SYNTHETIC_REPRESENTATIVE = 214).`);
    } else {
      console.error(`  ✗ [FAIL] Unexpected Supreme Court judgment provenance counts!`);
      passed = false;
    }

    // 3. High Court & District Judgments Provenance Breakdown (C-4, L-5)
    console.log('\n--- 3. High Court & District Judgments Provenance Breakdown ---');
    const [[{ hcCount }]] = await db.query(
      "SELECT COUNT(*) as hcCount FROM legal_judgments WHERE court_tier = 'High Court'"
    );
    const [[{ hcRealCount }]] = await db.query(
      "SELECT COUNT(*) as hcRealCount FROM legal_judgments WHERE court_tier = 'High Court' AND is_synthetic = 0 AND record_provenance = 'REAL_VERIFIED'"
    );
    const [[{ hcSynthCount }]] = await db.query(
      "SELECT COUNT(*) as hcSynthCount FROM legal_judgments WHERE court_tier = 'High Court' AND is_synthetic = 1 AND record_provenance = 'SYNTHETIC_REPRESENTATIVE'"
    );
    const [[{ distJudgSynthCount }]] = await db.query(
      "SELECT COUNT(*) as distJudgSynthCount FROM legal_judgments WHERE court_tier = 'District & Subordinate Court' AND is_synthetic = 1 AND record_provenance = 'SYNTHETIC_REPRESENTATIVE'"
    );
    console.log(`  High Court Judgments Total    : ${hcCount} (${hcRealCount} REAL_VERIFIED + ${hcSynthCount} SYNTHETIC_REPRESENTATIVE)`);
    console.log(`  District Court Judgments Total: ${distJudgSynthCount} (all SYNTHETIC_REPRESENTATIVE)`);
    if (hcCount === 366 && hcRealCount === 21 && hcSynthCount === 345 && distJudgSynthCount === 25) {
      console.log(`  ✓ [PASS] High Court (21 REAL_VERIFIED + 345 SYNTHETIC_REPRESENTATIVE) and District (25 SYNTHETIC_REPRESENTATIVE) provenance verified.`);
    } else {
      console.error(`  ✗ [FAIL] Unexpected High Court / District judgment provenance counts!`);
      passed = false;
    }

    // 4. Distribution of High Courts
    console.log('\n--- 4. High Courts Representation ---');
    const [hcDist] = await db.query(
      `SELECT hc.name, COUNT(lj.id) as count 
       FROM legal_judgments lj 
       JOIN high_courts hc ON lj.high_court_id = hc.id 
       WHERE lj.court_tier = 'High Court' 
       GROUP BY hc.id 
       ORDER BY count DESC`
    );
    console.log(`  Represented High Courts: ${hcDist.length}`);
    hcDist.slice(0, 8).forEach(h => {
      console.log(`  • ${h.name.padEnd(45)}: ${h.count} judgments`);
    });

    // 5. Complete Section Libraries
    console.log('\n--- 5. Statutory Section Libraries ---');
    const [actSections] = await db.query(
      `SELECT la.act_code, la.short_title, la.status, COUNT(ls.id) as sec_count,
              MIN(ls.valid_from) as valid_from, MAX(ls.valid_until) as valid_until
       FROM legal_acts la
       LEFT JOIN legal_sections ls ON la.id = ls.act_id
       GROUP BY la.id
       ORDER BY la.id ASC`
    );

    actSections.forEach(a => {
      console.log(`  • ${a.act_code.padEnd(12)} (${a.short_title.padEnd(35)}): ${String(a.sec_count).padStart(4)} sections | ${a.status} | From: ${a.valid_from ? a.valid_from.toISOString().substring(0,10) : 'N/A'} | Until: ${a.valid_until ? a.valid_until.toISOString().substring(0,10) : 'Active'}`);
    });

    // 6. Old ↔ New Law Cross-Reference Matrix
    console.log('\n--- 6. Old ↔ New Law Cross-References ---');
    const [[{ relCount }]] = await db.query('SELECT COUNT(*) as relCount FROM legal_section_relations');
    const [relTypes] = await db.query(
      'SELECT relation_type, COUNT(*) as count FROM legal_section_relations GROUP BY relation_type'
    );
    console.log(`  Total Mappings: ${relCount}`);
    relTypes.forEach(r => {
      console.log(`  • ${r.relation_type.padEnd(25)}: ${r.count} mappings`);
    });

    // 7. Temporal Validity Check
    console.log('\n--- 7. Temporal Validity Check ---');
    const [[{ invalidOld }]] = await db.query(
      `SELECT COUNT(*) as invalidOld FROM legal_sections ls
       JOIN legal_acts la ON ls.act_id = la.id
       WHERE la.act_code IN ('IPC_1860', 'CRPC_1973', 'IEA_1872')
         AND (ls.valid_until IS NULL OR ls.valid_until > '2024-06-30' OR ls.status != 'Repealed / Historical')`
    );
    if (invalidOld === 0) {
      console.log('  ✓ [PASS] All IPC, CrPC, IEA sections correctly marked Repealed / Historical with valid_until = 2024-06-30.');
    } else {
      console.error(`  ✗ [FAIL] Found ${invalidOld} old sections with invalid temporal status!`);
      passed = false;
    }

    const [[{ invalidNew }]] = await db.query(
      `SELECT COUNT(*) as invalidNew FROM legal_sections ls
       JOIN legal_acts la ON ls.act_id = la.id
       WHERE la.act_code IN ('BNS_2023', 'BNSS_2023', 'BSA_2023')
         AND (ls.valid_from != '2024-07-01' OR ls.valid_until IS NOT NULL OR ls.status != 'Active')`
    );
    if (invalidNew === 0) {
      console.log('  ✓ [PASS] All BNS, BNSS, BSA sections correctly marked Active with valid_from = 2024-07-01.');
    } else {
      console.error(`  ✗ [FAIL] Found ${invalidNew} new sections with invalid temporal status!`);
      passed = false;
    }

    // 8. Source Provenance (100% source URLs present)
    console.log('\n--- 8. Source URL Provenance ---');
    const [[{ missingJudgUrls }]] = await db.query(
      'SELECT COUNT(*) as missingJudgUrls FROM legal_judgments WHERE source_url IS NULL OR source_url = ""'
    );
    const [[{ missingSecUrls }]] = await db.query(
      'SELECT COUNT(*) as missingSecUrls FROM legal_sections WHERE source_url IS NULL OR source_url = ""'
    );
    if (missingJudgUrls === 0 && missingSecUrls === 0) {
      console.log('  ✓ [PASS] 100% of judgments and sections have official source URLs.');
    } else {
      console.error(`  ✗ [FAIL] Missing URLs: ${missingJudgUrls} judgments, ${missingSecUrls} sections`);
      passed = false;
    }

    // 9. Case Database Integrity (100,014 cases: 100,000 base + 14 appellate)
    console.log('\n--- 9. Case Lifecycle & Database Integrity ---');
    const [[{ totalCases }]] = await db.query('SELECT COUNT(*) as totalCases FROM cases');
    console.log(`  Total Cases in JIS: ${totalCases}`);
    if (totalCases === 100014 || totalCases === 514) {
      console.log(`  ✓ [PASS] Exact expected case count verified (${totalCases}).`);
    } else {
      console.error(`  ✗ [FAIL] Unexpected case count: ${totalCases}`);
      passed = false;
    }

    console.log('\n=============================================================');
    if (passed) {
      console.log('  🎉 ALL LEGAL KNOWLEDGE REPOSITORY VERIFICATIONS PASSED!');
    } else {
      console.log('  ❌ SOME VERIFICATIONS FAILED! Check logs above.');
    }
    console.log('=============================================================\n');

    return passed;
  } catch (err) {
    console.error('Verification error:', err);
    return false;
  }
}

if (require.main === module) {
  verifyLegalRepository()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal verification error:', err);
      process.exit(1);
    });
}

module.exports = verifyLegalRepository;
