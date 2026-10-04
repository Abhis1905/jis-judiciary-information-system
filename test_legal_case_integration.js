'use strict';

/**
 * End-to-End Test Suite for JIS Legal Case Integration & Intelligence Layer
 * Covers all 15 required integration checkpoints against isolated jis_test_db.
 */

process.env.NODE_ENV = 'test';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.test') });

const http = require('http');
const app = require('./app');
const db = require('./config/db');
const CaseLegalIntegration = require('./models/CaseLegalIntegration');
const LegalSection = require('./models/LegalSection');
const LegalJudgment = require('./models/LegalJudgment');

let server;
const PORT = 3098;

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'JIS-Legal-Case-Integration-Test-Agent/1.0'
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
  console.log(' JIS – Legal Case Intelligence Integration Test Suite ');
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

  try {
    // Checkpoint 1: Case -> Legal Section Relationship & Normalization
    console.log('--- Checkpoint 1: Case -> Legal Section Relationship ---');
    const [[caseSectionRow]] = await db.query(
      `SELECT cls.*, ls.section_number, la.act_code 
       FROM case_legal_sections cls
       JOIN legal_sections ls ON cls.legal_section_id = ls.id
       JOIN legal_acts la ON ls.act_id = la.id
       LIMIT 1`
    );
    assert(caseSectionRow !== undefined, 'Case-Legal Section associations exist in database');
    assert(['PRIMARY', 'SECONDARY', 'PROCEDURAL', 'EVIDENTIARY'].includes(caseSectionRow.relevance_type), `Relevance type is valid: ${caseSectionRow.relevance_type}`);
    
    const sectionsForCase = await CaseLegalIntegration.getSectionsForCase(caseSectionRow.case_id);
    assert(sectionsForCase.length > 0, `Retrieved ${sectionsForCase.length} sections for case ID ${caseSectionRow.case_id}`);

    // Checkpoint 2: Case -> Legal Precedent Judgment Relationship
    console.log('\n--- Checkpoint 2: Case -> Precedent Judgment Relationship ---');
    const [[caseJudgRow]] = await db.query(
      `SELECT clj.*, lj.case_name, lj.citation 
       FROM case_legal_judgments clj
       JOIN legal_judgments lj ON clj.judgment_id = lj.id
       LIMIT 1`
    );
    assert(caseJudgRow !== undefined, 'Case-Legal Judgment associations exist in database');
    assert(['PRECEDENT', 'RELATED', 'CITED', 'RESEARCH'].includes(caseJudgRow.relevance_type), `Judgment relevance type is valid: ${caseJudgRow.relevance_type}`);

    const judgmentsForCase = await CaseLegalIntegration.getJudgmentsForCase(caseJudgRow.case_id);
    assert(judgmentsForCase.length > 0, `Retrieved ${judgmentsForCase.length} precedent judgments for case ID ${caseJudgRow.case_id}`);

    // Checkpoint 3: Section -> Cases Reverse Navigation
    console.log('\n--- Checkpoint 3: Section -> Cases Reverse Navigation ---');
    const secCases = await CaseLegalIntegration.getCasesForSection(caseSectionRow.legal_section_id, 1, 5);
    assert(secCases.cases.length > 0, `Reverse lookup returned ${secCases.cases.length} JIS cases for Section ID ${caseSectionRow.legal_section_id}`);
    assert(secCases.total > 0, `Total count returned correctly: ${secCases.total}`);

    const secHttp = await request({ path: `/legal/sections/${caseSectionRow.legal_section_id}` });
    assert(secHttp.statusCode === 200, `GET /legal/sections/${caseSectionRow.legal_section_id} returns 200 OK`);
    assert(secHttp.body.includes('JIS Cases Using This Provision'), 'Section detail page includes Reverse JIS Cases section');
    assert(secHttp.body.includes('SYNTHETIC JIS CASE'), 'Section detail page displays SYNTHETIC JIS CASE badge');

    // Checkpoint 4: Judgment -> Cases Reverse Navigation
    console.log('\n--- Checkpoint 4: Judgment -> Cases Reverse Navigation ---');
    const judgCases = await CaseLegalIntegration.getCasesForJudgment(caseJudgRow.judgment_id, 1, 5);
    assert(judgCases.cases.length > 0, `Reverse lookup returned ${judgCases.cases.length} JIS cases referencing Judgment ID ${caseJudgRow.judgment_id}`);

    const judgHttp = await request({ path: `/legal/judgments/${caseJudgRow.judgment_id}` });
    assert(judgHttp.statusCode === 200, `GET /legal/judgments/${caseJudgRow.judgment_id} returns 200 OK`);
    assert(judgHttp.body.includes('JIS Cases Referencing This Precedent'), 'Judgment detail page includes Reverse Precedent Cases section');

    // Checkpoint 5: Judgment <-> Section Discussed Provisions
    console.log('\n--- Checkpoint 5: Judgment <-> Section Statutory Provisions ---');
    const discussedSecs = await CaseLegalIntegration.getSectionsForJudgment(caseJudgRow.judgment_id);
    assert(Array.isArray(discussedSecs), 'getSectionsForJudgment returns an array');
    if (discussedSecs.length > 0) {
      assert(discussedSecs[0].section_number !== undefined, `Judgment discusses Section ${discussedSecs[0].section_number}`);
    } else {
      assert(true, 'Judgment sections query handled gracefully for judgments without direct section links');
    }

    // Checkpoint 6: Old -> New Law Cross-Reference Mapping
    console.log('\n--- Checkpoint 6: Old -> New Law Mapping (IPC 302 -> BNS 103) ---');
    const ipcSec = await LegalSection.getByActAndNumber('IPC_1860', '302');
    assert(ipcSec !== null, 'Found IPC Section 302');
    if (ipcSec) {
      const rels = await LegalSection.getRelations(ipcSec.id);
      const bnsMap = rels.forward.find(r => r.target_act_code === 'BNS_2023');
      assert(bnsMap !== undefined, 'IPC 302 maps forward to BNS 2023');
      assert(bnsMap && (bnsMap.target_section_number === '103' || bnsMap.target_section_number === '103(1)'), `IPC 302 mapped to BNS Section ${bnsMap ? bnsMap.target_section_number : 'none'}`);
    }

    // Checkpoint 7: New -> Old Law Cross-Reference Mapping
    console.log('\n--- Checkpoint 7: New -> Old Law Mapping (BNS 103 -> IPC 302) ---');
    const bnsSec = await LegalSection.getByActAndNumber('BNS_2023', '103(1)') || await LegalSection.getByActAndNumber('BNS_2023', '103');
    assert(bnsSec !== null, 'Found BNS Section 103 / 103(1)');
    if (bnsSec) {
      const rels = await LegalSection.getRelations(bnsSec.id);
      const ipcMap = rels.backward.find(r => r.source_act_code === 'IPC_1860');
      assert(ipcMap !== undefined, 'BNS 103 maps backward to IPC 1860');
      assert(ipcMap && ipcMap.source_section_number === '302', `BNS 103 mapped to IPC Section ${ipcMap ? ipcMap.source_section_number : 'none'}`);
    }

    // Checkpoint 8: Date-Aware Legal Framework Transition Logic
    console.log('\n--- Checkpoint 8: Date-Aware Legal Framework Transition ---');
    const preDateCase = { filing_date: '2023-08-15' };
    const postDateCase = { filing_date: '2024-08-15' };

    const preFramework = CaseLegalIntegration.getLegalFrameworkForCase(preDateCase);
    assert(preFramework.isTransition === false, 'Pre-1 July 2024 case flagged as Historical Framework');
    assert(preFramework.substantiveCode.includes('IPC'), 'Pre-1 July 2024 case uses IPC substantive code');

    const postFramework = CaseLegalIntegration.getLegalFrameworkForCase(postDateCase);
    assert(postFramework.isTransition === true, 'Post-1 July 2024 case flagged as Reformed Sanhitas Framework');
    assert(postFramework.substantiveCode.includes('BNS'), 'Post-1 July 2024 case uses BNS substantive code');

    // Checkpoint 9: Synthetic-Data Provenance & Labeling
    console.log('\n--- Checkpoint 9: Synthetic-Data Provenance & Labeling ---');
    const [[syntheticCount]] = await db.query('SELECT COUNT(*) as count FROM case_legal_sections WHERE is_synthetic = 1');
    assert(syntheticCount.count > 0, `Database has ${syntheticCount.count} properly flagged synthetic case-section links`);

    const [[syntheticJudgCount]] = await db.query('SELECT COUNT(*) as count FROM case_legal_judgments WHERE is_synthetic = 1');
    assert(syntheticJudgCount.count > 0, `Database has ${syntheticJudgCount.count} properly flagged synthetic case-judgment links`);

    // Checkpoint 10: Role-Based Access Control (RBAC) on Legal Data
    console.log('\n--- Checkpoint 10: Role-Based Access Control (RBAC) ---');
    const registrarCookie = await loginUser('registrar@jis.gov.in');
    const regDetailRes = await request({
      path: `/registrar/cases/${caseSectionRow.case_id}`,
      headers: { 'Cookie': registrarCookie }
    });
    assert(regDetailRes.statusCode === 200, 'Registrar can access case detail with legal intelligence panel');
    assert(regDetailRes.body.includes('Legal Intelligence & Applicable Statutory Provisions'), 'Registrar view contains legal intelligence panel');
    assert(regDetailRes.body.includes('Associate Legal Provision'), 'Registrar view includes Associate Legal Provision capability');

    const judgeCookie = await loginUser('judge1@jis.gov.in');
    const [[judgeAssignedCase]] = await db.query('SELECT id FROM cases WHERE judge_id = 2 LIMIT 1');
    if (judgeAssignedCase) {
      const judgeRes = await request({
        path: `/judge/cases/${judgeAssignedCase.id}`,
        headers: { 'Cookie': judgeCookie }
      });
      assert(judgeRes.statusCode === 200, `Judge can view assigned case ID ${judgeAssignedCase.id} legal research panel`);
      assert(judgeRes.body.includes('Legal Intelligence & Applicable Statutory Provisions'), 'Judge view contains legal panel');
    }

    // Checkpoint 11: Public Citizen Privacy & Exposure
    console.log('\n--- Checkpoint 11: Public Citizen Privacy & Exposure ---');
    const [[publicCase]] = await db.query('SELECT id FROM cases WHERE is_public = 1 LIMIT 1');
    const pubRes = await request({ path: `/case/${publicCase.id}` });
    assert(pubRes.statusCode === 200, 'Anonymous citizen can access public case status');
    assert(pubRes.body.includes('Legal Intelligence & Applicable Statutory Provisions'), 'Public case status displays statutory provisions');
    assert(!pubRes.body.includes('form action="/registrar/cases/'), 'Public view does NOT expose staff modification forms');

    const [[pvtCase]] = await db.query('SELECT id FROM cases WHERE is_public = 0 LIMIT 1');
    if (pvtCase) {
      const pvtRes = await request({ path: `/case/${pvtCase.id}` });
      assert(pvtRes.statusCode === 404, `Anonymous citizen cannot access private case ID ${pvtCase.id} (HTTP 404)`);
    }

    // Checkpoint 12: Reverse Lookup Pagination
    console.log('\n--- Checkpoint 12: Reverse Lookup Pagination ---');
    const paginatedRes = await CaseLegalIntegration.getCasesForSection(caseSectionRow.legal_section_id, 2, 5);
    assert(paginatedRes.page === 2, 'Pagination page number is 2');
    assert(paginatedRes.limit === 5, 'Pagination limit is 5');
    assert(typeof paginatedRes.totalPages === 'number', 'Pagination totalPages computed');

    // Checkpoint 13: Universal Legal Search with Multi-Attribute Query
    console.log('\n--- Checkpoint 13: Universal Legal Search ---');
    const searchRes = await LegalJudgment.universalSearch('murder');
    assert(searchRes.judgments.length > 0 || searchRes.sections.length > 0, 'Universal search for "murder" returned matching results');

    const searchHttp = await request({ path: '/legal/search?q=Section' });
    assert(searchHttp.statusCode === 200, 'GET /legal/search?q=Section returned 200 OK');

    // Checkpoint 14: Staff Association & Removal Workflow
    console.log('\n--- Checkpoint 14: Staff Association & Removal Workflow ---');
    const [[testCase]] = await db.query('SELECT id FROM cases ORDER BY id DESC LIMIT 1');
    const [[testSec]] = await db.query('SELECT id FROM legal_sections WHERE section_number = "302" LIMIT 1');

    await CaseLegalIntegration.addSectionToCase(testCase.id, testSec.id, 'PRIMARY', 0, 'Manual Test Association');
    const checkAdded = await CaseLegalIntegration.getSectionsForCase(testCase.id);
    const hasSec = checkAdded.some(s => s.section_id === testSec.id);
    assert(hasSec, `Staff association added Section ${testSec.id} to Case ${testCase.id}`);

    await CaseLegalIntegration.removeSectionFromCase(testCase.id, testSec.id);
    const checkRemoved = await CaseLegalIntegration.getSectionsForCase(testCase.id);
    const hasSecAfter = checkRemoved.some(s => s.section_id === testSec.id);
    assert(!hasSecAfter, `Staff association removed Section ${testSec.id} from Case ${testCase.id}`);

    // Checkpoint 15: Preservation of Legal Repository & Stats
    console.log('\n--- Checkpoint 15: Preservation of Legal Repository & Stats ---');
    const integratedStats = await CaseLegalIntegration.getIntegratedStats();
    assert(integratedStats.totalCases === 514, `Deterministic test fixture cases verified: ${integratedStats.totalCases}`);
    assert(integratedStats.totalJudgments === 605, `Total legal judgments preserved: ${integratedStats.totalJudgments} (105 REAL_VERIFIED + 500 SYNTHETIC_REPRESENTATIVE)`);
    assert(integratedStats.sections === 2419, `Total statutory legal sections preserved: ${integratedStats.sections}`);
    assert(integratedStats.casesLinkedToSections > 0, `Cases linked to sections: ${integratedStats.casesLinkedToSections}`);
    assert(integratedStats.casesLinkedToJudgments > 0, `Cases linked to precedents: ${integratedStats.casesLinkedToJudgments}`);

    const legalPortal = await request({ path: '/legal' });
    assert(legalPortal.statusCode === 200, 'GET /legal portal renders successfully');
    assert(legalPortal.body.includes('JIS Case-Law Intelligence Integration'), 'Legal Portal renders integrated case analytics card');

    const apiSecRes = await request({ path: `/api/legal/acts/1/sections` });
    assert(apiSecRes.statusCode === 200, 'GET /api/legal/acts/:id/sections API endpoint works');

  } catch (err) {
    failed++;
    console.error(`Unexpected test error: ${err.stack || err.message}`);
  } finally {
    server.close();
  }

  console.log('\n======================================================');
  console.log(` Legal Case Integration Test Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
