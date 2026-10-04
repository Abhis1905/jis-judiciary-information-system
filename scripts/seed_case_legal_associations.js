'use strict';

/**
 * Deterministic Legal-Section & Judgment Association Script for 100,000 Synthetic Cases
 * - Sets is_synthetic = 1 and notes = 'Synthetic test association'
 * - Preserves complete separation between real legal repository and synthetic cases.
 * - Pure Node.js / JavaScript.
 */

require('dotenv').config();
const db = require('../config/db');

async function seedCaseLegalAssociations() {
  console.log('\n=============================================================');
  console.log('  SEEDING DETERMINISTIC CASE → LEGAL ASSOCIATIONS');
  console.log('=============================================================\n');

  const conn = await db.getConnection();

  try {
    // 1. Fetch section IDs
    const [sections] = await conn.query(
      `SELECT ls.id, ls.section_number, la.act_code 
       FROM legal_sections ls 
       JOIN legal_acts la ON ls.act_id = la.id`
    );
    const secMap = {};
    sections.forEach(s => { secMap[`${s.act_code}_${s.section_number}`] = s.id; });

    // 2. Fetch judgment IDs
    const [judgments] = await conn.query('SELECT id, case_name, court_tier FROM legal_judgments');
    const scJudgments = judgments.filter(j => j.court_tier === 'Supreme Court of India');
    const hcJudgments = judgments.filter(j => j.court_tier === 'High Court');

    console.log(`  Loaded ${sections.length} legal sections and ${judgments.length} legal judgments.`);

    // Clear existing case-legal associations to ensure idempotency
    console.log('  Clearing previous synthetic case associations...');
    await conn.query('DELETE FROM case_legal_sections WHERE is_synthetic = 1');
    await conn.query('DELETE FROM case_legal_judgments WHERE is_synthetic = 1');

    // 3. Process cases in batches of 10,000
    const [[{ totalCases }]] = await conn.query('SELECT COUNT(*) as totalCases FROM cases');
    console.log(`  Associating legal provisions for ${totalCases} synthetic cases in chunks...`);

    const BATCH_SIZE = 10000;
    let offset = 0;
    let totalSecAssoc = 0;
    let totalJudgAssoc = 0;

    const startTime = Date.now();

    while (offset < totalCases) {
      const [cases] = await conn.query(
        'SELECT id, case_type, filing_date FROM cases ORDER BY id ASC LIMIT ? OFFSET ?',
        [BATCH_SIZE, offset]
      );

      if (cases.length === 0) break;

      const secInserts = [];
      const judgInserts = [];

      for (const c of cases) {
        const fDate = new Date(c.filing_date);
        const isPreTransition = fDate < new Date('2024-07-01');

        if (c.case_type === 'Criminal' || !c.case_type) {
          if (isPreTransition) {
            // IPC + CrPC + IEA
            const pSec = (c.id % 4 === 0) ? '302' : (c.id % 4 === 1 ? '420' : (c.id % 4 === 2 ? '376' : '307'));
            if (secMap[`IPC_1860_${pSec}`]) {
              secInserts.push([c.id, secMap[`IPC_1860_${pSec}`], 'PRIMARY', 1, 'Synthetic test association']);
            }
            if (secMap['CRPC_1973_154']) {
              secInserts.push([c.id, secMap['CRPC_1973_154'], 'PROCEDURAL', 1, 'Synthetic test association']);
            }
            if (secMap['IEA_1872_27']) {
              secInserts.push([c.id, secMap['IEA_1872_27'], 'EVIDENTIARY', 1, 'Synthetic test association']);
            }
          } else {
            // BNS + BNSS + BSA
            const pSec = (c.id % 4 === 0) ? '103' : (c.id % 4 === 1 ? '318' : (c.id % 4 === 2 ? '64' : '109'));
            if (secMap[`BNS_2023_${pSec}`]) {
              secInserts.push([c.id, secMap[`BNS_2023_${pSec}`], 'PRIMARY', 1, 'Synthetic test association']);
            }
            if (secMap['BNSS_2023_173']) {
              secInserts.push([c.id, secMap['BNSS_2023_173'], 'PROCEDURAL', 1, 'Synthetic test association']);
            }
            if (secMap['BSA_2023_23']) {
              secInserts.push([c.id, secMap['BSA_2023_23'], 'EVIDENTIARY', 1, 'Synthetic test association']);
            }
          }

          // Precedents
          if (scJudgments.length > 0) {
            const scJudg = scJudgments[c.id % scJudgments.length];
            judgInserts.push([c.id, scJudg.id, 'PRECEDENT', 1, 'Synthetic test association']);
          }
          if (hcJudgments.length > 0 && c.id % 3 === 0) {
            const hcJudg = hcJudgments[c.id % hcJudgments.length];
            judgInserts.push([c.id, hcJudg.id, 'RELATED', 1, 'Synthetic test association']);
          }

        } else if (c.case_type === 'Civil') {
          if (secMap['CPC_1908_Sec 9']) {
            secInserts.push([c.id, secMap['CPC_1908_Sec 9'], 'PRIMARY', 1, 'Synthetic test association']);
          }
          if (secMap['CPC_1908_Sec 11']) {
            secInserts.push([c.id, secMap['CPC_1908_Sec 11'], 'PROCEDURAL', 1, 'Synthetic test association']);
          }
          if (scJudgments.length > 0) {
            judgInserts.push([c.id, scJudgments[(c.id + 5) % scJudgments.length].id, 'PRECEDENT', 1, 'Synthetic test association']);
          }
        } else if (c.case_type === 'Commercial') {
          if (secMap['CCA_2015_6']) {
            secInserts.push([c.id, secMap['CCA_2015_6'], 'PRIMARY', 1, 'Synthetic test association']);
          }
          if (secMap['CCA_2015_12A']) {
            secInserts.push([c.id, secMap['CCA_2015_12A'], 'PROCEDURAL', 1, 'Synthetic test association']);
          }
          if (scJudgments.length > 0) {
            judgInserts.push([c.id, scJudgments[(c.id + 10) % scJudgments.length].id, 'PRECEDENT', 1, 'Synthetic test association']);
          }
        } else if (c.case_type === 'Family') {
          if (secMap['FCA_1984_7']) {
            secInserts.push([c.id, secMap['FCA_1984_7'], 'PRIMARY', 1, 'Synthetic test association']);
          }
          if (secMap['FCA_1984_9']) {
            secInserts.push([c.id, secMap['FCA_1984_9'], 'PROCEDURAL', 1, 'Synthetic test association']);
          }
          if (scJudgments.length > 0) {
            judgInserts.push([c.id, scJudgments[(c.id + 15) % scJudgments.length].id, 'PRECEDENT', 1, 'Synthetic test association']);
          }
        } else if (c.case_type === 'Constitutional') {
          if (secMap['CONST_1950_Art 21']) {
            secInserts.push([c.id, secMap['CONST_1950_Art 21'], 'PRIMARY', 1, 'Synthetic test association']);
          }
          if (secMap['CONST_1950_Art 226']) {
            secInserts.push([c.id, secMap['CONST_1950_Art 226'], 'PROCEDURAL', 1, 'Synthetic test association']);
          }
          if (scJudgments.length > 0) {
            judgInserts.push([c.id, scJudgments[0].id, 'PRECEDENT', 1, 'Synthetic test association']);
          }
        }
      }

      // Bulk insert sections
      if (secInserts.length > 0) {
        for (let i = 0; i < secInserts.length; i += 2000) {
          const chunk = secInserts.slice(i, i + 2000);
          await conn.query(
            `INSERT IGNORE INTO case_legal_sections 
             (case_id, legal_section_id, relevance_type, is_synthetic, notes) VALUES ?`,
            [chunk]
          );
        }
        totalSecAssoc += secInserts.length;
      }

      // Bulk insert judgments
      if (judgInserts.length > 0) {
        for (let i = 0; i < judgInserts.length; i += 2000) {
          const chunk = judgInserts.slice(i, i + 2000);
          await conn.query(
            `INSERT IGNORE INTO case_legal_judgments 
             (case_id, judgment_id, relevance_type, is_synthetic, notes) VALUES ?`,
            [chunk]
          );
        }
        totalJudgAssoc += judgInserts.length;
      }

      offset += BATCH_SIZE;
      console.log(`  Processed ${Math.min(offset, totalCases)} / ${totalCases} cases...`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n=============================================================');
    console.log(`  ✓ SUCCESS: Association complete in ${duration}s.`);
    console.log(`  • Total Case-Section Associations:  ${totalSecAssoc}`);
    console.log(`  • Total Case-Judgment Associations: ${totalJudgAssoc}`);
    console.log('=============================================================\n');

  } catch (err) {
    console.error('Error during case legal seeding:', err);
    throw err;
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  seedCaseLegalAssociations()
    .then(() => {
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = seedCaseLegalAssociations;
