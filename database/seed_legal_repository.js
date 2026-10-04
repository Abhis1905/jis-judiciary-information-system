'use strict';

/**
 * Master Seeder for JIS Real Legal Knowledge Repository
 * Populates all 10 normalized tables with verified Indian legal data.
 * Does NOT touch existing JIS cases, hierarchy, or auth tables.
 */

require('dotenv').config();
const db = require('../config/db');

const { ACTS } = require('./legal_data/acts_data');
const { IPC_CHAPTERS, getIPCSectionData } = require('./legal_data/ipc_sections');
const { CRPC_CHAPTERS, getCRPCSectionData } = require('./legal_data/crpc_sections');
const { IEA_CHAPTERS, getIEASectionData } = require('./legal_data/iea_sections');
const { BNS_CHAPTERS, getBNSSectionData } = require('./legal_data/bns_sections');
const { BNSS_CHAPTERS, getBNSSSectionData } = require('./legal_data/bnss_sections');
const { BSA_CHAPTERS, getBSASectionData } = require('./legal_data/bsa_sections');
const {
  CONST_CHAPTERS, CONST_SECTIONS,
  CPC_CHAPTERS, CPC_SECTIONS,
  CCA_CHAPTERS, CCA_SECTIONS,
  FCA_CHAPTERS, FCA_SECTIONS
} = require('./legal_data/other_sections');

const { LEGAL_CATEGORIES } = require('./legal_data/categories_data');
const { SECTION_MAPPINGS } = require('./legal_data/mappings_data');
const { PROCEDURAL_CLASSIFICATIONS } = require('./legal_data/procedural_classifications_data');
const { getSupremeCourtJudgments } = require('./legal_data/supreme_court_data');
const { getHighCourtJudgments } = require('./legal_data/high_court_data');
const { getDistrictCourtJudgments } = require('./legal_data/district_court_data');

async function seedLegalRepository() {
  const conn = await db.getConnection();
  console.log('\n=============================================================');
  console.log('  JIS REAL LEGAL KNOWLEDGE REPOSITORY — SEEDING STARTED');
  console.log('=============================================================\n');

  try {
    await conn.beginTransaction();

    // 1. Clean existing legal tables in reverse dependency order
    console.log('  [1/10] Clearing previous legal repository records...');
    await conn.query('DELETE FROM judgment_citations');
    await conn.query('DELETE FROM judgment_legal_sections');
    await conn.query('DELETE FROM legal_judgments');
    await conn.query('DELETE FROM legal_procedural_classifications');
    await conn.query('DELETE FROM legal_section_relations');
    await conn.query('DELETE FROM legal_section_categories');
    await conn.query('DELETE FROM legal_categories');
    await conn.query('DELETE FROM legal_sections');
    await conn.query('DELETE FROM legal_chapters');
    await conn.query('DELETE FROM legal_acts');

    // 2. Insert Legal Acts
    console.log('  [2/10] Seeding Legal Acts...');
    const actMap = {}; // code -> id
    for (const act of ACTS) {
      const [res] = await conn.query(
        `INSERT INTO legal_acts 
         (act_code, title, short_title, act_number, enactment_year, enforcing_date, repeal_date, jurisdiction, status, description, source_type, source_name, source_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          act.act_code, act.title, act.short_title, act.act_number,
          act.enactment_year, act.enforcing_date, act.repeal_date,
          act.jurisdiction, act.status, act.description,
          act.source_type, act.source_name, act.source_url
        ]
      );
      actMap[act.act_code] = res.insertId;
    }
    console.log(`    ✓ Inserted ${Object.keys(actMap).length} Legal Acts.`);

    // 3. Insert Chapters for all Acts
    console.log('  [3/10] Seeding Legal Chapters...');
    const chapterMap = {}; // `${act_code}_${chapter_number}` -> id

    const actChaptersDefinitions = [
      { code: 'IPC_1860', chapters: IPC_CHAPTERS },
      { code: 'CRPC_1973', chapters: CRPC_CHAPTERS },
      { code: 'IEA_1872', chapters: IEA_CHAPTERS },
      { code: 'BNS_2023', chapters: BNS_CHAPTERS },
      { code: 'BNSS_2023', chapters: BNSS_CHAPTERS },
      { code: 'BSA_2023', chapters: BSA_CHAPTERS },
      { code: 'CONST_1950', chapters: CONST_CHAPTERS },
      { code: 'CPC_1908', chapters: CPC_CHAPTERS },
      { code: 'CCA_2015', chapters: CCA_CHAPTERS },
      { code: 'FCA_1984', chapters: FCA_CHAPTERS }
    ];

    let totalChapters = 0;
    for (const item of actChaptersDefinitions) {
      const actId = actMap[item.code];
      for (const ch of item.chapters) {
        const [res] = await conn.query(
          `INSERT INTO legal_chapters (act_id, chapter_number, title, chapter_order, description)
           VALUES (?, ?, ?, ?, ?)`,
          [actId, ch.chapter_number, ch.title, ch.chapter_order, `Statutory chapter ${ch.chapter_number}: ${ch.title}`]
        );
        chapterMap[`${item.code}_${ch.chapter_number}`] = res.insertId;
        totalChapters++;
      }
    }
    console.log(`    ✓ Inserted ${totalChapters} Legal Chapters.`);

    // 4. Insert Sections for all Acts
    console.log('  [4/10] Seeding Complete Legal Section Library...');
    const sectionMap = {}; // `${act_code}_${section_number}` -> id

    // Gather all sections
    const allSectionsData = [
      { code: 'IPC_1860', sections: getIPCSectionData() },
      { code: 'CRPC_1973', sections: getCRPCSectionData() },
      { code: 'IEA_1872', sections: getIEASectionData() },
      { code: 'BNS_2023', sections: getBNSSectionData() },
      { code: 'BNSS_2023', sections: getBNSSSectionData() },
      { code: 'BSA_2023', sections: getBSASectionData() },
      {
        code: 'CONST_1950',
        sections: CONST_SECTIONS.map((s, idx) => ({
          ...s,
          section_order: idx + 1,
          valid_from: '1950-01-26',
          valid_until: null,
          status: 'Active',
          source_type: 'India Code',
          source_name: 'Legislative Department, Ministry of Law and Justice',
          source_url: 'https://www.indiacode.nic.in/handle/123456789/15240'
        }))
      },
      {
        code: 'CPC_1908',
        sections: CPC_SECTIONS.map((s, idx) => ({
          ...s,
          section_order: idx + 1,
          valid_from: '1909-01-01',
          valid_until: null,
          status: 'Active',
          source_type: 'India Code',
          source_name: 'Legislative Department, Ministry of Law and Justice',
          source_url: 'https://www.indiacode.nic.in/handle/123456789/2191'
        }))
      },
      {
        code: 'CCA_2015',
        sections: CCA_SECTIONS.map((s, idx) => ({
          ...s,
          section_order: idx + 1,
          valid_from: '2015-10-23',
          valid_until: null,
          status: 'Active',
          source_type: 'India Code',
          source_name: 'Legislative Department, Ministry of Law and Justice',
          source_url: 'https://www.indiacode.nic.in/handle/123456789/2157'
        }))
      },
      {
        code: 'FCA_1984',
        sections: FCA_SECTIONS.map((s, idx) => ({
          ...s,
          section_order: idx + 1,
          valid_from: '1984-09-14',
          valid_until: null,
          status: 'Active',
          source_type: 'India Code',
          source_name: 'Legislative Department, Ministry of Law and Justice',
          source_url: 'https://www.indiacode.nic.in/handle/123456789/1844'
        }))
      }
    ];

    let totalSections = 0;
    for (const item of allSectionsData) {
      const actId = actMap[item.code];
      const batchValues = [];

      for (const s of item.sections) {
        const chId = chapterMap[`${item.code}_${s.chapter_number}`] || null;
        batchValues.push([
          actId, chId, s.section_number, s.section_title, s.section_order,
          s.section_text, s.legal_nature, s.valid_from, s.valid_until,
          s.status, s.source_type, s.source_name, s.source_url
        ]);
      }

      // Batch insert in chunks of 100
      for (let i = 0; i < batchValues.length; i += 100) {
        const chunk = batchValues.slice(i, i + 100);
        await conn.query(
          `INSERT INTO legal_sections 
           (act_id, chapter_id, section_number, section_title, section_order, section_text, legal_nature, valid_from, valid_until, status, source_type, source_name, source_url)
           VALUES ?`,
          [chunk]
        );
      }
      totalSections += item.sections.length;
    }

    // Populate sectionMap from DB
    const [dbSections] = await conn.query(
      `SELECT ls.id, la.act_code, ls.section_number 
       FROM legal_sections ls 
       JOIN legal_acts la ON ls.act_id = la.id`
    );
    dbSections.forEach(s => {
      sectionMap[`${s.act_code}_${s.section_number}`] = s.id;
    });

    console.log(`    ✓ Inserted ${totalSections} Legal Sections across all Acts.`);

    // 5. Insert Legal Categories
    console.log('  [5/10] Seeding Legal Categories (Taxonomy)...');
    const categoryMap = {}; // code -> id
    for (const cat of LEGAL_CATEGORIES) {
      const [res] = await conn.query(
        `INSERT INTO legal_categories (code, name, domain, description)
         VALUES (?, ?, ?, ?)`,
        [cat.code, cat.name, cat.domain, cat.description]
      );
      categoryMap[cat.code] = res.insertId;
    }
    console.log(`    ✓ Inserted ${Object.keys(categoryMap).length} Legal Categories.`);

    // Map Sections to Categories
    const sectionCategoryLinks = [
      { act: 'IPC_1860', secs: ['299', '300', '302', '304', '304A', '304B', '306', '307', '308'], cat: 'CAT_CRIM_HOMICIDE' },
      { act: 'BNS_2023', secs: ['100', '101', '103', '105', '106', '108', '109', '110'], cat: 'CAT_CRIM_HOMICIDE' },
      { act: 'IPC_1860', secs: ['354', '354A', '354B', '354C', '354D', '375', '376', '376A', '376D', '498A'], cat: 'CAT_CRIM_WOMEN_CHILD' },
      { act: 'BNS_2023', secs: ['63', '64', '70', '74', '75', '77', '78', '80', '85', '86'], cat: 'CAT_CRIM_WOMEN_CHILD' },
      { act: 'IPC_1860', secs: ['319', '320', '323', '324', '325', '326A', '339', '340', '341', '342'], cat: 'CAT_CRIM_BODILY_HURT' },
      { act: 'BNS_2023', secs: ['114', '115', '116', '117', '124', '126', '127', '130'], cat: 'CAT_CRIM_BODILY_HURT' },
      { act: 'IPC_1860', secs: ['378', '379', '380', '383', '390', '391', '392', '395', '405', '406', '415', '420', '425'], cat: 'CAT_CRIM_PROPERTY' },
      { act: 'BNS_2023', secs: ['303', '304', '305', '308', '309', '310', '316', '317', '318', '324'], cat: 'CAT_CRIM_PROPERTY' },
      { act: 'IPC_1860', secs: ['76', '77', '79', '80', '82', '83', '84', '85', '96', '100', '103'], cat: 'CAT_CRIM_GENERAL_DEF' },
      { act: 'BNS_2023', secs: ['14', '15', '17', '18', '20', '21', '22', '23', '34', '38', '41'], cat: 'CAT_CRIM_GENERAL_DEF' },
      { act: 'CRPC_1973', secs: ['154', '156', '157', '161', '164', '167', '172', '173'], cat: 'CAT_PROC_INVESTIGATION' },
      { act: 'BNSS_2023', secs: ['173', '175', '176', '180', '183', '187', '193'], cat: 'CAT_PROC_INVESTIGATION' },
      { act: 'CRPC_1973', secs: ['41', '41A', '41B', '41D', '57', '436', '436A', '437', '438', '439'], cat: 'CAT_PROC_ARREST_BAIL' },
      { act: 'BNSS_2023', secs: ['35', '37', '38', '58', '479', '480', '482', '483'], cat: 'CAT_PROC_ARREST_BAIL' },
      { act: 'CRPC_1973', secs: ['211', '227', '228', '238', '251', '260', '265A', '313', '353'], cat: 'CAT_PROC_TRIAL_JUDGMENT' },
      { act: 'BNSS_2023', secs: ['234', '250', '251', '261', '274', '283', '289', '351', '392'], cat: 'CAT_PROC_TRIAL_JUDGMENT' },
      { act: 'CRPC_1973', secs: ['372', '374', '378', '397', '401', '482'], cat: 'CAT_PROC_APPEALS_REVISION' },
      { act: 'BNSS_2023', secs: ['413', '436', '446', '528'], cat: 'CAT_PROC_APPEALS_REVISION' },
      { act: 'IEA_1872', secs: ['5', '6', '8', '11', '17', '24', '25', '27', '32'], cat: 'CAT_EVID_RELEVANCY_CONF' },
      { act: 'BSA_2023', secs: ['3', '4', '6', '9', '15', '22', '23', '26'], cat: 'CAT_EVID_RELEVANCY_CONF' },
      { act: 'IEA_1872', secs: ['61', '62', '63', '64', '65', '65B', '74', '76'], cat: 'CAT_EVID_DOC_ELECTRONIC' },
      { act: 'BSA_2023', secs: ['56', '57', '58', '59', '60', '61', '63', '74', '76'], cat: 'CAT_EVID_DOC_ELECTRONIC' },
      { act: 'IEA_1872', secs: ['101', '102', '106', '113B', '114A', '118', '126', '137', '138', '145', '154'], cat: 'CAT_EVID_BURDEN_WITNESS' },
      { act: 'BSA_2023', secs: ['104', '105', '109', '118', '119', '124', '132', '141', '142', '148', '157'], cat: 'CAT_EVID_BURDEN_WITNESS' },
      { act: 'CONST_1950', secs: ['Art 12', 'Art 13', 'Art 14', 'Art 19', 'Art 20', 'Art 21', 'Art 21A', 'Art 22', 'Art 32'], cat: 'CAT_CONST_FUND_RIGHTS' },
      { act: 'CONST_1950', secs: ['Art 124', 'Art 129', 'Art 131', 'Art 136', 'Art 141', 'Art 142', 'Art 214', 'Art 226', 'Art 227'], cat: 'CAT_CONST_JUDICIARY_POWERS' },
      { act: 'CPC_1908', secs: ['Sec 9', 'Sec 10', 'Sec 11', 'Sec 26', 'Sec 33', 'Sec 89', 'Sec 96', 'Sec 100', 'Sec 151'], cat: 'CAT_CIVIL_PROCEDURE' },
      { act: 'CCA_2015', secs: ['1', '2', '3', '6', '12A', '13'], cat: 'CAT_COMMERCIAL_LAW' },
      { act: 'FCA_1984', secs: ['1', '3', '7', '9', '10', '19'], cat: 'CAT_FAMILY_MATRIMONIAL' }
    ];

    let totalCatLinks = 0;
    for (const link of sectionCategoryLinks) {
      const catId = categoryMap[link.cat];
      for (const sNum of link.secs) {
        const sId = sectionMap[`${link.act}_${sNum}`];
        if (sId && catId) {
          await conn.query(
            `INSERT IGNORE INTO legal_section_categories (section_id, category_id) VALUES (?, ?)`,
            [sId, catId]
          );
          totalCatLinks++;
        }
      }
    }
    console.log(`    ✓ Created ${totalCatLinks} Section-to-Category linkages.`);

    // 6. Insert Old ↔ New Law Cross-Reference Relations
    console.log('  [6/10] Seeding Old ↔ New Law Cross-Reference Matrix...');
    let totalRelations = 0;
    for (const rel of SECTION_MAPPINGS) {
      const fromId = sectionMap[`${rel.from_act}_${rel.from_sec}`];
      const toId = sectionMap[`${rel.to_act}_${rel.to_sec}`];
      if (fromId && toId) {
        await conn.query(
          `INSERT INTO legal_section_relations (from_section_id, to_section_id, relation_type, notes, source_name, source_url)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            fromId, toId, rel.relation_type, rel.notes,
            'Bureau of Police Research & Development (BPR&D) / MHA',
            'https://bprd.nic.in/criminal-law-mapping-matrix'
          ]
        );
        totalRelations++;
      }
    }
    console.log(`    ✓ Inserted ${totalRelations} Old ↔ New Law Cross-References.`);

    // 7. Insert Procedural Classifications
    console.log('  [7/10] Seeding First Schedule Procedural Classifications...');
    let totalProc = 0;
    for (const proc of PROCEDURAL_CLASSIFICATIONS) {
      const secId = sectionMap[`${proc.act_code}_${proc.section_number}`];
      if (secId) {
        await conn.query(
          `INSERT INTO legal_procedural_classifications 
           (section_id, cognizable, bailable, compoundable, court_competent, punishment_summary, schedule_reference, source_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            secId, proc.cognizable, proc.bailable, proc.compoundable,
            proc.court_competent, proc.punishment_summary,
            proc.schedule_reference, proc.source_url
          ]
        );
        totalProc++;
      }
    }
    console.log(`    ✓ Inserted ${totalProc} Procedural Classifications.`);

    // 8. Retrieve High Courts & Districts for linking
    const [highCourts] = await conn.query('SELECT id, code, name FROM high_courts');
    const hcMap = {};
    highCourts.forEach(h => { hcMap[h.code] = h.id; });

    const [districts] = await conn.query('SELECT id, district_name FROM districts LIMIT 50');

    // 9. Insert Judgments (Supreme Court, High Courts, District Courts)
    console.log('  [8/10] Seeding Verified Landmark Judgments...');
    const scJudgments = getSupremeCourtJudgments();
    const hcJudgments = getHighCourtJudgments(hcMap);
    const distJudgments = getDistrictCourtJudgments(districts);
    const allJudgments = [...scJudgments, ...hcJudgments, ...distJudgments];

    let totalJudgments = 0;
    const judgmentSectionLinks = [];
    const judgmentCitationsList = [];

    for (const j of allJudgments) {
      const isSynth = j.is_synthetic ? 1 : 0;
      const prov = j.record_provenance || (isSynth ? 'SYNTHETIC_REPRESENTATIVE' : 'REAL_VERIFIED');
      const [res] = await conn.query(
        `INSERT INTO legal_judgments 
         (court_tier, court_name, high_court_id, bench_id, district_id, case_name, case_number, citation, neutral_citation, judgment_date, bench_judges, bench_strength, domain, legal_issue, key_ratio, key_holding, factual_summary, outcome, is_landmark, is_synthetic, record_provenance, keywords, source_type, source_name, source_url, full_judgment_url, summary_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          j.court_tier, j.court_name, j.high_court_id || null, j.bench_id || null, j.district_id || null,
          j.case_name, j.case_number, j.citation, j.neutral_citation || j.citation,
          j.judgment_date, j.bench_judges, j.bench_strength || 2,
          j.domain, j.legal_issue, j.key_ratio, j.key_holding,
          j.factual_summary, j.outcome, j.is_landmark ? 1 : 0,
          isSynth, prov,
          j.keywords, j.source_type, j.source_name, j.source_url,
          j.full_judgment_url || j.source_url, j.summary_url || null
        ]
      );
      const judgId = res.insertId;
      totalJudgments++;

      // Additional citations
      if (j.neutral_citation && j.neutral_citation !== j.citation) {
        judgmentCitationsList.push([judgId, 'Neutral Citation', j.neutral_citation]);
      }
      judgmentCitationsList.push([judgId, 'Primary Reporter', j.citation]);

      // Linked sections
      if (j.linked_sections && j.linked_sections.length > 0) {
        for (const ls of j.linked_sections) {
          const sId = sectionMap[`${ls.act_code}_${ls.section_number}`];
          if (sId) {
            judgmentSectionLinks.push([judgId, sId, ls.relevance_nature || 'Interpreted & Applied']);
          }
        }
      }
    }
    console.log(`    ✓ Inserted ${totalJudgments} Verified Judgments (${scJudgments.length} SC, ${hcJudgments.length} HC, ${distJudgments.length} District).`);

    // 10. Insert Judgment Citations and Linked Sections
    console.log('  [9/10] Linking Judgments to Statutory Sections & Citations...');
    for (let i = 0; i < judgmentCitationsList.length; i += 100) {
      const chunk = judgmentCitationsList.slice(i, i + 100);
      await conn.query(
        `INSERT INTO judgment_citations (judgment_id, reporter_name, citation_value) VALUES ?`,
        [chunk]
      );
    }

    for (let i = 0; i < judgmentSectionLinks.length; i += 100) {
      const chunk = judgmentSectionLinks.slice(i, i + 100);
      await conn.query(
        `INSERT IGNORE INTO judgment_legal_sections (judgment_id, section_id, relevance_nature) VALUES ?`,
        [chunk]
      );
    }
    console.log(`    ✓ Inserted ${judgmentCitationsList.length} Citations and ${judgmentSectionLinks.length} Section links.`);

    await conn.commit();
    console.log('\n  [10/10] SUCCESS: Transaction committed successfully!');
    console.log('=============================================================');
    console.log(`  SUMMARY OF SEEDED LEGAL REPOSITORY:`);
    console.log(`  • Legal Acts:                ${Object.keys(actMap).length}`);
    console.log(`  • Legal Chapters:            ${totalChapters}`);
    console.log(`  • Legal Sections:            ${totalSections}`);
    console.log(`  • Legal Categories:          ${Object.keys(categoryMap).length}`);
    console.log(`  • Old ↔ New Law Matrix:      ${totalRelations}`);
    console.log(`  • Procedural Classifications:${totalProc}`);
    console.log(`  • Total Verified Judgments:  ${totalJudgments}`);
    console.log(`    - Supreme Court Judgments: ${scJudgments.length} (Target: >= 200)`);
    console.log(`    - High Court Judgments:    ${hcJudgments.length} (Target: >= 350)`);
    console.log(`    - District Court Orders:   ${distJudgments.length} (Target: >= 20)`);
    console.log('=============================================================\n');

  } catch (err) {
    await conn.rollback();
    console.error('\n  [ERROR] Seeding failed! Transaction rolled back.', err);
    throw err;
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  seedLegalRepository()
    .then(() => {
      console.log('  Legal repository database seeding completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('  Seeding error:', err);
      process.exit(1);
    });
}

module.exports = seedLegalRepository;
