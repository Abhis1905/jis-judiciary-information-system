'use strict';

/**
 * JIS – Judiciary Info System
 * Seed / Demo Data Script
 *
 * Run with:  node database/seed.js
 *
 * This script:
 *   1. Clears all tables (TRUNCATE with FK checks disabled)
 *   2. Inserts 5 demo users (one per role)
 *   3. Inserts 4 sample cases
 *   4. Inserts 5 hearings
 *   5. Inserts 2 trial notes
 *   6. Inserts 6 case laws (simulated SC Repository)
 *   7. Inserts 6 notifications
 *   8. Inserts 3 court notices
 *
 * NOTE on prosecutor_id: populated here via seed INSERT only.
 *   No UI assignment workflow exists for this field (approved decision).
 *
 * NOTE on advocate_id: intentionally NULL in seed data.
 *   It is set only when an Advocate uploads a Vakalatnama in the app (A2).
 */

require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;
const SEED_PASSWORD = 'Password@123';

// ── Date helpers ────────────────────────────────────────────────────
const fmt = (d) => d.toISOString().split('T')[0];
const today = new Date();
const daysAgo   = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return fmt(d); };
const daysAhead  = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d); };

async function run() {
  const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'jis_db'
  });

  console.log('\n  JIS – Seed Script');
  console.log('  ══════════════════════════════════════════════\n');

  try {
    // ── Hash password ───────────────────────────────────────────────
    process.stdout.write('  Hashing seed password...');
    const hash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
    console.log(' done\n');

    // ── Clear tables (preserve schema) ─────────────────────────────
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'court_notices', 'notifications', 'scheduling_requests',
      'efilings', 'pleadings', 'vakalatnamas', 'court_orders',
      'case_status_updates', 'trial_notes', 'judgements',
      'documents', 'hearings', 'cases', 'case_laws', 'users'
    ];
    for (const t of tables) {
      await pool.query(`TRUNCATE TABLE \`${t}\``);
    }
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('  [✓] Tables cleared\n');

    // ── 1. Users ────────────────────────────────────────────────────
    await pool.query(`
      INSERT INTO users (full_name, email, password, role) VALUES
        (?, ?, ?, 'registrar'),
        (?, ?, ?, 'judge'),
        (?, ?, ?, 'judge'),
        (?, ?, ?, 'prosecutor'),
        (?, ?, ?, 'advocate')
    `, [
      'Priya Sharma',          'registrar@jis.gov.in',  hash,
      'Justice Anil Mehta',    'judge1@jis.gov.in',     hash,
      'Justice Sunita Rao',    'judge2@jis.gov.in',     hash,
      'Rajesh Verma',          'prosecutor@jis.gov.in', hash,
      'Kavitha Nair',          'advocate@jis.gov.in',   hash
    ]);
    console.log('  [✓] 5 users inserted');

    // Fetch IDs
    const [users] = await pool.query('SELECT id, email FROM users');
    const uid = (email) => users.find(u => u.email === email).id;

    const registrarId  = uid('registrar@jis.gov.in');
    const judge1Id     = uid('judge1@jis.gov.in');
    const judge2Id     = uid('judge2@jis.gov.in');
    const prosecutorId = uid('prosecutor@jis.gov.in');
    // advocateId not used in seed cases — advocate_id set via Vakalatnama only

    // ── 2. Cases ────────────────────────────────────────────────────
    // prosecutor_id is seeded here per approved decision (no UI flow).
    // advocate_id is NULL — set only via Vakalatnama upload in Phase 2.
    await pool.query(`
      INSERT INTO cases
        (case_number, title, case_type, petitioner_name, respondent_name,
         description, status, is_public, filed_by, judge_id, prosecutor_id,
         advocate_id, filing_date)
      VALUES
        ('JIS/CRI/2024/001',
         'State vs Ramesh Kumar',
         'Criminal', 'State of Karnataka', 'Ramesh Kumar',
         'Criminal case involving alleged fraud and misappropriation of public funds.',
         'In Trial', 1, ?, ?, ?, NULL, ?),

        ('JIS/CIV/2024/002',
         'Sharma vs Gupta Properties',
         'Civil', 'Anita Sharma', 'Gupta Properties Pvt Ltd',
         'Civil dispute regarding breach of property sale agreement and refund of advance.',
         'Allocated', 1, ?, ?, NULL, NULL, ?),

        ('JIS/CON/2024/003',
         'Petition on Right to Information',
         'Constitutional', 'RTI Foundation', 'Union of India',
         'Constitutional petition challenging an amendment to the RTI Act, 2005.',
         'Judgement Pending', 1, ?, ?, ?, NULL, ?),

        ('JIS/FAM/2024/004',
         'Patel vs Patel – Child Custody Matter',
         'Family', 'Meena Patel', 'Rajiv Patel',
         'Family court matter regarding child custody arrangements.',
         'Filed', 0, ?, NULL, NULL, NULL, ?)
    `, [
      registrarId, judge1Id, prosecutorId, daysAgo(45),
      registrarId, judge1Id,               daysAgo(30),
      registrarId, judge2Id, prosecutorId, daysAgo(20),
      registrarId,                          daysAgo(5)
    ]);
    console.log('  [✓] 4 cases inserted');

    // Fetch case IDs
    const [cases] = await pool.query('SELECT id, case_number FROM cases');
    const cid = (num) => cases.find(c => c.case_number === num).id;

    const case1 = cid('JIS/CRI/2024/001');
    const case2 = cid('JIS/CIV/2024/002');
    const case3 = cid('JIS/CON/2024/003');
    // case4 is private (is_public=0), no hearings or public notices needed

    // ── 3. Hearings ─────────────────────────────────────────────────
    await pool.query(`
      INSERT INTO hearings
        (case_id, hearing_date, hearing_time, court_room, hearing_type, status, created_by)
      VALUES
        (?, ?, '10:00:00', 'Court Room 1', 'First Hearing', 'Completed', ?),
        (?, ?, '11:30:00', 'Court Room 1', 'Interim',       'Scheduled', ?),
        (?, ?, '14:00:00', 'Court Room 3', 'First Hearing', 'Scheduled', ?),
        (?, ?, '10:30:00', 'Court Room 2', 'Interim',       'Completed', ?),
        (?, ?, '15:00:00', 'Court Room 2', 'Final',         'Scheduled', ?)
    `, [
      case1, daysAgo(20),  registrarId,
      case1, daysAhead(7), registrarId,
      case2, daysAhead(3), registrarId,
      case3, daysAgo(10),  registrarId,
      case3, daysAhead(2), registrarId
    ]);
    console.log('  [✓] 5 hearings inserted');

    // ── 4. Trial Notes ──────────────────────────────────────────────
    await pool.query(`
      INSERT INTO trial_notes (case_id, judge_id, note_content) VALUES
        (?, ?, ?),
        (?, ?, ?)
    `, [
      case1, judge1Id,
      'Initial examination of witnesses conducted. Prosecution presented documentary evidence. Defence cross-examination pending.',
      case1, judge1Id,
      'Cross-examination of the accused completed. Both parties to submit written arguments by next hearing date.'
    ]);
    console.log('  [✓] 2 trial notes inserted');

    // ── 5. Case Laws (Simulated SC Repository – J3) ─────────────────
    await pool.query(`
      INSERT INTO case_laws (citation_number, case_name, year, court_name, summary) VALUES
        (?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?)
    `, [
      'AIR 1978 SC 597',
      'Maneka Gandhi vs Union of India',
      1978, 'Supreme Court of India',
      'Landmark judgment expanding Article 21 (Right to Life and Personal Liberty). The Court held that the procedure established by law must be fair, just, and reasonable — not arbitrary, fanciful, or oppressive. Overruled the narrow interpretation from A.K. Gopalan.',

      'AIR 1973 SC 1461',
      'Kesavananda Bharati vs State of Kerala',
      1973, 'Supreme Court of India',
      '13-judge bench decision establishing the Basic Structure Doctrine. Parliament has wide power to amend the Constitution under Article 368 but cannot alter or destroy the basic structure or essential framework of the Constitution.',

      'AIR 1950 SC 27',
      'A.K. Gopalan vs State of Madras',
      1950, 'Supreme Court of India',
      'Early Supreme Court interpretation of Articles 19 and 21. The Court initially adopted a narrow view, holding that the articles must be read independently rather than together. Later overruled by Maneka Gandhi.',

      'AIR 1975 SC 2299',
      'Indira Nehru Gandhi vs Raj Narain',
      1975, 'Supreme Court of India',
      'The Supreme Court struck down a constitutional amendment seeking to validate the Prime Minister\'s election. Reaffirmed the Basic Structure Doctrine and established that free and fair elections are part of the basic structure.',

      'AIR 1997 SC 3011',
      'Vishaka vs State of Rajasthan',
      1997, 'Supreme Court of India',
      'Landmark judgment on sexual harassment at the workplace. Court issued binding Vishaka Guidelines (constitutional status under Articles 14, 19, and 21) pending legislation on workplace harassment.',

      'AIR 1994 SC 1844',
      'S.R. Bommai vs Union of India',
      1994, 'Supreme Court of India',
      'The Court ruled that Presidential satisfaction for imposing Article 356 (President\'s Rule) must be based on objective material and is subject to judicial review. Federalism is part of the basic structure of the Constitution.'
    ]);
    console.log('  [✓] 6 case laws inserted');

    // ── 6. Notifications ─────────────────────────────────────────────
    await pool.query(`
      INSERT INTO notifications (user_id, case_id, message, is_read) VALUES
        (?, ?, ?, ?),
        (?, ?, ?, ?),
        (?, ?, ?, ?),
        (?, ?, ?, ?),
        (?, ?, ?, ?),
        (?, ?, ?, ?)
    `, [
      judge1Id,     case1, 'Case JIS/CRI/2024/001 – State vs Ramesh Kumar has been assigned to you.', 0,
      judge2Id,     case3, 'Case JIS/CON/2024/003 – Petition on Right to Information has been assigned to you.', 0,
      judge1Id,     case1, 'A hearing has been scheduled for Case JIS/CRI/2024/001. Check the schedule.', 1,
      prosecutorId, case1, 'You have been allocated to Case JIS/CRI/2024/001 – State vs Ramesh Kumar.', 0,
      prosecutorId, case3, 'You have been allocated to Case JIS/CON/2024/003 – Petition on Right to Information.', 0,
      prosecutorId, case1, 'Hearing notice: Case JIS/CRI/2024/001 has an upcoming Interim hearing. Please prepare accordingly.', 0
    ]);
    console.log('  [✓] 6 notifications inserted');

    // ── 7. Court Notices (C3 – public) ──────────────────────────────
    await pool.query(`
      INSERT INTO court_notices (notice_title, case_id, date_issued, content) VALUES
        (?, ?, ?, ?),
        (?, ?, ?, ?),
        (?, ?, ?, ?)
    `, [
      'Interim Hearing Notice – State vs Ramesh Kumar',
      case1, daysAhead(7),
      'The interim hearing for Case No. JIS/CRI/2024/001 (State vs Ramesh Kumar) is scheduled in Court Room 1 at 11:30 AM. All concerned parties and their counsel are directed to appear at the appointed time.',

      'Final Hearing Notice – RTI Petition',
      case3, daysAhead(2),
      'The final hearing for Constitutional Petition No. JIS/CON/2024/003 (RTI Foundation vs Union of India) is scheduled in Court Room 2 at 3:00 PM. This is a matter of public interest. Members of the public may observe proceedings subject to court capacity.',

      'General Notice – Upcoming Court Holiday',
      null, daysAhead(14),
      'The District Court will observe a two-day holiday on account of the National Day of Remembrance. All hearings scheduled during this period are temporarily postponed. Parties will be notified individually with rescheduled dates within 5 working days.'
    ]);
    console.log('  [✓] 3 court notices inserted\n');

    await pool.end();

    // ── Summary ──────────────────────────────────────────────────────
    console.log('  ══════════════════════════════════════════════');
    console.log('  Seed data inserted successfully.');
    console.log('  ══════════════════════════════════════════════\n');

    console.log('  DEMO LOGIN CREDENTIALS');
    console.log('  ──────────────────────────────────────────────');
    const creds = [
      { role: 'Registrar',        email: 'registrar@jis.gov.in' },
      { role: 'Judge (1)',         email: 'judge1@jis.gov.in' },
      { role: 'Judge (2)',         email: 'judge2@jis.gov.in' },
      { role: 'Public Prosecutor', email: 'prosecutor@jis.gov.in' },
      { role: 'Advocate',          email: 'advocate@jis.gov.in' }
    ];
    creds.forEach(c => {
      console.log(`  ${c.role.padEnd(18)} ${c.email.padEnd(30)} ${SEED_PASSWORD}`);
    });
    console.log('  ──────────────────────────────────────────────');
    console.log('  Citizen / Public: visit http://localhost:3000 (no login required)');
    console.log('  ══════════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n  [ERROR] Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

run();
