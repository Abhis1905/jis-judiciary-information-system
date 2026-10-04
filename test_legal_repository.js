'use strict';

/**
 * End-to-End Test Suite for JIS Legal Knowledge Repository Routes
 */

process.env.NODE_ENV = 'test';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.test') });

const http = require('http');
const app = require('./app');

let server;
const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(reqPath) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${reqPath}`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('  TESTING LEGAL KNOWLEDGE REPOSITORY HTTP ENDPOINTS');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  server = app.listen(PORT);

  const db = require('./config/db');
  const [[firstAct]] = await db.query('SELECT id, act_code FROM legal_acts ORDER BY id ASC LIMIT 1');
  const [[firstSec]] = await db.query('SELECT id FROM legal_sections ORDER BY id ASC LIMIT 1');
  const [[firstJudg]] = await db.query("SELECT id FROM legal_judgments WHERE is_synthetic = 0 AND record_provenance = 'REAL_VERIFIED' ORDER BY id ASC LIMIT 1");
  const [[synthJudg]] = await db.query('SELECT id FROM legal_judgments WHERE is_synthetic = 1 ORDER BY id ASC LIMIT 1');
  const [[firstCat]] = await db.query('SELECT id FROM legal_categories ORDER BY id ASC LIMIT 1');

  const testCases = [
    { name: 'GET /legal (Legal Repository Dashboard)', path: '/legal', expectedStatus: 200, contains: 'Indian Statutory & Case Law Repository' },
    { name: 'GET /legal/acts (Statutory Codes Explorer)', path: '/legal/acts', expectedStatus: 200, contains: 'Statutory Acts & Codes Library' },
    { name: `GET /legal/acts/${firstAct.id} (Act Structure by ID)`, path: `/legal/acts/${firstAct.id}`, expectedStatus: 200, contains: 'Statutory Sections' },
    { name: `GET /legal/acts/IPC_1860 (Act Structure by Code)`, path: `/legal/acts/IPC_1860`, expectedStatus: 200, contains: 'Indian Penal Code' },
    { name: `GET /legal/sections/${firstSec.id} (Section Detail)`, path: `/legal/sections/${firstSec.id}`, expectedStatus: 200, contains: 'Statutory Provision Text' },
    { name: 'GET /legal/judgments/supreme-court (SC Landmarks)', path: '/legal/judgments/supreme-court', expectedStatus: 200, contains: 'Supreme Court Landmark Judgments' },
    { name: 'GET /legal/judgments/high-courts (HC Judgments)', path: '/legal/judgments/high-courts', expectedStatus: 200, contains: 'High Court Judgments Repository' },
    { name: `GET /legal/judgments/${firstJudg.id} (Verified Judgment Detail - Missing PDF Graceful State)`, path: `/legal/judgments/${firstJudg.id}`, expectedStatus: 200, contains: 'PDF currently unavailable' },
    { name: 'GET /legal/judgments/12 (Verified Judgment Detail - Full Research View & PDF CTA)', path: '/legal/judgments/12', expectedStatus: 200, contains: 'Read Judgment PDF' },
    { name: `GET /legal/judgments/${synthJudg.id} (Synthetic Judgment Blocked 404)`, path: `/legal/judgments/${synthJudg.id}`, expectedStatus: 404 },
    { name: 'GET /legal/judgments/12/pdf (Verified Judgment PDF Stream)', path: '/legal/judgments/12/pdf', expectedStatus: 200 },
    { name: 'GET /legal/judgments/11/pdf (Missing PDF Returns 404)', path: '/legal/judgments/11/pdf', expectedStatus: 404 },
    { name: `GET /legal/judgments/${synthJudg.id}/pdf (Synthetic Judgment PDF Blocked 404)`, path: `/legal/judgments/${synthJudg.id}/pdf`, expectedStatus: 404 },
    { name: 'GET /legal/mapping (Old ↔ New Law Cross-Reference)', path: '/legal/mapping', expectedStatus: 200, contains: 'Old ↔ New Criminal Law Cross-Reference Matrix' },
    { name: 'GET /legal/categories (Taxonomy Index)', path: '/legal/categories', expectedStatus: 200, contains: 'Legal Taxonomy & Subject Domains' },
    { name: `GET /legal/categories/${firstCat.id} (Category Detail)`, path: `/legal/categories/${firstCat.id}`, expectedStatus: 200, contains: 'Statutory Provisions Categorized' },
    { name: 'GET /legal/search?q=Puttaswamy (Universal Search & Match Context)', path: '/legal/search?q=Puttaswamy', expectedStatus: 200, contains: 'Matched in:' },
    { name: 'GET /api/legal/mapping/lookup?act=IPC_1860&sec=302 (API)', path: '/api/legal/mapping/lookup?act=IPC_1860&sec=302', expectedStatus: 200, isJson: true }
  ];

  for (const tc of testCases) {
    try {
      const res = await makeRequest(tc.path);
      let ok = res.statusCode === tc.expectedStatus;

      if (tc.contains && !res.body.includes(tc.contains)) {
        ok = false;
        console.error(`  ✗ [FAIL] ${tc.name} — Missing content "${tc.contains}" in response.`);
      }

      if (tc.isJson) {
        try {
          const parsed = JSON.parse(res.body);
          if (!parsed.success) {
            ok = false;
            console.error(`  ✗ [FAIL] ${tc.name} — API response success is false.`);
          }
        } catch (e) {
          ok = false;
          console.error(`  ✗ [FAIL] ${tc.name} — Response is not valid JSON.`);
        }
      }

      if (ok) {
        passed++;
        console.log(`  ✓ [PASS] ${tc.name} (Status ${res.statusCode})`);
      } else {
        failed++;
        console.error(`  ✗ [FAIL] ${tc.name} (Expected ${tc.expectedStatus}, got ${res.statusCode})`);
      }
    } catch (err) {
      failed++;
      console.error(`  ✗ [FAIL] ${tc.name} — Error: ${err.message}`);
    }
  }

  server.close();

  console.log('\n=============================================================');
  console.log(`  RESULTS: ${passed} Passed, ${failed} Failed out of ${testCases.length} Tests.`);
  console.log('=============================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
