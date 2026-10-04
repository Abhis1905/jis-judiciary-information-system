'use strict';

/**
 * End-to-End Test Suite for JIS Final Backend Phase 1:
 * Appellate Workflow (Lower Court -> High Court -> Supreme Court)
 *
 * Covers all 18 specified validation checkpoints against isolated jis_test_db.
 */

process.env.NODE_ENV = 'test';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.test') });

const http = require('http');
const app = require('./app');
const db = require('./config/db');
const CaseAppeal = require('./models/CaseAppeal');

let server;
const PORT = 3097;

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'JIS-Appellate-Workflow-Test-Agent/1.0'
    };

    if (postData) {
      if (typeof postData === 'object' && !(postData instanceof Buffer)) {
        postData = JSON.stringify(postData);
        defaultHeaders['Content-Type'] = 'application/json';
      }
      defaultHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const reqOptions = {
      hostname: '127.0.0.1',
      port: PORT,
      path: options.path,
      method: options.method || 'GET',
      headers: { ...defaultHeaders, ...(options.headers || {}) }
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function parseCookie(setCookieHeaders) {
  if (!setCookieHeaders) return '';
  const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  return cookies.map(c => c.split(';')[0]).join('; ');
}

function extractCsrf(html) {
  const match = html.match(/name="_csrf"\s+value="([^"]+)"/);
  return match ? match[1] : '';
}

async function loginUser(email, password = 'Password@123') {
  const getLogin = await request({ path: '/login', method: 'GET' });
  const preCookie = parseCookie(getLogin.headers['set-cookie']);
  const csrfToken = extractCsrf(getLogin.body);

  const postBody = `_csrf=${encodeURIComponent(csrfToken)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
  const res = await request({
    path: '/login',
    method: 'POST',
    headers: {
      'Cookie': preCookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }, postBody);

  return parseCookie(res.headers['set-cookie']) || preCookie;
}

async function runTests() {
  console.log('\n======================================================');
  console.log(' JIS – Appellate Workflow Integration Test Suite     ');
  console.log(' (Lower Court -> High Court -> Supreme Court)         ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      console.log(`  ✔ PASS: ${message}`);
    } else {
      failed++;
      console.error(`  ✖ FAIL: ${message}`);
    }
  }

  server = app.listen(PORT);
  let appealToHc = null;
  let appealToSc = null;

  try {
    // Checkpoint 1: Valid District -> High Court Appeal Creation
    console.log('--- Checkpoint 1: Valid District -> High Court Appeal Creation ---');
    const [[districtCase]] = await db.query(
      `SELECT c.* FROM cases c
       JOIN court_levels cl ON c.court_level_id = cl.id
       LEFT JOIN case_appeals ca ON c.id = ca.original_case_id
       WHERE cl.tier_order = 3 AND ca.id IS NULL AND c.high_court_id IS NOT NULL
       LIMIT 1`
    );
    assert(districtCase !== undefined, `Found available District Court case ID ${districtCase ? districtCase.id : 'N/A'}`);

    const [[hcLevel]] = await db.query('SELECT id, tier_order FROM court_levels WHERE tier_order = 2 LIMIT 1');
    assert(hcLevel !== undefined, 'Found High Court level (tier_order = 2)');

    // Associate a legal section to the district case before appeal so batch inheritance (H-7) is tested
    const [[testSec]] = await db.query('SELECT id FROM legal_sections WHERE section_number = "302" LIMIT 1');
    if (testSec) {
      await db.query(
        `INSERT IGNORE INTO case_legal_sections (case_id, legal_section_id, relevance_type, is_synthetic, notes)
         VALUES (?, ?, 'PRIMARY', 1, 'Trial Court Charge')`,
        [districtCase.id, testSec.id]
      );
    }

    appealToHc = await CaseAppeal.createAppeal({
      originalCaseId: districtCase.id,
      destinationCourtLevelId: hcLevel.id,
      destinationHighCourtId: districtCase.high_court_id,
      destinationBenchId: districtCase.bench_id,
      appealType: 'First Appeal (District to HC)',
      grounds: 'Challenge against trial court decree on grounds of substantial question of law.',
      filingDate: '2025-02-15',
      userId: 1,
      isSynthetic: 1
    });

    assert(appealToHc && appealToHc.appealId > 0, `Appeal record created with ID ${appealToHc.appealId}`);
    assert(appealToHc.appealCaseNumber.startsWith('JIS/APP/HC/'), `Generated HC appeal case number ${appealToHc.appealCaseNumber}`);

    const [[dbAppealRecord]] = await db.query('SELECT * FROM case_appeals WHERE id = ?', [appealToHc.appealId]);
    assert(dbAppealRecord !== undefined, 'Appeal record persists in case_appeals table');
    assert(dbAppealRecord.appeal_level === 'DISTRICT_TO_HIGH_COURT', `appeal_level set to ${dbAppealRecord.appeal_level}`);
    assert(dbAppealRecord.original_case_id === districtCase.id, `original_case_id correctly linked to ${districtCase.id}`);
    assert(dbAppealRecord.appeal_case_id === appealToHc.appealCaseId, `appeal_case_id correctly linked to ${appealToHc.appealCaseId}`);
    assert(dbAppealRecord.provenance === 'SYNTHETIC_WORKFLOW', `provenance column set to ${dbAppealRecord.provenance} (M-10)`);

    // Checkpoint 2: Valid High Court -> Supreme Court Appeal Creation
    console.log('\n--- Checkpoint 2: Valid High Court -> Supreme Court Appeal Creation ---');
    const [[scLevel]] = await db.query('SELECT id, tier_order FROM court_levels WHERE tier_order = 1 LIMIT 1');
    assert(scLevel !== undefined, 'Found Supreme Court level (tier_order = 1)');

    appealToSc = await CaseAppeal.createAppeal({
      originalCaseId: appealToHc.appealCaseId,
      destinationCourtLevelId: scLevel.id,
      appealType: 'Special Leave Petition (Civil) under Article 136',
      grounds: 'Apex constitutional question regarding jurisdictional overreach.',
      filingDate: '2025-06-20',
      userId: 1,
      isSynthetic: 1
    });

    assert(appealToSc && appealToSc.appealId > 0, `SC Appeal record created with ID ${appealToSc.appealId}`);
    assert(appealToSc.appealCaseNumber.startsWith('JIS/APP/SC/'), `Generated SC appeal case number ${appealToSc.appealCaseNumber}`);

    const [[dbScAppealRecord]] = await db.query('SELECT * FROM case_appeals WHERE id = ?', [appealToSc.appealId]);
    assert(dbScAppealRecord.appeal_level === 'HIGH_COURT_TO_SUPREME_COURT', `SC appeal_level set to ${dbScAppealRecord.appeal_level}`);
    assert(dbScAppealRecord.governing_statute.includes('136') || dbScAppealRecord.governing_statute.includes('Constitution'), `Governing statute recorded: ${dbScAppealRecord.governing_statute}`);

    // Checkpoint 3: Invalid Direct District -> Supreme Court Appeal Rejected
    console.log('\n--- Checkpoint 3: Direct District -> Supreme Court Rejection ---');
    const [[anotherDistrictCase]] = await db.query(
      `SELECT c.* FROM cases c
       JOIN court_levels cl ON c.court_level_id = cl.id
       WHERE cl.tier_order >= 3 AND c.id != ?
       LIMIT 1`,
      [districtCase.id]
    );

    let rejectedDirectSc = false;
    try {
      await CaseAppeal.createAppeal({
        originalCaseId: anotherDistrictCase.id,
        destinationCourtLevelId: scLevel.id,
        appealType: 'Direct Apex Appeal',
        grounds: 'Attempting invalid direct appeal.',
        userId: 1
      });
    } catch (err) {
      rejectedDirectSc = true;
      assert(err.message.includes('prohibited') || err.message.includes('progress through the High Court'), `Direct District->SC appeal rejected: "${err.message}"`);
    }
    assert(rejectedDirectSc, 'Direct District -> Supreme Court appeal properly blocked');

    // Checkpoint 4: Invalid Destination High Court Rejected
    console.log('\n--- Checkpoint 4: Invalid Destination High Court Jurisdiction Check ---');
    const [[unrelatedJurisdiction]] = await db.query(
      `SELECT c.id as case_id, c.state_ut_id as state_id, hc.id as invalid_hc_id, hc.name as invalid_hc_name
       FROM cases c
       JOIN court_levels cl ON c.court_level_id = cl.id
       CROSS JOIN high_courts hc
       LEFT JOIN high_court_jurisdictions hcj ON hcj.state_ut_id = c.state_ut_id AND hcj.high_court_id = hc.id
       WHERE cl.tier_order >= 3 AND c.state_ut_id IS NOT NULL AND hcj.id IS NULL
       LIMIT 1`
    );

    if (unrelatedJurisdiction) {
      let invalidHcRejected = false;
      try {
        await CaseAppeal.createAppeal({
          originalCaseId: unrelatedJurisdiction.case_id,
          destinationCourtLevelId: hcLevel.id,
          destinationHighCourtId: unrelatedJurisdiction.invalid_hc_id,
          appealType: 'Appeal to Non-jurisdictional HC',
          grounds: 'Testing territorial jurisdiction validation.',
          userId: 1
        });
      } catch (err) {
        invalidHcRejected = true;
        assert(err.message.includes('jurisdiction') || err.message.includes('does not hold judicial jurisdiction'), `Territorially invalid HC appeal rejected: "${err.message}"`);
      }
      assert(invalidHcRejected, `Appeal to non-jurisdictional High Court (${unrelatedJurisdiction.invalid_hc_name}) rejected`);
    }

    // Checkpoint 5: Duplicate Active Appeal Rejected
    console.log('\n--- Checkpoint 5: Duplicate Active Appeal Prevention ---');
    let duplicateRejected = false;
    try {
      await CaseAppeal.createAppeal({
        originalCaseId: districtCase.id,
        destinationCourtLevelId: hcLevel.id,
        destinationHighCourtId: districtCase.high_court_id,
        appealType: 'Duplicate HC Appeal',
        grounds: 'Testing duplicate rejection.',
        userId: 1
      });
    } catch (err) {
      duplicateRejected = true;
      assert(err.message.includes('already pending') || err.message.includes('active appeal'), `Duplicate appeal rejected: "${err.message}"`);
    }
    assert(duplicateRejected, 'Duplicate active appeal to same court tier was blocked');

    // Checkpoint 6: Original Case Preserved
    console.log('\n--- Checkpoint 6: Original Case Preserved ---');
    const [[origCaseAfterAppeal]] = await db.query('SELECT * FROM cases WHERE id = ?', [districtCase.id]);
    assert(origCaseAfterAppeal !== undefined, 'Original case record exists');
    assert(origCaseAfterAppeal.case_number === districtCase.case_number, `Original case number unchanged: ${origCaseAfterAppeal.case_number}`);
    assert(origCaseAfterAppeal.title === districtCase.title, `Original case title unchanged: ${origCaseAfterAppeal.title}`);
    assert(origCaseAfterAppeal.petitioner_name === districtCase.petitioner_name, `Original petitioner unchanged: ${origCaseAfterAppeal.petitioner_name}`);
    assert(origCaseAfterAppeal.court_level_id === districtCase.court_level_id, 'Original court_level_id preserved');

    // Checkpoint 7: Appeal Case Created Correctly in `cases` Table
    console.log('\n--- Checkpoint 7: Appeal Case Record Validation in `cases` ---');
    const [[appealCaseInDb]] = await db.query('SELECT * FROM cases WHERE id = ?', [appealToHc.appealCaseId]);
    assert(appealCaseInDb !== undefined, 'Appeal case exists in cases table');
    assert(appealCaseInDb.status === 'Filed', `Appeal case initial status is 'Filed'`);
    assert(appealCaseInDb.court_level_id === hcLevel.id, `Appeal case court_level_id is High Court (${hcLevel.id})`);
    assert(appealCaseInDb.title.includes('Appeal:'), `Appeal case title prefixed properly: "${appealCaseInDb.title}"`);
    assert(appealCaseInDb.description.includes(districtCase.case_number), `Appeal description references originating case number`);

    // Checkpoint 8: Appeal History Forward Navigation
    console.log('\n--- Checkpoint 8: Appeal History Forward Navigation (Root -> Apex) ---');
    const rootHistory = await CaseAppeal.getAppealHistory(districtCase.id);
    assert(rootHistory !== null, 'getAppealHistory returned valid object');
    assert(rootHistory.hasAppeals === true, 'hasAppeals is true for appealed chain');
    assert(rootHistory.chain.length === 3, `Chain length is 3 (District -> HC -> SC), got: ${rootHistory.chain.length}`);
    assert(rootHistory.chain[0].caseId === districtCase.id, 'Chain[0] is Root District case');
    assert(rootHistory.chain[0].isCurrent === true, 'Chain[0] marked as isCurrent when viewing root');
    assert(rootHistory.chain[1].caseId === appealToHc.appealCaseId, 'Chain[1] is High Court appeal case');
    assert(rootHistory.chain[2].caseId === appealToSc.appealCaseId, 'Chain[2] is Supreme Court appeal case');

    // Checkpoint 9: Appeal History Reverse Navigation (Apex -> Root)
    console.log('\n--- Checkpoint 9: Appeal History Reverse Navigation (Apex -> Root) ---');
    const apexHistory = await CaseAppeal.getAppealHistory(appealToSc.appealCaseId);
    assert(apexHistory !== null, 'getAppealHistory from apex case returned valid history');
    assert(apexHistory.chain.length === 3, `Reverse traversal reconstructed full 3-tier chain (length: ${apexHistory.chain.length})`);
    assert(apexHistory.chain[0].caseId === districtCase.id, 'Apex history correctly identifies original root case');
    assert(apexHistory.chain[2].isCurrent === true, 'Apex node correctly marked as isCurrent when viewing apex case');
    assert(apexHistory.canAppealFurther === false, 'Apex Supreme Court case cannot appeal further (canAppealFurther = false)');

    // Checkpoint 10: Hierarchy Validation & Destination Calculation
    console.log('\n--- Checkpoint 10: Hierarchy Validation & Next Destinations ---');
    const nextDestForDistrict = await CaseAppeal.getNextAppellateDestinations(districtCase.id);
    assert(Array.isArray(nextDestForDistrict) && nextDestForDistrict.length > 0, `Retrieved ${nextDestForDistrict.length} valid destination(s) for District case`);
    assert(nextDestForDistrict.some(d => d.destination_tier === 2), 'High Court offered as destination for District case');
    assert(!nextDestForDistrict.some(d => d.destination_tier === 1), 'Supreme Court NOT offered as destination for District case');

    const nextDestForHc = await CaseAppeal.getNextAppellateDestinations(appealToHc.appealCaseId);
    assert(nextDestForHc.some(d => d.destination_tier === 1), 'Supreme Court offered as destination for High Court case');

    const nextDestForSc = await CaseAppeal.getNextAppellateDestinations(appealToSc.appealCaseId);
    assert(nextDestForSc.length === 0, 'No destinations offered for Supreme Court case (Apex forum)');

    // Checkpoint 11: Role-Based Access Control (RBAC) on Appeals
    console.log('\n--- Checkpoint 11: Role-Based Access Control (RBAC) ---');
    const registrarCookie = await loginUser('registrar@jis.gov.in');
    const regAppealFormRes = await request({
      path: `/registrar/cases/${districtCase.id}/appeals/new`,
      headers: { 'Cookie': registrarCookie }
    });
    assert(regAppealFormRes.statusCode === 200, 'Registrar can view Appeal Filing Form (GET /registrar/cases/:id/appeals/new)');
    assert(regAppealFormRes.body.includes('Statutory Appeal') || regAppealFormRes.body.includes('Appellate'), 'Appeal form contains statutory appeal header');

    const regCaseDetailRes = await request({
      path: `/registrar/cases/${districtCase.id}`,
      headers: { 'Cookie': registrarCookie }
    });
    assert(regCaseDetailRes.statusCode === 200, 'Registrar can view case detail with appellate timeline');
    assert(regCaseDetailRes.body.includes('Statutory Appellate Progression & Case History'), 'Registrar view includes Appellate History partial');

    const judgeCookie = await loginUser('judge1@jis.gov.in');
    const [[judgeCase]] = await db.query('SELECT id FROM cases WHERE judge_id = (SELECT id FROM users WHERE email = "judge1@jis.gov.in") LIMIT 1');
    const judgeCaseId = judgeCase ? judgeCase.id : 1;
    const judgeRes = await request({
      path: `/judge/cases/${judgeCaseId}`,
      headers: { 'Cookie': judgeCookie }
    });
    assert(judgeRes.statusCode === 200, 'Judge can view assigned case detail');
    assert(judgeRes.body.includes('Statutory Appellate Progression & Case History'), 'Judge view includes Appellate History component');

    const prosecutorCookie = await loginUser('prosecutor@jis.gov.in');
    const [[prosCase]] = await db.query('SELECT id FROM cases WHERE prosecutor_id = (SELECT id FROM users WHERE email = "prosecutor@jis.gov.in") LIMIT 1');
    const prosCaseId = prosCase ? prosCase.id : 1;
    const prosRes = await request({
      path: `/prosecutor/cases/${prosCaseId}`,
      headers: { 'Cookie': prosecutorCookie }
    });
    assert(prosRes.statusCode === 200, `Prosecutor can view assigned case ID ${prosCaseId} detail`);
    assert(prosRes.body.includes('Statutory Appellate Progression & Case History'), 'Prosecutor view includes Appellate History component');

    const advocateCookie = await loginUser('advocate@jis.gov.in');
    const advRes = await request({
      path: `/advocate/cases/${districtCase.id}`,
      headers: { 'Cookie': advocateCookie }
    });
    assert(advRes.statusCode === 200, 'Advocate can view case detail');
    assert(advRes.body.includes('Statutory Appellate Progression & Case History'), 'Advocate view includes Appellate History component');

    // Checkpoint 12: Public Citizen Privacy & Exposure
    console.log('\n--- Checkpoint 12: Public Citizen Privacy & Exposure ---');
    const origIsPublic = districtCase.is_public;
    await db.query('UPDATE cases SET is_public = 1 WHERE id = ?', [districtCase.id]);
    await db.query('UPDATE cases SET is_public = 1 WHERE id = ?', [appealToHc.appealCaseId]);

    const publicRes = await request({ path: `/case/${districtCase.id}` });
    assert(publicRes.statusCode === 200, `Citizen can view public case status (HTTP 200)`);
    assert(publicRes.body.includes('Statutory Appellate Progression & Case History'), 'Public view renders Appellate History timeline');
    assert(!publicRes.body.includes('/registrar/cases/'), 'Public view does NOT expose internal staff filing routes');

    await db.query('UPDATE cases SET is_public = ? WHERE id = ?', [origIsPublic, districtCase.id]);

    const [[pvtCase]] = await db.query('SELECT id FROM cases WHERE is_public = 0 LIMIT 1');
    if (pvtCase) {
      const pvtRes = await request({ path: `/case/${pvtCase.id}` });
      assert(pvtRes.statusCode === 404, `Citizen cannot view private case ID ${pvtCase.id} (HTTP 404)`);
    }

    // Checkpoint 13: In-App Notifications Generated
    console.log('\n--- Checkpoint 13: In-App Notifications on Appeal Filing ---');
    const [[latestNotif]] = await db.query(
      `SELECT * FROM notifications 
       WHERE message LIKE '%appealed%' OR message LIKE '%Appeal filed%' 
       ORDER BY id DESC LIMIT 1`
    );
    assert(latestNotif !== undefined, 'In-app notification generated for appeal event');
    if (latestNotif) {
      assert(latestNotif.message.includes('Appeal') || latestNotif.message.includes('appealed'), `Notification text verified: "${latestNotif.message}"`);
    }

    // Checkpoint 14: Legal Research Continuity on Appeal Cases
    console.log('\n--- Checkpoint 14: Legal Research Continuity on Appeal Cases ---');
    const [inheritedSections] = await db.query(
      'SELECT * FROM case_legal_sections WHERE case_id = ?',
      [appealToHc.appealCaseId]
    );
    assert(Array.isArray(inheritedSections), 'Appeal case legal sections query succeeded');
    assert(inheritedSections.length > 0, `Appeal case inherited ${inheritedSections.length} legal section(s) from original case via batch insert (H-7)`);

    // Checkpoint 15: Synthetic Appeal Data Provenance & Labeling
    console.log('\n--- Checkpoint 15: Synthetic Appeal Provenance Flagging ---');
    const [[syntheticAppealsCount]] = await db.query(
      'SELECT COUNT(*) as count FROM case_appeals WHERE is_synthetic = 1 AND provenance = "SYNTHETIC_WORKFLOW"'
    );
    assert(syntheticAppealsCount.count > 0, `Database contains ${syntheticAppealsCount.count} properly flagged synthetic appeal records with provenance = SYNTHETIC_WORKFLOW`);

    // Checkpoint 16: Deterministic Test Case Fixture Intact
    console.log('\n--- Checkpoint 16: Test Database Case Count Integrity ---');
    const [[totalCasesRow]] = await db.query('SELECT COUNT(*) as total FROM cases');
    assert(totalCasesRow.total === 516, `Test database has expected 514 + 2 newly created appeal cases: ${totalCasesRow.total}`);

    // Checkpoint 17: Real Legal Repository Intact
    console.log('\n--- Checkpoint 17: Legal Repository Integrity ---');
    const [[judgCountRow]] = await db.query('SELECT COUNT(*) as total FROM legal_judgments');
    assert(judgCountRow.total === 605, `Legal judgments preserved: ${judgCountRow.total} (105 REAL_VERIFIED + 500 SYNTHETIC_REPRESENTATIVE)`);

    const [[secCountRow]] = await db.query('SELECT COUNT(*) as total FROM legal_sections');
    assert(secCountRow.total === 2419, `Statutory criminal sections preserved: ${secCountRow.total}`);

    // Checkpoint 18: Real Judiciary Hierarchy Intact
    console.log('\n--- Checkpoint 18: Real Indian Judiciary Hierarchy Integrity ---');
    const [[statesCount]] = await db.query('SELECT COUNT(*) as count FROM states_uts');
    assert(statesCount.count === 36, `States/UTs preserved: ${statesCount.count}`);

    const [[hcCount]] = await db.query('SELECT COUNT(*) as count FROM high_courts');
    assert(hcCount.count === 25, `High Courts preserved: ${hcCount.count}`);

    const [[benchCount]] = await db.query('SELECT COUNT(*) as count FROM high_court_benches');
    assert(benchCount.count === 41, `High Court Benches preserved: ${benchCount.count}`);

    const [[distCount]] = await db.query('SELECT COUNT(*) as count FROM districts');
    assert(distCount.count === 787, `Judicial Districts preserved: ${distCount.count}`);

  } catch (err) {
    failed++;
    console.error(`Unexpected test error: ${err.stack || err.message}`);
  } finally {
    try {
      if (appealToSc && appealToSc.appealCaseId) {
        await db.query('DELETE FROM case_appeals WHERE appeal_case_id = ?', [appealToSc.appealCaseId]);
        await db.query('DELETE FROM cases WHERE id = ?', [appealToSc.appealCaseId]);
      }
      if (appealToHc && appealToHc.appealCaseId) {
        await db.query('DELETE FROM case_appeals WHERE appeal_case_id = ?', [appealToHc.appealCaseId]);
        await db.query('DELETE FROM cases WHERE id = ?', [appealToHc.appealCaseId]);
      }
    } catch (_) {
      // Ignore cleanup error
    }
    server.close();
  }

  console.log('\n======================================================');
  console.log(` Appellate Workflow Test Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
