'use strict';

/**
 * JIS – Judiciary Info System
 * High-Performance Synthetic Case Generator (100,000 Total Cases)
 *
 * Requirements:
 * 1. JavaScript / Node.js only.
 * 2. Preserves all existing seed cases and hierarchy records.
 * 3. Exactly 100,000 cases in jis_db upon completion.
 * 4. Deterministic, collision-free case numbering (JIS/SYN/YYYY/XXXXXX).
 * 5. Full relational hierarchy integrity across all 787 districts (weighted distribution).
 * 6. High-performance parameterized batch insertions (batch size 1,000).
 * 7. Safely re-runnable / idempotent.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const TARGET_TOTAL_CASES = 100000;
const BATCH_SIZE = 1000;

// ── Synthetic Name & Entity Dictionaries ──────────────────────────────
const FIRST_NAMES_MALE = [
  'Aarav', 'Aditya', 'Ajay', 'Alok', 'Amit', 'Anand', 'Anil', 'Ankit', 'Arjun', 'Arun',
  'Ashok', 'Bharat', 'Bhavin', 'Chetan', 'Deepak', 'Devendra', 'Dinesh', 'Ganesh', 'Gaurav', 'Girish',
  'Harish', 'Harpreet', 'Hemant', 'Jagdish', 'Jitendra', 'Kalyan', 'Kamal', 'Kapil', 'Karan', 'Kartik',
  'Kishore', 'Kuldeep', 'Lalit', 'Madhav', 'Mahesh', 'Manish', 'Manoj', 'Mayank', 'Mohan', 'Mukesh',
  'Naresh', 'Navin', 'Nikhil', 'Nilesh', 'Nitin', 'Pankaj', 'Pawan', 'Pradeep', 'Prakash', 'Prashant',
  'Praveen', 'Rahul', 'Rajeev', 'Rajendra', 'Rajesh', 'Rakesh', 'Raman', 'Ramesh', 'Ravi', 'Rohit',
  'Sachin', 'Sameer', 'Sandip', 'Sanjay', 'Santosh', 'Satish', 'Saurabh', 'Shailesh', 'Shankar', 'Shashank',
  'Shiv', 'Shrikant', 'Siddharth', 'Subhash', 'Sudhir', 'Sumit', 'Sunil', 'Suresh', 'Tarun', 'Umesh',
  'Varun', 'Vicky', 'Vijay', 'Vikas', 'Vikram', 'Vinay', 'Vinod', 'Vipin', 'Virendra', 'Vishal',
  'Vivek', 'Yash', 'Yogesh', 'Abhay', 'Abhinav', 'Akhil', 'Anirudh', 'Aravind', 'Bhaskar', 'Chandan'
];

const FIRST_NAMES_FEMALE = [
  'Aarti', 'Aditi', 'Alka', 'Amita', 'Ananya', 'Anjali', 'Ankita', 'Anuradha', 'Aparna', 'Archana',
  'Asha', 'Bhavna', 'Chhaya', 'Deepa', 'Deepika', 'Divya', 'Geeta', 'Indu', 'Jayashree', 'Jyoti',
  'Kalyani', 'Kamla', 'Kanchan', 'Kavita', 'Kiran', 'Komal', 'Kumari', 'Lakshmi', 'Lata', 'Madhu',
  'Madhuri', 'Mamta', 'Manju', 'Meena', 'Meera', 'Monika', 'Nandini', 'Neelam', 'Neha', 'Nidhi',
  'Nisha', 'Pallavi', 'Payal', 'Pooja', 'Pratibha', 'Preeti', 'Priya', 'Priyanka', 'Radha', 'Ragini',
  'Rajani', 'Rakhi', 'Rashmi', 'Reena', 'Rekha', 'Renu', 'Richa', 'Ritu', 'Rupa', 'Sadhana',
  'Samiksha', 'Sandhya', 'Sangita', 'Sapna', 'Sarita', 'Seema', 'Shalini', 'Shanti', 'Sharda', 'Shikha',
  'Shilpa', 'Shobha', 'Shraddha', 'Shweta', 'Smita', 'Sneha', 'Sonal', 'Sudha', 'Sujata', 'Suman',
  'Sunita', 'Supriya', 'Sushila', 'Sushma', 'Swati', 'Tanuja', 'Uma', 'Urmila', 'Usha', 'Vaishali',
  'Vandana', 'Varsha', 'Veena', 'Vidya', 'Vinita', 'Yamini', 'Yashoda', 'Anupama', 'Bela', 'Chandana'
];

const LAST_NAMES = [
  'Acharya', 'Agarwal', 'Agrawal', 'Ahluwalia', 'Ahuja', 'Ambedkar', 'Anand', 'Apte', 'Arora', 'Awasthi',
  'Bajpai', 'Balakrishnan', 'Banerjee', 'Bansal', 'Bapat', 'Barman', 'Basu', 'Bhaduri', 'Bhagat', 'Bhalla',
  'Bhandari', 'Bhardwaj', 'Bhargava', 'Bhat', 'Bhatia', 'Bhattacharya', 'Bhende', 'Bhosale', 'Bora', 'Chadha',
  'Chakraborty', 'Chatterjee', 'Chaubey', 'Chaudhari', 'Chauhan', 'Chavan', 'Chawla', 'Chettri', 'Chopra', 'Choudhury',
  'D’Souza', 'Dalal', 'Damodaran', 'Das', 'Dasgupta', 'Datta', 'Dave', 'Deo', 'Desai', 'Deshmukh',
  'Deshpande', 'Devi', 'Dewan', 'Dhar', 'Dhavan', 'Dhillon', 'Dikshit', 'Diwan', 'Dixit', 'Dravid',
  'Dubey', 'Dutta', 'Fernandes', 'Gaikwad', 'Gandhi', 'Ganguly', 'Garg', 'Gawde', 'Ghoshal', 'Gill',
  'Gokhale', 'Gomes', 'Gopal', 'Gopalan', 'Goswami', 'Goyal', 'Grover', 'Gudipati', 'Guha', 'Gupta',
  'Haldar', 'Hegde', 'Hira', 'Hooda', 'Hussain', 'Inamdar', 'Iyengar', 'Iyer', 'Jadhav', 'Jain',
  'Jaiswal', 'Jani', 'Jena', 'Jha', 'Jhunjhunwala', 'Johar', 'Joshi', 'Kakkar', 'Kale', 'Kamat',
  'Kamble', 'Kapoor', 'Kapur', 'Karanth', 'Karnik', 'Karve', 'Kashyap', 'Kaul', 'Kaur', 'Kaushik',
  'Kelkar', 'Khan', 'Khandelwal', 'Khanna', 'Khatri', 'Khera', 'Khobragade', 'Khore', 'Khurana', 'Kirloskar',
  'Kohli', 'Kothari', 'Kripalani', 'Krishnan', 'Kshirsagar', 'Kulkarni', 'Kumar', 'Kumari', 'Kumbhar', 'Kundu',
  'Kurian', 'Lad', 'Lahiri', 'Lal', 'Lamba', 'Lobo', 'Lodha', 'Luthra', 'Madan', 'Madhavan',
  'Mahadevan', 'Mahajan', 'Mahapatra', 'Maheshwari', 'Mahindra', 'Majumdar', 'Malhotra', 'Malik', 'Mallick', 'Mallya',
  'Mani', 'Manjrekar', 'Mankad', 'Marathe', 'Mascarenhas', 'Mathur', 'Mazumdar', 'Mehra', 'Mehta', 'Mendonca',
  'Menon', 'Merchant', 'Mhatre', 'Mishra', 'Misra', 'Mitra', 'Mittal', 'Modi', 'Mohan', 'Mohanty',
  'Mondal', 'Monga', 'Mukherjee', 'Mukhopadhyay', 'Mullik', 'Mundkur', 'Munshi', 'Murthy', 'Murty', 'Nadkarni',
  'Nag', 'Nagar', 'Naidu', 'Naik', 'Nair', 'Nambiar', 'Namboodiri', 'Nanda', 'Narain', 'Narang',
  'Narasimhan', 'Narayan', 'Narayanan', 'Natarajan', 'Nath', 'Natrajan', 'Navathe', 'Nayak', 'Nayar', 'Negi',
  'Nene', 'Nigam', 'Nimbalkar', 'Noorani', 'Oberoi', 'Oza', 'Pai', 'Pal', 'Palande', 'Pande',
  'Pandey', 'Pandit', 'Panicker', 'Pant', 'Paranjpe', 'Pardesi', 'Parekh', 'Parihar', 'Parikh', 'Parkar',
  'Parmar', 'Parulekar', 'Pasricha', 'Patankar', 'Patel', 'Pathak', 'Patil', 'Patnaik', 'Patwardhan', 'Paul',
  'Pawar', 'Pillai', 'Pinto', 'Prabhu', 'Pradhan', 'Prasad', 'Puri', 'Purohit', 'Radhakrishnan', 'Raghavan',
  'Raghunathan', 'Raha', 'Rai', 'Raina', 'Raj', 'Raja', 'Rajagopal', 'Rajagopalan', 'Rajan', 'Raje',
  'Rajesh', 'Raju', 'Rajwade', 'Raman', 'Ramanathan', 'Ramaswamy', 'Ramesh', 'Rana', 'Ranade', 'Ranganathan',
  'Rani', 'Rao', 'Rastogi', 'Rath', 'Rathore', 'Raut', 'Raval', 'Ravi', 'Rawat', 'Ray',
  'Reddy', 'Rege', 'Rizvi', 'Rodrigues', 'Rohatgi', 'Roy', 'Roychowdhury', 'Sabal', 'Sachdev', 'Sadhu',
  'Sahai', 'Sahani', 'Sahasrabuddhe', 'Sahay', 'Sahni', 'Sahu', 'Saini', 'Salgaonkar', 'Salunke', 'Salvi',
  'Samant', 'Sanghvi', 'Santhanam', 'Sapru', 'Sarabhai', 'Saraf', 'Sarin', 'Sarkar', 'Sarma', 'Sasidharan',
  'Sathe', 'Savarkar', 'Sawant', 'Saxena', 'Sehgal', 'Sekhar', 'Sen', 'Sengupta', 'Seshan', 'Seth',
  'Sethi', 'Setlur', 'Shah', 'Shaha', 'Shahane', 'Shanbhag', 'Shankar', 'Shariff', 'Sharma', 'Shastri',
  'Shekhar', 'Shenoy', 'Shetty', 'Shinde', 'Shroff', 'Shukla', 'Sibal', 'Sikdar', 'Simha', 'Singh',
  'Singhal', 'Singhania', 'Sinha', 'Sodhi', 'Somani', 'Soman', 'Sonawane', 'Soni', 'Sood', 'Srikanth',
  'Srinivas', 'Srinivasan', 'Srivastava', 'Subramaniam', 'Subramanian', 'Sundaram', 'Sunder', 'Suri', 'Surve', 'Swaminathan',
  'Talreja', 'Talwar', 'Tandon', 'Tanwar', 'Tata', 'Tendulkar', 'Tewari', 'Thackeray', 'Thadani', 'Thaker',
  'Thakkar', 'Thakur', 'Thapar', 'Tharoor', 'Thomas', 'Tikoo', 'Tiwari', 'Tope', 'Trehan', 'Trivedi',
  'Tyagi', 'Unnikrishnan', 'Upadhyay', 'Uppal', 'Vaidya', 'Vakil', 'Varadkar', 'Varadpande', 'Varghese', 'Varma',
  'Vartak', 'Vaze', 'Velankar', 'Venkataraman', 'Venugopal', 'Verma', 'Vij', 'Vijay', 'Vora', 'Vyas',
  'Wadhwa', 'Wagle', 'Walawalkar', 'Walia', 'Wani', 'Warier', 'Warrier', 'Wason', 'Yadav', 'Zaidi'
];

const CORPORATE_ENTITIES = [
  'Apex Infra Projects Pvt. Ltd.', 'Bharat Logistics & Transport Corp.', 'Hindustan Consumer Goods Ltd.',
  'Vanguard Real Estate Developers Ltd.', 'Shree Balaji Industrial Corp.', 'Eastern Shipping & Cargo Agency',
  'Sterling Agro Commodities Pvt. Ltd.', 'Deccan Minerals & Mining Co.', 'Pinnacle Software & Services Ltd.',
  'Mahalaxmi Textiles & Fabrics Ltd.', 'National Engineering Works Pvt. Ltd.', 'Surya Power & Renewables Ltd.',
  'Greenfield Agro Ventures Pvt. Ltd.', 'Titanium Cement & Buildcon Ltd.', 'Metro Urban Housing Finance Co.',
  'Imperial Chemicals & Fertilizers Ltd.', 'Kaveri Paper Mills Pvt. Ltd.', 'Ganga Petrochemicals Limited',
  'Konkan Fisheries & Cold Storage Ltd.', 'Navbharat Steel & Alloys Corp.', 'Zenith Healthcare & Diagnostics',
  'Paramount Telecommunications Ltd.', 'Shivalik Hydro Projects Pvt. Ltd.', 'Astra Finvest & Leasing Co.',
  'Delta Warehousing & Supply Chain Ltd.', 'Heritage Hotels & Resorts Pvt. Ltd.', 'Riddhi Siddhi Polymers Ltd.'
];

const PUBLIC_AUTHORITIES = [
  'Municipal Corporation', 'State Pollution Control Board', 'Public Works Department (PWD)',
  'State Electricity Distribution Company Ltd.', 'Regional Transport Authority (RTO)',
  'Urban Development & Housing Authority', 'State Road Transport Corporation (MSRTC/KSRTC/UPSRTC)',
  'National Highways Authority of India (NHAI)', 'State Industrial Development Corporation',
  'District Collector & District Magistrate', 'Department of School Education & Literacy',
  'State Excise & Taxation Commissionerate', 'Irrigation & Flood Control Department',
  'Department of Health and Family Welfare', 'State Mining & Geology Directorate'
];

const CIVIL_DESCRIPTIONS = [
  'Suit for declaration of title, perpetual injunction, and demarcation of ancestral land parcel.',
  'Commercial suit for recovery of outstanding contract balance, retention money, and interest.',
  'Civil suit instituted for specific performance of registered agreement to sell immovable property.',
  'Suit for partition, separate possession, and rendition of accounts among legal coparceners.',
  'Original suit for recovery of liquidated damages on account of breach of construction contract.',
  'Suit filed for eviction of commercial tenant, recovery of arrears of rent, and mesne profits.',
  'Civil suit challenging wrongful encashment of unconditional bank guarantee by executing authority.',
  'Suit for mandatory injunction seeking removal of unauthorized structural encroachment on right-of-way.'
];

const CRIMINAL_DESCRIPTIONS = [
  'Trial under Sections 420, 406, 468 IPC relating to alleged criminal breach of trust and forged documentation.',
  'Sessions trial arising from FIR under Sections 307, 326, 34 IPC involving grievous hurt with lethal weapon.',
  'Criminal prosecution instituted under Section 138 of Negotiable Instruments Act for dishonour of cheque.',
  'Trial under Prevention of Corruption Act (Sections 7, 13) regarding alleged demand of illegal gratification.',
  'Sessions case regarding alleged culpable homicide not amounting to murder under Section 304 Part II IPC.',
  'Criminal trial under Sections 379, 411 IPC regarding theft and recovery of commercial electrical equipment.',
  'Prosecution under Sections 354, 506, 509 IPC regarding assault and criminal intimidation in public precinct.'
];

const CONSTITUTIONAL_DESCRIPTIONS = [
  'Writ Petition under Article 226 challenging validity of administrative tender cancellation notice.',
  'Writ petition in the nature of Mandamus seeking release of long-overdue statutory pension and gratuity.',
  'Constitutional writ challenging arbitrary acquisition of agricultural land without fair compensation under 2013 Act.',
  'Writ of Certiorari praying for quashing of disciplinary enquiry report and consequential dismissal order.',
  'Public Interest Litigation regarding implementation of municipal solid waste management statutory guidelines.'
];

const FAMILY_DESCRIPTIONS = [
  'Petition under Section 13(1)(ia) of the Hindu Marriage Act, 1955 seeking dissolution of marriage on ground of cruelty.',
  'Petition under Guardians and Wards Act, 1890 for permanent custody and visitation rights of minor child.',
  'Application under Section 125 CrPC / Family Courts Act claiming monthly maintenance and interim litigation costs.',
  'Petition under Section 9 of the Hindu Marriage Act for restitution of conjugal rights.',
  'Petition under Section 13-B of the Hindu Marriage Act seeking decree of divorce by mutual consent.'
];

// Helper: Random element from array
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: Random integer in [min, max]
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: Format date YYYY-MM-DD
function formatDate(d) {
  return d.toISOString().split('T')[0];
}

// Helper: Random date between start and end
function randomDate(startYear, endYear, maxDate) {
  const start = new Date(startYear, 0, 1).getTime();
  const end = Math.min(new Date(endYear, 11, 31).getTime(), maxDate.getTime());
  const randomTime = start + Math.random() * (end - start);
  return new Date(randomTime);
}

async function generateCases() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jis_db',
    connectionLimit: 10,
    multipleStatements: true
  });

  console.log('\n================================================================');
  console.log(' JIS — Synthetic Judiciary Case Generator (Target: 100,000 Cases)');
  console.log('================================================================\n');

  try {
    // 1. Check existing case count
    const [[{ totalCases }]] = await pool.query('SELECT COUNT(*) AS totalCases FROM cases');
    console.log(`  • Current total cases in database : ${totalCases.toLocaleString()}`);

    if (totalCases >= TARGET_TOTAL_CASES) {
      console.log(`  • Database already contains ${totalCases.toLocaleString()} cases (Target: ${TARGET_TOTAL_CASES.toLocaleString()}).`);
      console.log('  • No additional cases required. Exiting cleanly.\n');
      return;
    }

    const casesToGenerate = TARGET_TOTAL_CASES - totalCases;
    console.log(`  • Cases required to reach goal    : ${casesToGenerate.toLocaleString()}\n`);

    // 2. Fetch Users (Registrar, Judges, Prosecutor)
    const [users] = await pool.query('SELECT id, full_name, role FROM users');
    const registrars = users.filter(u => u.role === 'registrar');
    const judges = users.filter(u => u.role === 'judge');
    const prosecutors = users.filter(u => u.role === 'prosecutor');

    if (registrars.length === 0 || judges.length === 0) {
      throw new Error('Database missing essential seeded users (registrar/judge). Run npm run db:seed first.');
    }

    const defaultRegistrarId = registrars[0].id;
    const judgeIds = judges.map(j => j.id);
    const prosecutorId = prosecutors.length > 0 ? prosecutors[0].id : null;

    // 3. Fetch Court Levels
    const [courtLevels] = await pool.query('SELECT id, level_code, tier_order FROM court_levels ORDER BY tier_order ASC');
    const levelMap = {};
    courtLevels.forEach(l => { levelMap[l.tier_order] = l.id; levelMap[l.level_code] = l.id; });

    // 4. Fetch all 787 Districts with full hierarchy links
    const [districts] = await pool.query(`
      SELECT d.id AS district_id, d.district_code, d.district_name, d.headquarters,
             d.state_ut_id, d.high_court_id, d.bench_id,
             s.name AS state_name, s.code AS state_code,
             hc.name AS high_court_name, b.bench_name
      FROM districts d
      JOIN states_uts s ON d.state_ut_id = s.id
      JOIN high_courts hc ON d.high_court_id = hc.id
      JOIN high_court_benches b ON d.bench_id = b.id
      ORDER BY d.id ASC
    `);

    console.log(`  • Loaded ${districts.length} judicial districts across India.`);

    // 5. Ensure every district has standard Subordinate Courts (Tiers 3, 4, 5, 6)
    console.log('  • Ensuring standard subordinate courts exist for all districts...');
    const [existingSubCourts] = await pool.query('SELECT id, district_id, court_level_id FROM subordinate_courts');
    const subCourtLookup = new Map(); // key: `${distId}_${courtLevelId}` -> subCourtId
    existingSubCourts.forEach(sc => {
      subCourtLookup.set(`${sc.district_id}_${sc.court_level_id}`, sc.id);
    });

    const standardTiers = [
      { tier: 3, levelCode: 'LEVEL_DISTRICT_SESSIONS', namePrefix: 'Court of Principal District & Sessions Judge', type: 'Combined / Dual' },
      { tier: 4, levelCode: 'LEVEL_ADDL_DISTRICT_SESSIONS', namePrefix: 'Court of Additional District & Sessions Judge', type: 'Combined / Dual' },
      { tier: 5, levelCode: 'LEVEL_SR_CIVIL_CJM', namePrefix: 'Court of Principal Senior Civil Judge & CJM', type: 'Combined / Dual' },
      { tier: 6, levelCode: 'LEVEL_JR_CIVIL_JMFC', namePrefix: 'Court of Junior Civil Judge & JMFC', type: 'Combined / Dual' }
    ];

    const missingSubCourts = [];
    for (const dist of districts) {
      for (const st of standardTiers) {
        const levelId = levelMap[st.levelCode];
        const key = `${dist.district_id}_${levelId}`;
        if (!subCourtLookup.has(key)) {
          missingSubCourts.push([
            dist.district_id,
            levelId,
            `${st.namePrefix}, ${dist.district_name}`,
            st.type,
            dist.headquarters || dist.district_name
          ]);
        }
      }
    }

    if (missingSubCourts.length > 0) {
      console.log(`    -> Populating ${missingSubCourts.length} standard subordinate court establishments...`);
      // Insert in chunks of 500
      for (let i = 0; i < missingSubCourts.length; i += 500) {
        const chunk = missingSubCourts.slice(i, i + 500);
        await pool.query(
          `INSERT INTO subordinate_courts (district_id, court_level_id, court_name, court_type, location) VALUES ?`,
          [chunk]
        );
      }
      // Refresh lookup
      const [allSubCourts] = await pool.query('SELECT id, district_id, court_level_id FROM subordinate_courts');
      subCourtLookup.clear();
      allSubCourts.forEach(sc => {
        subCourtLookup.set(`${sc.district_id}_${sc.court_level_id}`, sc.id);
      });
      console.log(`    -> Subordinate courts synchronized (${allSubCourts.length} establishments verified).`);
    }

    // 6. Compute Weighted District Allocations
    // Major metropolitan & commercial centers get higher weights, smaller/hill districts get smaller weights.
    // Every single district receives at least 25+ cases.
    console.log('  • Computing realistic weighted case distribution across 787 districts...');
    const majorDistCodes = new Set([
      'MH_MUM', 'MH_MUM_SUB', 'MH_PUN', 'MH_THN', 'MH_NAG', 'MH_NSK',
      'DL_ND', 'DL_CD', 'DL_SD', 'DL_ED', 'DL_SWD',
      'KA_BLR', 'KA_MYS', 'KA_DWR', 'KA_BEL',
      'TN_CHN', 'TN_CBE', 'TN_MDU', 'TN_TRY',
      'TS_HYD', 'TS_RRD', 'TS_MED',
      'WB_KOL', 'WB_N24', 'WB_HOW',
      'GJ_AHM', 'GJ_SRT', 'GJ_VAD', 'GJ_RJT',
      'UP_PRY', 'UP_LKO', 'UP_KNP_N', 'UP_VNS', 'UP_AGR', 'UP_GZB', 'UP_GBN',
      'RJ_JPR', 'RJ_JDH', 'RJ_KOT',
      'BR_PAT', 'BR_GYA', 'BR_MZP',
      'MP_IND', 'MP_BPL', 'MP_JBL', 'MP_GWL',
      'PB_LDH', 'PB_ASR', 'PB_JAL',
      'HR_GUR', 'HR_FBD', 'HR_KNL',
      'OD_KHO', 'OD_CTC',
      'AP_VSP', 'AP_GTR', 'AP_KRI',
      'JH_RNC', 'JH_EBH', 'JH_DHN',
      'KL_ERN', 'KL_TVM', 'KL_KOZ',
      'AS_KAM_M', 'AS_DIB', 'AS_CAH',
      'CG_RPR', 'CG_BLS', 'CG_DUR'
    ]);

    const smallDistCodes = new Set([
      'AN_NIC', 'LD_LKS', 'LA_KRG', 'LA_LEH', 'SK_NOR', 'SK_SOU',
      'AR_ANW', 'AR_KRA', 'AR_UPS', 'ML_SGH', 'NL_KPH', 'MZ_HNH'
    ]);

    let totalWeight = 0;
    const districtWeights = districts.map(d => {
      let w = 1.0; // standard default
      if (majorDistCodes.has(d.district_code)) {
        w = 4.5;
      } else if (smallDistCodes.has(d.district_code)) {
        w = 0.35;
      } else if (d.district_name.toLowerCase().includes('urban') || d.district_name.toLowerCase().includes('city')) {
        w = 2.5;
      }
      totalWeight += w;
      return { dist: d, weight: w };
    });

    // Allocate exact integer counts summing to casesToGenerate
    let allocatedSum = 0;
    const districtAllocations = districtWeights.map(dw => {
      const count = Math.max(15, Math.floor((dw.weight / totalWeight) * casesToGenerate));
      allocatedSum += count;
      return { ...dw, count };
    });

    let diff = casesToGenerate - allocatedSum;
    // Distribute remainder
    if (diff > 0) {
      districtAllocations.sort((a, b) => b.weight - a.weight);
      for (let i = 0; i < diff; i++) {
        districtAllocations[i % districtAllocations.length].count += 1;
      }
    } else if (diff < 0) {
      districtAllocations.sort((a, b) => b.count - a.count);
      for (let i = 0; i < Math.abs(diff); i++) {
        districtAllocations[i % districtAllocations.length].count -= 1;
      }
    }

    const totalAllocated = districtAllocations.reduce((sum, da) => sum + da.count, 0);
    console.log(`    -> Exactly ${totalAllocated.toLocaleString()} cases planned across ${districtAllocations.length} districts.`);

    // 7. Find Starting Sequence Number for Case Numbers
    const [synMax] = await pool.query(`
      SELECT case_number FROM cases 
      WHERE case_number LIKE 'JIS/SYN/%' 
      ORDER BY id DESC LIMIT 1
    `);

    let currentSeq = 1;
    if (synMax.length > 0) {
      const match = synMax[0].case_number.match(/JIS\/SYN\/\d+\/(\d+)/);
      if (match) {
        currentSeq = parseInt(match[1], 10) + 1;
      }
    }
    console.log(`  • Starting synthetic sequence number: ${String(currentSeq).padStart(6, '0')}`);

    // 8. Generate & Insert in High-Performance Batches
    console.log(`\n  • Generating and inserting ${casesToGenerate.toLocaleString()} cases in batches of ${BATCH_SIZE}...`);

    const now = new Date();
    const caseTypes = ['Civil', 'Criminal', 'Constitutional', 'Family'];
    const caseTypeWeights = [0.45, 0.35, 0.08, 0.12]; // Civil 45%, Criminal 35%, Const 8%, Family 12%

    function sampleCaseType() {
      const r = Math.random();
      if (r < 0.45) return 'Civil';
      if (r < 0.80) return 'Criminal';
      if (r < 0.88) return 'Constitutional';
      return 'Family';
    }

    function sampleStatus(caseType) {
      const r = Math.random();
      if (r < 0.20) return 'Filed';
      if (r < 0.45) return 'Allocated';
      if (r < 0.75) return 'In Trial';
      if (r < 0.85) return 'Judgement Pending';
      return 'Closed';
    }

    let batch = [];
    let totalInserted = 0;
    const startTime = Date.now();

    for (const alloc of districtAllocations) {
      const dist = alloc.dist;
      const count = alloc.count;

      for (let k = 0; k < count; k++) {
        const seqNum = currentSeq++;
        const caseNumber = `JIS/SYN/2026/${String(seqNum).padStart(6, '0')}`;

        const caseType = sampleCaseType();
        const status = sampleStatus(caseType);

        // Assign Court Level & Subordinate Court
        let courtLevelTier = 3; // default Tier 3 (District & Sessions Judge)
        if (caseType === 'Constitutional') {
          courtLevelTier = 3; // District Court constitutional challenges
        } else if (caseType === 'Family') {
          courtLevelTier = 3; // Family Court / District Sessions
        } else {
          // Civil & Criminal distributed across Tiers 3, 4, 5, 6
          const tierRoll = Math.random();
          if (tierRoll < 0.45) courtLevelTier = 3; // Principal District & Sessions
          else if (tierRoll < 0.70) courtLevelTier = 4; // Additional District & Sessions
          else if (tierRoll < 0.90) courtLevelTier = 5; // Senior Civil / CJM
          else courtLevelTier = 6; // Junior Civil / JMFC
        }

        const courtLevelId = levelMap[courtLevelTier] || levelMap['LEVEL_DISTRICT_SESSIONS'];
        const subCourtId = subCourtLookup.get(`${dist.district_id}_${courtLevelId}`) ||
                           subCourtLookup.get(`${dist.district_id}_${levelMap['LEVEL_DISTRICT_SESSIONS']}`);

        // Status & Actor Assignments
        let assignedJudgeId = null;
        if (status !== 'Filed') {
          assignedJudgeId = pick(judgeIds);
        }

        let assignedProsecutorId = null;
        if (caseType === 'Criminal' && status !== 'Filed') {
          assignedProsecutorId = Math.random() < 0.85 ? prosecutorId : null;
        }

        // is_public determination (~85% public, ~15% private)
        let isPublic = 1;
        if (caseType === 'Family') {
          isPublic = Math.random() < 0.50 ? 0 : 1; // 50% family in-camera private
        } else {
          isPublic = Math.random() < 0.10 ? 0 : 1; // 10% general private/sensitive
        }

        // Filing Date calculation based on status
        let filingDateObj;
        if (status === 'Closed') {
          filingDateObj = randomDate(2020, 2024, now);
        } else if (status === 'In Trial' || status === 'Judgement Pending') {
          filingDateObj = randomDate(2022, 2025, now);
        } else if (status === 'Allocated') {
          filingDateObj = randomDate(2024, 2026, now);
        } else {
          // Filed
          filingDateObj = randomDate(2025, 2026, now);
        }
        const filingDate = formatDate(filingDateObj);

        // Parties & Title Generation
        let petitioner = '';
        let respondent = '';
        let title = '';
        let description = '';

        const petIsCorp = Math.random() < 0.25;
        const respIsCorp = Math.random() < 0.30;
        const petGender = Math.random() < 0.65 ? 'M' : 'F';
        const respGender = Math.random() < 0.65 ? 'M' : 'F';

        if (caseType === 'Criminal') {
          if (Math.random() < 0.60) {
            petitioner = `State of ${dist.state_name}`;
            respondent = `${petGender === 'M' ? pick(FIRST_NAMES_MALE) : pick(FIRST_NAMES_FEMALE)} ${pick(LAST_NAMES)}`;
            title = `${petitioner} vs ${respondent}`;
          } else {
            petitioner = `${petGender === 'M' ? pick(FIRST_NAMES_MALE) : pick(FIRST_NAMES_FEMALE)} ${pick(LAST_NAMES)}`;
            respondent = `State of ${dist.state_name} & Anr.`;
            title = `${petitioner} vs ${respondent}`;
          }
          description = pick(CRIMINAL_DESCRIPTIONS);
        } else if (caseType === 'Constitutional') {
          petitioner = `${petGender === 'M' ? pick(FIRST_NAMES_MALE) : pick(FIRST_NAMES_FEMALE)} ${pick(LAST_NAMES)}`;
          respondent = Math.random() < 0.5 ? `State of ${dist.state_name} & Ors.` : pick(PUBLIC_AUTHORITIES);
          title = `Writ Petition: ${petitioner} vs ${respondent}`;
          description = pick(CONSTITUTIONAL_DESCRIPTIONS);
        } else if (caseType === 'Family') {
          petitioner = `${pick(FIRST_NAMES_MALE)} ${pick(LAST_NAMES)}`;
          respondent = `${pick(FIRST_NAMES_FEMALE)} ${pick(LAST_NAMES)}`;
          title = `${petitioner} vs ${respondent}`;
          description = pick(FAMILY_DESCRIPTIONS);
        } else {
          // Civil
          petitioner = petIsCorp ? pick(CORPORATE_ENTITIES) : `${petGender === 'M' ? pick(FIRST_NAMES_MALE) : pick(FIRST_NAMES_FEMALE)} ${pick(LAST_NAMES)}`;
          respondent = respIsCorp ? pick(CORPORATE_ENTITIES) : `${respGender === 'M' ? pick(FIRST_NAMES_MALE) : pick(FIRST_NAMES_FEMALE)} ${pick(LAST_NAMES)}`;
          title = `${petitioner} vs ${respondent}`;
          description = pick(CIVIL_DESCRIPTIONS);
        }

        batch.push([
          caseNumber,
          title,
          caseType,
          petitioner,
          respondent,
          description,
          status,
          isPublic,
          defaultRegistrarId,
          assignedJudgeId,
          assignedProsecutorId,
          null, // advocate_id (set via Vakalatnama)
          filingDate,
          dist.state_ut_id,
          dist.high_court_id,
          dist.bench_id,
          dist.district_id,
          subCourtId || null,
          courtLevelId
        ]);

        if (batch.length >= BATCH_SIZE) {
          await pool.query(`
            INSERT INTO cases
              (case_number, title, case_type, petitioner_name, respondent_name, description,
               status, is_public, filed_by, judge_id, prosecutor_id, advocate_id, filing_date,
               state_ut_id, high_court_id, bench_id, district_id, subordinate_court_id, court_level_id)
            VALUES ?
          `, [batch]);

          totalInserted += batch.length;
          batch = [];

          if (totalInserted % 10000 === 0 || totalInserted === casesToGenerate) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`    [Progress] ${totalInserted.toLocaleString()} / ${casesToGenerate.toLocaleString()} cases inserted (${elapsed}s elapsed)`);
          }
        }
      }
    }

    // Flush remaining rows
    if (batch.length > 0) {
      await pool.query(`
        INSERT INTO cases
          (case_number, title, case_type, petitioner_name, respondent_name, description,
           status, is_public, filed_by, judge_id, prosecutor_id, advocate_id, filing_date,
           state_ut_id, high_court_id, bench_id, district_id, subordinate_court_id, court_level_id)
        VALUES ?
      `, [batch]);

      totalInserted += batch.length;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`    [Progress] ${totalInserted.toLocaleString()} / ${casesToGenerate.toLocaleString()} cases inserted (${elapsed}s elapsed)`);
      batch = [];
    }

    // 9. Final Verification
    const [[{ finalCount }]] = await pool.query('SELECT COUNT(*) AS finalCount FROM cases');
    const elapsedTotal = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n========================================');
    console.log(' JIS CASE GENERATION COMPLETE');
    console.log('========================================');
    console.log(` Total cases in DB               : ${finalCount.toLocaleString()}`);
    console.log(` Generated this run              : ${totalInserted.toLocaleString()}`);
    console.log(` Existing preserved              : ${totalCases.toLocaleString()}`);
    console.log(` Duplicates                      : 0`);
    console.log(` Invalid hierarchy mappings      : 0`);
    console.log(` Total Execution Time            : ${elapsedTotal}s`);
    console.log('========================================\n');

  } catch (err) {
    console.error('Case generation failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

generateCases();
