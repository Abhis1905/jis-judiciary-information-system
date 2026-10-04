'use strict';

/**
 * Seed Representative Synthetic Appeal Chains
 * - District Court -> High Court
 * - High Court -> Supreme Court
 * - Complete 3-tier: District Court -> High Court -> Supreme Court
 * All records strictly flagged with is_synthetic = 1
 */

require('dotenv').config();
const db = require('../config/db');
const CaseAppeal = require('../models/CaseAppeal');

async function seedAppeals() {
  console.log('--- Seeding Representative Synthetic Appeal Chains ---');

  try {
    // 1. Get an active user (e.g. Registrar or Admin) for created_by
    const [users] = await db.query('SELECT id FROM users LIMIT 1');
    const defaultUserId = users[0]?.id || 1;

    // 2. Fetch court levels
    const [courtLevels] = await db.query('SELECT id, level_code, tier_order, level_name FROM court_levels');
    const scLevel = courtLevels.find(l => l.tier_order === 1);
    const hcLevel = courtLevels.find(l => l.tier_order === 2);
    const distLevel = courtLevels.find(l => l.tier_order === 3);

    // 3. Find candidate district cases (tier 3, 4, 5, or 6) with high court and bench info
    const [districtCases] = await db.query(
      `SELECT c.id, c.case_number, c.title, c.case_type, c.high_court_id, c.bench_id, c.state_ut_id, c.court_level_id
       FROM cases c
       WHERE c.court_level_id IN (3, 4, 5, 6) AND c.high_court_id IS NOT NULL
       LIMIT 10`
    );

    console.log(`Found ${districtCases.length} candidate district cases.`);

    let createdChains = 0;

    // Chain Type A: District Court -> High Court (4 chains)
    for (let i = 0; i < 4 && i < districtCases.length; i++) {
      const origCase = districtCases[i];
      
      // Check if already has appeal
      const [existing] = await db.query('SELECT id FROM case_appeals WHERE original_case_id = ?', [origCase.id]);
      if (existing.length > 0) continue;

      const res = await CaseAppeal.createAppeal({
        originalCaseId: origCase.id,
        destinationCourtLevelId: hcLevel.id,
        destinationHighCourtId: origCase.high_court_id,
        destinationBenchId: origCase.bench_id,
        appealType: origCase.case_type === 'Criminal' ? 'Criminal Appeal / First Appeal' : 'Regular First Appeal (RFA)',
        grounds: 'Substantial question of law regarding statutory interpretation and evidence assessment.',
        filingDate: '2026-02-15',
        userId: defaultUserId,
        isSynthetic: 1
      });

      console.log(`✓ Chain A (${origCase.case_type}): District (${origCase.case_number}) -> High Court (${res.appealCaseNumber})`);
      createdChains++;
    }

    // Chain Type B: Complete 3-tier: District Court -> High Court -> Supreme Court (4 complete chains = 8 appeal dockets)
    for (let i = 4; i < 8 && i < districtCases.length; i++) {
      const origCase = districtCases[i];

      const [existing] = await db.query('SELECT id FROM case_appeals WHERE original_case_id = ?', [origCase.id]);
      if (existing.length > 0) continue;

      // Step 1: District -> High Court
      const hcRes = await CaseAppeal.createAppeal({
        originalCaseId: origCase.id,
        destinationCourtLevelId: hcLevel.id,
        destinationHighCourtId: origCase.high_court_id,
        destinationBenchId: origCase.bench_id,
        appealType: origCase.case_type === 'Criminal' ? 'Criminal Appeal' : 'Regular First Appeal (RFA)',
        grounds: 'Appeal against trial court decree on questions of jurisdiction and merits.',
        filingDate: '2025-06-10',
        userId: defaultUserId,
        isSynthetic: 1
      });

      // Update intermediate HC appeal status to 'Disposed' so next appeal can proceed cleanly
      await db.query("UPDATE case_appeals SET status = 'Disposed' WHERE id = ?", [hcRes.appealId]);
      await db.query("UPDATE cases SET status = 'Closed' WHERE id = ?", [hcRes.appealCaseId]);

      // Step 2: High Court -> Supreme Court
      const scRes = await CaseAppeal.createAppeal({
        originalCaseId: hcRes.appealCaseId,
        destinationCourtLevelId: scLevel.id,
        destinationHighCourtId: null,
        destinationBenchId: null,
        appealType: origCase.case_type === 'Criminal'
          ? 'Special Leave Petition (Criminal) / Article 136'
          : 'Special Leave Petition (Civil) / Article 136',
        grounds: 'Final constitutional challenge and substantial question of law of general public importance.',
        filingDate: '2026-03-01',
        userId: defaultUserId,
        isSynthetic: 1
      });

      console.log(`✓ Chain B (${origCase.case_type} 3-Tier): District (${origCase.case_number}) -> High Court (${hcRes.appealCaseNumber}) -> Supreme Court (${scRes.appealCaseNumber})`);
      createdChains += 2;
    }

    // Chain Type C: High Court -> Supreme Court direct (2 chains starting at High Court)
    const [hcCases] = await db.query(
      `SELECT c.id, c.case_number, c.title, c.case_type, c.high_court_id, c.bench_id, c.state_ut_id, c.court_level_id
       FROM cases c
       WHERE c.court_level_id = 2 AND c.high_court_id IS NOT NULL
       LIMIT 5`
    );

    for (let i = 0; i < 2 && i < hcCases.length; i++) {
      const origCase = hcCases[i];
      const [existing] = await db.query('SELECT id FROM case_appeals WHERE original_case_id = ?', [origCase.id]);
      if (existing.length > 0) continue;

      const scRes = await CaseAppeal.createAppeal({
        originalCaseId: origCase.id,
        destinationCourtLevelId: scLevel.id,
        destinationHighCourtId: null,
        destinationBenchId: null,
        appealType: 'Special Leave Petition (Civil/Criminal) / Article 136 Appeal',
        grounds: 'Constitutional appeal on jurisdictional error and violation of fundamental rights.',
        filingDate: '2026-03-10',
        userId: defaultUserId,
        isSynthetic: 1
      });

      console.log(`✓ Chain C (${origCase.case_type}): High Court (${origCase.case_number}) -> Supreme Court (${scRes.appealCaseNumber})`);
      createdChains++;
    }

    const [[totalAppeals]] = await db.query('SELECT COUNT(*) as count FROM case_appeals');
    console.log(`\n✓ Seeding complete: Total active appeal records in database: ${totalAppeals.count}`);
    process.exit(0);

  } catch (err) {
    console.error('Error seeding representative appeals:', err);
    process.exit(1);
  }
}

seedAppeals();
