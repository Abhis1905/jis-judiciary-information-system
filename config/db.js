'use strict';

const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.join(__dirname, '..', '.env.test'), override: true });
}

const isTestEnv = process.env.NODE_ENV === 'test';
const resolvedDbName = isTestEnv
  ? (process.env.TEST_DB_NAME || 'jis_test_db')
  : (process.env.DB_NAME || 'jis_db');

if (isTestEnv && resolvedDbName === 'jis_db') {
  throw new Error('SECURITY/ISOLATION GUARD: Tests must NEVER run against the working database (jis_db). Use jis_test_db.');
}

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3307', 10),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           resolvedDbName,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  charset:            'utf8mb4'
});

// Test connection on startup and log result
pool.getConnection()
  .then(conn => {
    console.log(`  [DB] MySQL connected successfully (${resolvedDbName})`);
    conn.release();
  })
  .catch(err => {
    console.error(`  [DB] MySQL connection failed (${resolvedDbName}):`, err.message);
    console.error('  [DB] Verify DB credentials in your .env file.');
  });

module.exports = pool;
