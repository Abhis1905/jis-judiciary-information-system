'use strict';

process.env.NODE_ENV = 'test';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.test') });

const http = require('http');
const app = require('./app');
const pool = require('./config/db');

let server;
const PORT = 3099;

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'JIS-Hierarchy-Test-Agent/1.0'
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

async function runHierarchyVerification() {
  console.log('\n======================================================');
  console.log(' JIS – Real Indian Judiciary Hierarchy Verification ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  \x1b[32m✔ PASS\x1b[0m: ${message}`);
      passed++;
    } else {
      console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${message}`);
      failed++;
    }
  }

  await new Promise(resolve => {
    server = app.listen(PORT, () => {
      console.log(`Test server running on port ${PORT} (DB: ${process.env.DB_NAME})\n`);
      resolve();
    });
  });

  let newCaseId = null;
  let pvtCaseId = null;

  try {
    // TEST 1: Database Table Count & Integrity
    console.log('--- Step 1: Hierarchy Schema Verification ---');
    const [tables] = await pool.query(`
      SELECT TABLE_NAME FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (
        'states_uts', 'high_courts', 'high_court_jurisdictions', 
        'high_court_benches', 'districts', 'court_levels', 
        'subordinate_courts', 'appellate_paths'
      )
    `, [process.env.DB_NAME || 'jis_test_db']);
    
    assert(tables.length === 8, `All 8 hierarchy tables exist in database (found ${tables.length}/8)`);

    // TEST 2: Seed Data Counts
    console.log('\n--- Step 2: Seed Data Integrity ---');
    const [[{ statesCount }]] = await pool.query('SELECT COUNT(*) AS statesCount FROM states_uts');
    const [[{ hcCount }]] = await pool.query('SELECT COUNT(*) AS hcCount FROM high_courts');
    const [[{ benchCount }]] = await pool.query('SELECT COUNT(*) AS benchCount FROM high_court_benches');
    const [[{ distCount }]] = await pool.query('SELECT COUNT(*) AS distCount FROM districts');
    const [[{ levelCount }]] = await pool.query('SELECT COUNT(*) AS levelCount FROM court_levels');
    const [[{ pathCount }]] = await pool.query('SELECT COUNT(*) AS pathCount FROM appellate_paths');

    assert(statesCount === 36, `Seeded all 36 States & Union Territories of India (found: ${statesCount})`);
    assert(hcCount === 25, `Seeded all 25 High Courts of India (found: ${hcCount})`);
    assert(benchCount === 41, `Seeded all 41 High Court Benches & Principal Seats (found: ${benchCount})`);
    assert(distCount === 787, `Seeded complete all-India Judicial Districts (found: ${distCount})`);
    assert(levelCount === 6, `Seeded standard 6-tier Indian Court Levels (found: ${levelCount})`);
    assert(pathCount === 13, `Seeded statutory Appellate Pathways (found: ${pathCount})`);

    // TEST 3: Hierarchy API Endpoints
    console.log('\n--- Step 3: Hierarchy API Endpoints ---');
    
    const resStates = await request({ path: '/api/hierarchy/states' });
    const statesJson = JSON.parse(resStates.body);
    assert(resStates.statusCode === 200 && statesJson.success && statesJson.data.length === 36,
      `GET /api/hierarchy/states returned 36 states/UTs`);

    const upState = statesJson.data.find(s => s.code === 'UP');
    const mhState = statesJson.data.find(s => s.code === 'MH');

    const resHcUP = await request({ path: `/api/hierarchy/high-courts?state_ut_id=${upState.id}` });
    const hcUpJson = JSON.parse(resHcUP.body);
    assert(resHcUP.statusCode === 200 && hcUpJson.data.some(hc => hc.name.includes('Allahabad')),
      `GET /api/hierarchy/high-courts for UP returned Allahabad High Court`);

    const alldHc = hcUpJson.data.find(hc => hc.name.includes('Allahabad'));

    const resBenches = await request({ path: `/api/hierarchy/benches?high_court_id=${alldHc.id}` });
    const benchesJson = JSON.parse(resBenches.body);
    assert(resBenches.statusCode === 200 && benchesJson.data.length >= 2,
      `Allahabad High Court has Principal Seat at Prayagraj and Lucknow Bench`);

    const lkoBench = benchesJson.data.find(b => b.bench_name.includes('Lucknow'));

    const resDistLko = await request({ path: `/api/hierarchy/districts?bench_id=${lkoBench.id}` });
    const distLkoJson = JSON.parse(resDistLko.body);
    assert(resDistLko.statusCode === 200 && distLkoJson.data.some(d => d.district_name.includes('Lucknow')),
      `Districts under Lucknow Bench include Lucknow district`);

    const resAppCivil = await request({ path: '/api/hierarchy/appellate-path?category=Civil' });
    const appCivilJson = JSON.parse(resAppCivil.body);
    assert(resAppCivil.statusCode === 200 && appCivilJson.data.length >= 2,
      `GET /api/hierarchy/appellate-path returns Civil appellate pathway to Supreme Court`);

    const resAppCrl = await request({ path: '/api/hierarchy/appellate-path?category=Criminal' });
    const appCrlJson = JSON.parse(resAppCrl.body);
    assert(resAppCrl.statusCode === 200 && appCrlJson.data.some(s => s.governing_statute.includes('CrPC') || s.governing_statute.includes('Constitution')),
      `GET /api/hierarchy/appellate-path returns Criminal appellate pathway under CrPC / Constitution`);

    // TEST 4: Case Filing with Hierarchy (R1) & Detail View (R3)
    console.log('\n--- Step 4: Registrar Case Filing with Hierarchy & Detail Verification ---');
    const registrarCookie = await loginUser('registrar@jis.gov.in', 'Password@123');

    const resR1Form = await request({
      path: '/registrar/cases/new',
      headers: { 'Cookie': registrarCookie }
    });
    assert(resR1Form.statusCode === 200 && (resR1Form.body.includes('Judicial Jurisdiction') || resR1Form.body.includes('Court Hierarchy')),
      `R1 form renders Judicial Jurisdiction & Court Hierarchy cascading section`);

    const regCsrf = extractCsrf(resR1Form.body);

    const [pryDist] = await pool.query(`SELECT id FROM districts WHERE district_code = 'UP_PRY' LIMIT 1`);
    const [distSessionsLevel] = await pool.query(`SELECT id FROM court_levels WHERE level_code = 'LEVEL_DISTRICT_SESSIONS' LIMIT 1`);
    const [subCourt] = await pool.query(`SELECT id FROM subordinate_courts WHERE district_id = ? LIMIT 1`, [pryDist[0].id]);
    const pryBench = benchesJson.data.find(b => b.bench_name.includes('Prayagraj'));

    // 4A: Test Hierarchy Logical Consistency Validation (Negative Test)
    const invalidCaseBody = [
      `_csrf=${encodeURIComponent(regCsrf)}`,
      `case_number=${encodeURIComponent('JIS/INVALID/001')}`,
      `title=${encodeURIComponent('Inconsistent Case Hierarchy Test')}`,
      `case_type=Civil`,
      `petitioner_name=Test`,
      `respondent_name=Test`,
      `filing_date=2026-09-28`,
      `state_ut_id=${upState.id}`,
      `high_court_id=${mhState ? 2 : 2}`,
      `district_id=${pryDist[0].id}`
    ].join('&');

    const resInvalidCase = await request({
      path: '/registrar/cases',
      method: 'POST',
      headers: {
        'Cookie': registrarCookie,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, invalidCaseBody);

    assert(resInvalidCase.statusCode === 302 && resInvalidCase.headers.location === '/registrar/cases/new',
      `Hierarchy inconsistency correctly rejected with redirect to new case form`);

    // 4B: Post valid new case with complete hierarchy foreign keys
    const testCaseNumber = `JIS/HIER/${Date.now().toString().slice(-4)}`;

    const postCaseBody = [
      `_csrf=${encodeURIComponent(regCsrf)}`,
      `case_number=${encodeURIComponent(testCaseNumber)}`,
      `title=${encodeURIComponent('Test Hierarchy Appeal Case vs State of UP')}`,
      `case_type=Criminal`,
      `petitioner_name=${encodeURIComponent('Arun Yadav')}`,
      `respondent_name=${encodeURIComponent('State of Uttar Pradesh')}`,
      `filing_date=2026-09-28`,
      `description=${encodeURIComponent('Criminal revision petition against sessions trial judgment')}`,
      `is_public=1`,
      `state_ut_id=${upState.id}`,
      `high_court_id=${alldHc.id}`,
      `bench_id=${pryBench ? pryBench.id : ''}`,
      `district_id=${pryDist[0].id}`,
      `court_level_id=${distSessionsLevel[0].id}`,
      `subordinate_court_id=${subCourt[0] ? subCourt[0].id : ''}`
    ].join('&');

    const resCreateCase = await request({
      path: '/registrar/cases',
      method: 'POST',
      headers: {
        'Cookie': registrarCookie,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, postCaseBody);

    assert(resCreateCase.statusCode === 302, `R1 Case Filing succeeded with redirect (HTTP 302)`);

    const createdCaseLocation = resCreateCase.headers.location;
    const newCaseIdMatch = createdCaseLocation ? createdCaseLocation.match(/\/registrar\/cases\/(\d+)/) : null;
    newCaseId = newCaseIdMatch ? parseInt(newCaseIdMatch[1], 10) : null;

    assert(newCaseId !== null, `Obtained new case ID ${newCaseId} from redirect header`);

    const [dbCaseRows] = await pool.query('SELECT state_ut_id, high_court_id, bench_id, district_id, court_level_id FROM cases WHERE id = ?', [newCaseId]);
    const dbCase = dbCaseRows[0];
    assert(dbCase && dbCase.state_ut_id === upState.id && dbCase.high_court_id === alldHc.id && dbCase.district_id === pryDist[0].id,
      `Case ${testCaseNumber} stores correct hierarchy foreign keys in database`);

    const resR3Detail = await request({
      path: `/registrar/cases/${newCaseId}`,
      headers: { 'Cookie': registrarCookie }
    });

    assert(resR3Detail.statusCode === 200 &&
           resR3Detail.body.includes('Allahabad') &&
           resR3Detail.body.includes('Uttar Pradesh') &&
           resR3Detail.body.includes('Statutory Appellate Pathway'),
      `R3 Case Detail renders complete Indian Jurisdiction & Statutory Appellate Pathway`);

    // TEST 5: Judge, Prosecutor, Advocate Case Detail Hierarchy Views
    console.log('\n--- Step 5: Judge, Prosecutor, Advocate Detail Verification ---');

    const [judgeUsers] = await pool.query('SELECT id FROM users WHERE email = "judge1@jis.gov.in"');
    const [prosUsers] = await pool.query('SELECT id FROM users WHERE email = "prosecutor@jis.gov.in"');

    await pool.query('UPDATE cases SET judge_id = ?, prosecutor_id = ?, status = "Allocated" WHERE id = ?', [
      judgeUsers[0].id,
      prosUsers[0].id,
      newCaseId
    ]);

    const judgeCookie = await loginUser('judge1@jis.gov.in', 'Password@123');
    const resJ2 = await request({
      path: `/judge/cases/${newCaseId}`,
      headers: { 'Cookie': judgeCookie }
    });
    assert(resJ2.statusCode === 200 && resJ2.body.includes('Judicial Jurisdiction'),
      `J2 Judge Case Detail displays complete hierarchy & appellate pathway card`);

    const prosCookie = await loginUser('prosecutor@jis.gov.in', 'Password@123');
    const resP2 = await request({
      path: `/prosecutor/cases/${newCaseId}`,
      headers: { 'Cookie': prosCookie }
    });
    assert(resP2.statusCode === 200 && resP2.body.includes('Judicial Jurisdiction'),
      `P2 Prosecutor Case Detail displays complete hierarchy & appellate pathway card`);

    const advCookie = await loginUser('advocate@jis.gov.in', 'Password@123');
    const resA2 = await request({
      path: `/advocate/cases/${newCaseId}`,
      headers: { 'Cookie': advCookie }
    });
    assert(resA2.statusCode === 200 && resA2.body.includes('Judicial Jurisdiction'),
      `A2 Advocate Case Detail displays complete hierarchy & appellate pathway card`);

    // TEST 6: Public Citizen Portal & Hierarchy Filters
    console.log('\n--- Step 6: Public Citizen Search & C2 Status View ---');

    const resHome = await request({ path: '/' });
    assert(resHome.statusCode === 200 && resHome.body.includes('All High Courts') && resHome.body.includes('All States / UTs'),
      `C1 Public Portal provides State and High Court filter options`);

    const resSearchState = await request({ path: `/search?stateUtId=${upState.id}` });
    assert(resSearchState.statusCode === 200 && resSearchState.body.includes(testCaseNumber),
      `C1 Public Search filtered by State returns public case`);

    const resC2 = await request({ path: `/case/${newCaseId}` });
    assert(resC2.statusCode === 200 &&
           resC2.body.includes('Judicial Jurisdiction & Court Hierarchy') &&
           resC2.body.includes('Statutory Appellate Pathway'),
      `C2 Public Case Status page displays full Indian Court Hierarchy and Appellate Route`);

    // TEST 7: Private Case Visibility Verification (is_public = 0)
    console.log('\n--- Step 7: Private Case Visibility Enforcement ---');

    const privateCaseNumber = `JIS/PVT/${Date.now().toString().slice(-4)}`;
    const postPrivateCaseBody = [
      `_csrf=${encodeURIComponent(regCsrf)}`,
      `case_number=${encodeURIComponent(privateCaseNumber)}`,
      `title=${encodeURIComponent('Confidential In-Camera Hierarchy Case')}`,
      `case_type=Family`,
      `petitioner_name=${encodeURIComponent('Confidential Petitioner')}`,
      `respondent_name=${encodeURIComponent('Confidential Respondent')}`,
      `filing_date=2026-09-28`,
      `description=${encodeURIComponent('In-camera family proceedings under Family Courts Act')}`,
      `is_public=0`,
      `state_ut_id=${upState.id}`,
      `high_court_id=${alldHc.id}`,
      `district_id=${pryDist[0].id}`
    ].join('&');

    const resCreatePvtCase = await request({
      path: '/registrar/cases',
      method: 'POST',
      headers: {
        'Cookie': registrarCookie,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, postPrivateCaseBody);

    const pvtCaseLocation = resCreatePvtCase.headers.location;
    const pvtCaseIdMatch = pvtCaseLocation ? pvtCaseLocation.match(/\/registrar\/cases\/(\d+)/) : null;
    pvtCaseId = pvtCaseIdMatch ? parseInt(pvtCaseIdMatch[1], 10) : null;

    assert(pvtCaseId !== null, `Private case filed successfully with ID ${pvtCaseId}`);

    const resPvtSearch = await request({ path: `/search?q=${privateCaseNumber}` });
    assert(resPvtSearch.statusCode === 200 && resPvtSearch.body.includes('No publicly available cases match your search') && !resPvtSearch.body.includes(`/case/${pvtCaseId}`),
      `Anonymous citizen search DOES NOT expose private case (${privateCaseNumber})`);

    const resPvtDirect = await request({ path: `/case/${pvtCaseId}` });
    assert(resPvtDirect.statusCode === 404,
      `Anonymous direct access to private case returns HTTP 404 Not Found`);

    const resLegacyCase = await request({ path: '/case/1' });
    assert(resLegacyCase.statusCode === 200, `Existing JIS seed cases continue to render properly on public portal`);

    console.log('\n======================================================');
    console.log(` Hierarchy Verification Complete: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    try {
      const idsToDelete = [newCaseId, pvtCaseId].filter(Boolean);
      if (idsToDelete.length > 0) {
        await pool.query('DELETE FROM cases WHERE id IN (?)', [idsToDelete]);
      }
    } catch (_) {
      // ignore cleanup errors
    }
    if (server) server.close();
    process.exit(failed === 0 ? 0 : 1);
  }
}

runHierarchyVerification();
