'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function migrateHierarchy() {
  console.log('=== JIS: Starting Judiciary Hierarchy Migration ===');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jis_db',
    multipleStatements: true
  });

  try {
    // 1. Run hierarchy_schema.sql
    const schemaPath = path.join(__dirname, 'hierarchy_schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Applying hierarchy schema tables...');
    await connection.query(sql);
    console.log('  -> Hierarchy schema tables created/verified successfully.');

    // 2. Check and alter cases table
    console.log('Checking cases table for hierarchy columns...');
    const [existingCols] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'cases'
    `, [process.env.DB_NAME || 'jis_db']);

    const colNames = existingCols.map(c => c.COLUMN_NAME);

    const columnsToAdd = [
      { name: 'state_ut_id', type: 'INT NULL', fkTable: 'states_uts', fkCol: 'id' },
      { name: 'high_court_id', type: 'INT NULL', fkTable: 'high_courts', fkCol: 'id' },
      { name: 'bench_id', type: 'INT NULL', fkTable: 'high_court_benches', fkCol: 'id' },
      { name: 'district_id', type: 'INT NULL', fkTable: 'districts', fkCol: 'id' },
      { name: 'subordinate_court_id', type: 'INT NULL', fkTable: 'subordinate_courts', fkCol: 'id' },
      { name: 'court_level_id', type: 'INT NULL', fkTable: 'court_levels', fkCol: 'id' }
    ];

    for (const col of columnsToAdd) {
      if (!colNames.includes(col.name)) {
        console.log(`Adding column '${col.name}' to 'cases' table...`);
        await connection.query(`ALTER TABLE cases ADD COLUMN ${col.name} ${col.type}`);
        
        // Add foreign key
        const fkName = `fk_cases_${col.name}`;
        console.log(`Adding foreign key '${fkName}'...`);
        await connection.query(`
          ALTER TABLE cases 
          ADD CONSTRAINT ${fkName} 
          FOREIGN KEY (${col.name}) REFERENCES ${col.fkTable}(${col.fkCol}) 
          ON DELETE SET NULL ON UPDATE CASCADE
        `);
      } else {
        console.log(`  -> Column '${col.name}' already exists.`);
      }
    }

    console.log('=== Judiciary Hierarchy Migration Complete ===');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrateHierarchy();
