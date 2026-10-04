'use strict';

/**
 * JIS – Automated Database Backup Script
 *
 * Connects to MySQL using .env configuration and exports the complete
 * database schema and data into a timestamped SQL dump file in backups/.
 *
 * Does NOT expose credentials inside the generated dump file.
 * Uses pure Node.js + MySQL2 streaming batches for maximum portability across
 * macOS, Linux, Windows, and Docker containers.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function createBackup() {
  console.log('\n======================================================');
  console.log(' JIS – Automated Database Backup Utility              ');
  console.log('======================================================\n');

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jis_db'
  };

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFileName = `jis_backup_${timestamp}.sql`;
  const backupFilePath = path.join(backupDir, backupFileName);

  console.log(`[Backup] Target file: backups/${backupFileName}`);
  console.log(`[Backup] Connecting to database: ${dbConfig.database} at ${dbConfig.host}:${dbConfig.port}...`);

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('[Backup] Connected to MySQL successfully.\n');

    const writeStream = fs.createWriteStream(backupFilePath, { encoding: 'utf8' });

    // Header (credential-free)
    writeStream.write('-- ═══════════════════════════════════════════════════════════════════\n');
    writeStream.write(`-- JIS – Judiciary Info System Database Backup\n`);
    writeStream.write(`-- Backup Created: ${now.toISOString()}\n`);
    writeStream.write(`-- Target Database: ${dbConfig.database}\n`);
    writeStream.write('-- ═══════════════════════════════════════════════════════════════════\n\n');
    writeStream.write('SET FOREIGN_KEY_CHECKS = 0;\n');
    writeStream.write('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n');
    writeStream.write('SET NAMES utf8mb4;\n\n');

    // 1. Get all table names in order
    const [tables] = await connection.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log(`[Backup] Found ${tableNames.length} tables to export: ${tableNames.join(', ')}\n`);

    for (const tableName of tableNames) {
      process.stdout.write(`[Backup] Exporting table '${tableName}'...`);

      // Structure
      const [[createTable]] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
      writeStream.write(`--\n-- Structure for table \`${tableName}\`\n--\n`);
      writeStream.write(`DROP TABLE IF EXISTS \`${tableName}\`;\n`);
      writeStream.write(`${createTable['Create Table']};\n\n`);

      // Data
      const [[{ totalRows }]] = await connection.query(`SELECT COUNT(*) as totalRows FROM \`${tableName}\``);

      if (totalRows > 0) {
        writeStream.write(`--\n-- Data for table \`${tableName}\` (${totalRows} rows)\n--\n`);

        const batchSize = 2000;
        for (let offset = 0; offset < totalRows; offset += batchSize) {
          const [rows] = await connection.query(`SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`, [batchSize, offset]);
          if (rows.length === 0) break;

          const columnNames = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
          const valuesList = rows.map(row => {
            const vals = Object.values(row).map(val => {
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number') return val;
              if (typeof val === 'boolean') return val ? 1 : 0;
              if (val instanceof Date) {
                return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
              }
              if (Buffer.isBuffer(val)) {
                return `X'${val.toString('hex')}'`;
              }
              // String escaping
              const escaped = String(val)
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/\0/g, '\\0')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\x1a/g, '\\Z');
              return `'${escaped}'`;
            });
            return `(${vals.join(', ')})`;
          });

          writeStream.write(`INSERT INTO \`${tableName}\` (${columnNames}) VALUES\n  ${valuesList.join(',\n  ')};\n`);
        }
        writeStream.write('\n');
      }

      console.log(` done (${totalRows} rows).`);
    }

    writeStream.write('SET FOREIGN_KEY_CHECKS = 1;\n');
    writeStream.write('-- Backup completed successfully.\n');

    await new Promise((resolve, reject) => {
      writeStream.end(err => (err ? reject(err) : resolve()));
    });

    const stats = fs.statSync(backupFilePath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('\n======================================================');
    console.log(`✓ Backup successfully created!`);
    console.log(`  File: backups/${backupFileName}`);
    console.log(`  Size: ${sizeMb} MB (${stats.size} bytes)`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('\n[Backup ERROR] Failed to create database backup:', err.message);
    if (connection) await connection.end();
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

createBackup();
