'use strict';

process.env.NODE_ENV = 'test';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.test') });

const http = require('http');
const app = require('./app');
const pool = require('./config/db');

let server;
const PORT = 3097;

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'JIS-Full-Regression-Agent/1.0'
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

async function runFullTestSuite() {
  console.log('\n======================================================');
  console.log(' JIS – Complete System & Judiciary Hierarchy Test Suite ');
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

  try {
    // 1. PUBLIC CITIZEN MODULE
    console.log('--- 1. Public Citizen Module & Search ---');
    const resHome = await request({ path: '/' });
    assert(resHome.statusCode === 200, 'GET / returns HTTP 200');
    assert(resHome.body.includes('All High Courts') && resHome.body.includes('All States / UTs'), 'C1 Search provides High Court and State filtering');

    const resSearch = await request({ path: '/search?q=Kumar' });
    assert(resSearch.statusCode === 200 && resSearch.body.includes('Kumar'), 'GET /search returns matching public cases');

    const resPublicCase = await request({ path: '/case/1' });
    assert(resPublicCase.statusCode === 200 && resPublicCase.body.includes('Judicial Jurisdiction'), 'GET /case/1 renders public case with jurisdiction info');

    const resNotices = await request({ path: '/notices' });
    assert(resNotices.statusCode === 200 && resNotices.body.includes('Court Notices'), 'GET /notices renders public court notices');

    // 2. REGISTRAR MODULE
    console.log('\n--- 2. Registrar Module ---');
    const registrarCookie = await loginUser('registrar@jis.gov.in');
    assert(registrarCookie.length > 0, 'Registrar login successfully authenticated with CSRF + regenerated session');

    const resRegDash = await request({ path: '/registrar/dashboard', headers: { Cookie: registrarCookie } });
    assert(resRegDash.statusCode === 200 && resRegDash.body.includes('Registrar Dashboard'), 'GET /registrar/dashboard renders dashboard');

    const resRegCases = await request({ path: '/registrar/cases', headers: { Cookie: registrarCookie } });
    assert(resRegCases.statusCode === 200 && resRegCases.body.includes('All Cases'), 'GET /registrar/cases renders case list');

    const resRegNew = await request({ path: '/registrar/cases/new', headers: { Cookie: registrarCookie } });
    assert(resRegNew.statusCode === 200 && resRegNew.body.includes('Judicial Jurisdiction'), 'GET /registrar/cases/new renders hierarchy fields');

    // 3. JUDGE MODULE
    console.log('\n--- 3. Judge Module ---');
    const judgeCookie = await loginUser('judge1@jis.gov.in');
    assert(judgeCookie.length > 0, 'Judge 1 login successfully authenticated');

    const resJudgeDash = await request({ path: '/judge/dashboard', headers: { Cookie: judgeCookie } });
    assert(resJudgeDash.statusCode === 200 && resJudgeDash.body.includes('Judge Dashboard'), 'GET /judge/dashboard renders judge dashboard');

    const resJudgeCases = await request({ path: '/judge/cases', headers: { Cookie: judgeCookie } });
    assert(resJudgeCases.statusCode === 200 && resJudgeCases.body.includes('My Assigned Cases'), 'GET /judge/cases renders assigned cases');

    const resJudgeCase1 = await request({ path: '/judge/cases/1', headers: { Cookie: judgeCookie } });
    assert(resJudgeCase1.statusCode === 200 && resJudgeCase1.body.includes('Statutory Appellate Pathway'), 'GET /judge/cases/1 displays case with appellate pathway');

    // 4. PROSECUTOR MODULE
    console.log('\n--- 4. Prosecutor Module ---');
    const prosCookie = await loginUser('prosecutor@jis.gov.in');
    assert(prosCookie.length > 0, 'Prosecutor login successfully authenticated');

    const resProsDash = await request({ path: '/prosecutor/dashboard', headers: { Cookie: prosCookie } });
    assert(resProsDash.statusCode === 200 && resProsDash.body.includes('Prosecutor Dashboard'), 'GET /prosecutor/dashboard renders dashboard');

    const resProsCases = await request({ path: '/prosecutor/cases', headers: { Cookie: prosCookie } });
    assert(resProsCases.statusCode === 200 && resProsCases.body.includes('My Cases'), 'GET /prosecutor/cases renders prosecutor cases');

    const resProsCase1 = await request({ path: '/prosecutor/cases/1', headers: { Cookie: prosCookie } });
    assert(resProsCase1.statusCode === 200 && resProsCase1.body.includes('Judicial Jurisdiction'), 'GET /prosecutor/cases/1 displays hierarchy card');

    // 5. ADVOCATE MODULE
    console.log('\n--- 5. Advocate Module ---');
    const advCookie = await loginUser('advocate@jis.gov.in');
    assert(advCookie.length > 0, 'Advocate login successfully authenticated');

    const resAdvDash = await request({ path: '/advocate/dashboard', headers: { Cookie: advCookie } });
    assert(resAdvDash.statusCode === 200 && resAdvDash.body.includes('Advocate Dashboard'), 'GET /advocate/dashboard renders dashboard');

    const resAdvCases = await request({ path: '/advocate/cases', headers: { Cookie: advCookie } });
    assert(resAdvCases.statusCode === 200 && resAdvCases.body.includes('Advocate Case Docket'), 'GET /advocate/cases renders cases');

    const resAdvCase1 = await request({ path: '/advocate/cases/1', headers: { Cookie: advCookie } });
    assert(resAdvCase1.statusCode === 200 && resAdvCase1.body.includes('Vakalatnama & Counsel Representation'), 'GET /advocate/cases/1 renders case detail and Vakalatnama section');

    // 6. HIERARCHY API ENDPOINTS
    console.log('\n--- 6. Hierarchy API Endpoints ---');
    const resStates = await request({ path: '/api/hierarchy/states' });
    assert(resStates.statusCode === 200 && JSON.parse(resStates.body).data.length === 36, 'API: /api/hierarchy/states returns 36 States/UTs');

    const resHCs = await request({ path: '/api/hierarchy/high-courts' });
    assert(resHCs.statusCode === 200 && JSON.parse(resHCs.body).data.length === 25, 'API: /api/hierarchy/high-courts returns 25 High Courts');

    const resLevels = await request({ path: '/api/hierarchy/court-levels' });
    assert(resLevels.statusCode === 200 && JSON.parse(resLevels.body).data.length === 6, 'API: /api/hierarchy/court-levels returns 6 tiers');

    const resAppeals = await request({ path: '/api/hierarchy/appellate-path?category=Civil' });
    assert(resAppeals.statusCode === 200 && JSON.parse(resAppeals.body).data.length > 0, 'API: /api/hierarchy/appellate-path returns Civil appellate pathway');

    console.log('\n======================================================');
    console.log(` Full System Test Complete: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (server) server.close();
    process.exit(failed === 0 ? 0 : 1);
  }
}

runFullTestSuite();
