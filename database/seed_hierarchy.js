'use strict';

require('dotenv').config();
const mysql = require('mysql2/promise');

async function seedHierarchy() {
  console.log('=== JIS: Starting Full Indian Judiciary Hierarchy Seeding ===');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jis_db',
    multipleStatements: true
  });

  try {
    // -------------------------------------------------------------
    // 1. SEED STATES & UNION TERRITORIES (36 entities)
    // -------------------------------------------------------------
    console.log('1. Seeding all 36 States & Union Territories of India...');
    const statesData = [
      ['AP', 'Andhra Pradesh', 'State'],
      ['AR', 'Arunachal Pradesh', 'State'],
      ['AS', 'Assam', 'State'],
      ['BR', 'Bihar', 'State'],
      ['CG', 'Chhattisgarh', 'State'],
      ['GA', 'Goa', 'State'],
      ['GJ', 'Gujarat', 'State'],
      ['HR', 'Haryana', 'State'],
      ['HP', 'Himachal Pradesh', 'State'],
      ['JH', 'Jharkhand', 'State'],
      ['KA', 'Karnataka', 'State'],
      ['KL', 'Kerala', 'State'],
      ['MP', 'Madhya Pradesh', 'State'],
      ['MH', 'Maharashtra', 'State'],
      ['MN', 'Manipur', 'State'],
      ['ML', 'Meghalaya', 'State'],
      ['MZ', 'Mizoram', 'State'],
      ['NL', 'Nagaland', 'State'],
      ['OD', 'Odisha', 'State'],
      ['PB', 'Punjab', 'State'],
      ['RJ', 'Rajasthan', 'State'],
      ['SK', 'Sikkim', 'State'],
      ['TN', 'Tamil Nadu', 'State'],
      ['TS', 'Telangana', 'State'],
      ['TR', 'Tripura', 'State'],
      ['UP', 'Uttar Pradesh', 'State'],
      ['UK', 'Uttarakhand', 'State'],
      ['WB', 'West Bengal', 'State'],
      ['AN', 'Andaman and Nicobar Islands', 'Union Territory'],
      ['CH', 'Chandigarh', 'Union Territory'],
      ['DH', 'Dadra & Nagar Haveli and Daman & Diu', 'Union Territory'],
      ['DL', 'Delhi (NCT)', 'Union Territory'],
      ['JK', 'Jammu and Kashmir', 'Union Territory'],
      ['LA', 'Ladakh', 'Union Territory'],
      ['LD', 'Lakshadweep', 'Union Territory'],
      ['PY', 'Puducherry', 'Union Territory']
    ];

    for (const [code, name, type] of statesData) {
      await connection.query(
        `INSERT INTO states_uts (code, name, type) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type)`,
        [code, name, type]
      );
    }
    console.log(`  -> Seeded ${statesData.length} States & Union Territories.`);

    // Map states
    const [stateRows] = await connection.query('SELECT id, code, name FROM states_uts');
    const stateMap = {};
    for (const r of stateRows) {
      stateMap[r.code] = r.id;
      stateMap[r.name] = r.id;
    }

    // -------------------------------------------------------------
    // 2. SEED 25 HIGH COURTS
    // -------------------------------------------------------------
    console.log('2. Seeding all 25 High Courts of India...');
    const highCourtsData = [
      ['HC_ALLAHABAD', 'High Court of Judicature at Allahabad', 1866, 'Prayagraj'],
      ['HC_ANDHRA', 'High Court of Andhra Pradesh', 2019, 'Amaravati'],
      ['HC_BOMBAY', 'High Court of Judicature at Bombay', 1862, 'Mumbai'],
      ['HC_CALCUTTA', 'High Court of Judicature at Calcutta', 1862, 'Kolkata'],
      ['HC_CHHATTISGARH', 'High Court of Chhattisgarh', 2000, 'Bilaspur'],
      ['HC_DELHI', 'High Court of Delhi', 1966, 'New Delhi'],
      ['HC_GAUHATI', 'Gauhati High Court', 1948, 'Guwahati'],
      ['HC_GUJARAT', 'High Court of Gujarat', 1960, 'Ahmedabad'],
      ['HC_HIMACHAL', 'High Court of Himachal Pradesh', 1971, 'Shimla'],
      ['HC_JK_LADAKH', 'High Court of Jammu & Kashmir and Ladakh', 1928, 'Srinagar'],
      ['HC_JHARKHAND', 'High Court of Jharkhand', 2000, 'Ranchi'],
      ['HC_KARNATAKA', 'High Court of Karnataka', 1884, 'Bengaluru'],
      ['HC_KERALA', 'High Court of Kerala', 1956, 'Ernakulam'],
      ['HC_MP', 'High Court of Madhya Pradesh', 1956, 'Jabalpur'],
      ['HC_MADRAS', 'High Court of Judicature at Madras', 1862, 'Chennai'],
      ['HC_MANIPUR', 'High Court of Manipur', 2013, 'Imphal'],
      ['HC_MEGHALAYA', 'High Court of Meghalaya', 2013, 'Shillong'],
      ['HC_ORISSA', 'Orissa High Court', 1948, 'Cuttack'],
      ['HC_PATNA', 'Patna High Court', 1916, 'Patna'],
      ['HC_PUNJAB_HARYANA', 'Punjab and Haryana High Court', 1966, 'Chandigarh'],
      ['HC_RAJASTHAN', 'Rajasthan High Court', 1949, 'Jodhpur'],
      ['HC_SIKKIM', 'High Court of Sikkim', 1975, 'Gangtok'],
      ['HC_TELANGANA', 'High Court for the State of Telangana', 2019, 'Hyderabad'],
      ['HC_TRIPURA', 'High Court of Tripura', 2013, 'Agartala'],
      ['HC_UTTARAKHAND', 'High Court of Uttarakhand', 2000, 'Nainital']
    ];

    for (const [code, name, estYear, seatCity] of highCourtsData) {
      await connection.query(
        `INSERT INTO high_courts (code, name, established_year, principal_seat_city) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), established_year=VALUES(established_year), principal_seat_city=VALUES(principal_seat_city)`,
        [code, name, estYear, seatCity]
      );
    }
    console.log(`  -> Seeded ${highCourtsData.length} High Courts.`);

    const [hcRows] = await connection.query('SELECT id, code, name FROM high_courts');
    const hcMap = {};
    for (const r of hcRows) {
      hcMap[r.code] = r.id;
      hcMap[r.name] = r.id;
    }

    // -------------------------------------------------------------
    // 3. SEED HIGH COURT JURISDICTIONS
    // -------------------------------------------------------------
    console.log('3. Seeding High Court Jurisdictions (Multi-State & UT Links)...');
    const hcJurisdictions = [
      ['HC_ALLAHABAD', 'UP', 1],
      ['HC_ANDHRA', 'AP', 1],
      ['HC_BOMBAY', 'MH', 1],
      ['HC_BOMBAY', 'GA', 0],
      ['HC_BOMBAY', 'DH', 0],
      ['HC_CALCUTTA', 'WB', 1],
      ['HC_CALCUTTA', 'AN', 0],
      ['HC_CHHATTISGARH', 'CG', 1],
      ['HC_DELHI', 'DL', 1],
      ['HC_GAUHATI', 'AS', 1],
      ['HC_GAUHATI', 'NL', 0],
      ['HC_GAUHATI', 'MZ', 0],
      ['HC_GAUHATI', 'AR', 0],
      ['HC_GUJARAT', 'GJ', 1],
      ['HC_HIMACHAL', 'HP', 1],
      ['HC_JK_LADAKH', 'JK', 1],
      ['HC_JK_LADAKH', 'LA', 0],
      ['HC_JHARKHAND', 'JH', 1],
      ['HC_KARNATAKA', 'KA', 1],
      ['HC_KERALA', 'KL', 1],
      ['HC_KERALA', 'LD', 0],
      ['HC_MP', 'MP', 1],
      ['HC_MADRAS', 'TN', 1],
      ['HC_MADRAS', 'PY', 0],
      ['HC_MANIPUR', 'MN', 1],
      ['HC_MEGHALAYA', 'ML', 1],
      ['HC_ORISSA', 'OD', 1],
      ['HC_PATNA', 'BR', 1],
      ['HC_PUNJAB_HARYANA', 'PB', 1],
      ['HC_PUNJAB_HARYANA', 'HR', 0],
      ['HC_PUNJAB_HARYANA', 'CH', 0],
      ['HC_RAJASTHAN', 'RJ', 1],
      ['HC_SIKKIM', 'SK', 1],
      ['HC_TELANGANA', 'TS', 1],
      ['HC_TRIPURA', 'TR', 1],
      ['HC_UTTARAKHAND', 'UK', 1]
    ];

    for (const [hcCode, stateCode, isPrimary] of hcJurisdictions) {
      const hcId = hcMap[hcCode];
      const stateId = stateMap[stateCode];
      if (hcId && stateId) {
        await connection.query(
          `INSERT INTO high_court_jurisdictions (high_court_id, state_ut_id, is_primary)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE is_primary=VALUES(is_primary)`,
          [hcId, stateId, isPrimary]
        );
      }
    }
    console.log(`  -> Seeded ${hcJurisdictions.length} High Court Jurisdictions.`);

    // -------------------------------------------------------------
    // 4. SEED HIGH COURT BENCHES (41 Benches)
    // -------------------------------------------------------------
    console.log('4. Seeding High Court Benches & Principal Seats...');
    const benchesData = [
      // Allahabad
      ['HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'Principal Seat', 'Prayagraj'],
      ['HC_ALLAHABAD', 'Lucknow Bench', 'Permanent Bench', 'Lucknow'],
      // Bombay
      ['HC_BOMBAY', 'Principal Seat at Mumbai', 'Principal Seat', 'Mumbai'],
      ['HC_BOMBAY', 'Nagpur Bench', 'Permanent Bench', 'Nagpur'],
      ['HC_BOMBAY', 'Aurangabad Bench', 'Permanent Bench', 'Chhatrapati Sambhajinagar'],
      ['HC_BOMBAY', 'Panaji Bench (Goa)', 'Permanent Bench', 'Panaji'],
      // Calcutta
      ['HC_CALCUTTA', 'Principal Seat at Kolkata', 'Principal Seat', 'Kolkata'],
      ['HC_CALCUTTA', 'Port Blair Circuit Bench', 'Circuit Bench', 'Port Blair'],
      ['HC_CALCUTTA', 'Jalpaiguri Circuit Bench', 'Circuit Bench', 'Jalpaiguri'],
      // Gauhati
      ['HC_GAUHATI', 'Principal Seat at Guwahati', 'Principal Seat', 'Guwahati'],
      ['HC_GAUHATI', 'Kohima Bench (Nagaland)', 'Permanent Bench', 'Kohima'],
      ['HC_GAUHATI', 'Aizawl Bench (Mizoram)', 'Permanent Bench', 'Aizawl'],
      ['HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'Permanent Bench', 'Itanagar'],
      // Madhya Pradesh
      ['HC_MP', 'Principal Seat at Jabalpur', 'Principal Seat', 'Jabalpur'],
      ['HC_MP', 'Gwalior Bench', 'Permanent Bench', 'Gwalior'],
      ['HC_MP', 'Indore Bench', 'Permanent Bench', 'Indore'],
      // Madras
      ['HC_MADRAS', 'Principal Seat at Chennai', 'Principal Seat', 'Chennai'],
      ['HC_MADRAS', 'Madurai Bench', 'Permanent Bench', 'Madurai'],
      // Rajasthan
      ['HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'Principal Seat', 'Jodhpur'],
      ['HC_RAJASTHAN', 'Jaipur Bench', 'Permanent Bench', 'Jaipur'],
      // Karnataka
      ['HC_KARNATAKA', 'Principal Seat at Bengaluru', 'Principal Seat', 'Bengaluru'],
      ['HC_KARNATAKA', 'Dharwad Bench', 'Permanent Bench', 'Dharwad'],
      ['HC_KARNATAKA', 'Kalaburagi Bench', 'Permanent Bench', 'Kalaburagi'],
      // J&K and Ladakh
      ['HC_JK_LADAKH', 'Principal Seat at Srinagar', 'Principal Seat', 'Srinagar'],
      ['HC_JK_LADAKH', 'Jammu Wing', 'Permanent Bench', 'Jammu'],
      // Single Bench High Courts
      ['HC_DELHI', 'Principal Seat at New Delhi', 'Principal Seat', 'New Delhi'],
      ['HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'Principal Seat', 'Chandigarh'],
      ['HC_KERALA', 'Principal Seat at Ernakulam', 'Principal Seat', 'Kochi / Ernakulam'],
      ['HC_GUJARAT', 'Principal Seat at Ahmedabad', 'Principal Seat', 'Ahmedabad'],
      ['HC_ANDHRA', 'Principal Seat at Amaravati', 'Principal Seat', 'Amaravati'],
      ['HC_TELANGANA', 'Principal Seat at Hyderabad', 'Principal Seat', 'Hyderabad'],
      ['HC_PATNA', 'Principal Seat at Patna', 'Principal Seat', 'Patna'],
      ['HC_ORISSA', 'Principal Seat at Cuttack', 'Principal Seat', 'Cuttack'],
      ['HC_JHARKHAND', 'Principal Seat at Ranchi', 'Principal Seat', 'Ranchi'],
      ['HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'Principal Seat', 'Bilaspur'],
      ['HC_HIMACHAL', 'Principal Seat at Shimla', 'Principal Seat', 'Shimla'],
      ['HC_UTTARAKHAND', 'Principal Seat at Nainital', 'Principal Seat', 'Nainital'],
      ['HC_MANIPUR', 'Principal Seat at Imphal', 'Principal Seat', 'Imphal'],
      ['HC_MEGHALAYA', 'Principal Seat at Shillong', 'Principal Seat', 'Shillong'],
      ['HC_TRIPURA', 'Principal Seat at Agartala', 'Principal Seat', 'Agartala'],
      ['HC_SIKKIM', 'Principal Seat at Gangtok', 'Principal Seat', 'Gangtok']
    ];

    for (const [hcCode, benchName, benchType, city] of benchesData) {
      const hcId = hcMap[hcCode];
      if (hcId) {
        await connection.query(
          `INSERT INTO high_court_benches (high_court_id, bench_name, bench_type, city)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE bench_type=VALUES(bench_type), city=VALUES(city)`,
          [hcId, benchName, benchType, city]
        );
      }
    }
    console.log(`  -> Seeded ${benchesData.length} High Court Benches.`);

    const [benchRows] = await connection.query('SELECT id, high_court_id, bench_name FROM high_court_benches');
    const benchMap = {};
    for (const r of benchRows) {
      benchMap[`${r.high_court_id}_${r.bench_name}`] = r.id;
    }

    const getBenchId = (hcCode, benchName) => {
      const hcId = hcMap[hcCode];
      return benchMap[`${hcId}_${benchName}`];
    };

    // -------------------------------------------------------------
    // 5. SEED ALL ALL-INDIA JUDICIAL DISTRICTS (Comprehensive Dataset)
    // -------------------------------------------------------------
    console.log('5. Seeding Complete All-India Judicial Districts...');

    const allDistricts = [
      // === 1. ALLAHABAD HIGH COURT (Uttar Pradesh - 75 districts) ===
      // Lucknow Bench (14)
      ['UP', 'HC_ALLAHABAD', 'Lucknow Bench', 'UP_LKO', 'Lucknow', 'Lucknow'],
      ['UP', 'HC_ALLAHABAD', 'Lucknow Bench', 'UP_AYO', 'Ayodhya (Faizabad)', 'Ayodhya'],
      ['UP', 'HC_ALLAHABAD', 'Lucknow Bench', 'UP_BBK', 'Barabanki', 'Barabanki'],
      ['UP', 'HC_ALLAHABAD', 'Lucknow Bench', 'UP_RBL', 'Rae Bareli', 'Rae Bareli'],
      ['UP', 'HC_ALLAHABAD', 'Lucknow Bench', 'UP_SLN', 'Sultanpur', 'Sultanpur'],
      ['UP', 'HC_ALLAHABAD', 'Lucknow Bench', 'UP_AME', 'Amethi', 'Gauriganj'],
      ['UP', 'HC_ALLAHABAD', 'Lucknow Bench', 'UP_UNA', 'Unnao', 'Unnao'],
      ['UP', 'HC_ALLAHABAD', 'Lucknow Bench', 'UP_STP', 'Sitapur', 'Sitapur'],
      ['UP', 'HC_ALLAHABAD', 'Lucknow Bench', 'UP_HRD', 'Hardoi', 'Hardoi'],
      ['UP', 'HC_ALLAHABAD', 'Lucknow Bench', 'UP_LMP', 'Lakhimpur Kheri', 'Kheri'],
      ['UP', 'HC_ALLAHABAD', 'Lucknow Bench', 'UP_BHR', 'Bahraich', 'Bahraich'],
      ['UP', 'HC_ALLAHABAD', 'Lucknow Bench', 'UP_SHR', 'Shravasti', 'Binki'],
      ['UP', 'HC_ALLAHABAD', 'Lucknow Bench', 'UP_GON', 'Gonda', 'Gonda'],
      ['UP', 'HC_ALLAHABAD', 'Lucknow Bench', 'UP_BLP', 'Balrampur', 'Balrampur'],
      // Principal Seat at Prayagraj (61)
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_PRY', 'Prayagraj (Allahabad)', 'Prayagraj'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_VNS', 'Varanasi', 'Varanasi'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_KNP', 'Kanpur Nagar', 'Kanpur'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_KND', 'Kanpur Dehat', 'Akbarpur'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_AGR', 'Agra', 'Agra'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_MRT', 'Meerut', 'Meerut'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_GBN', 'Gautam Buddha Nagar (Noida)', 'Greater Noida'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_GZB', 'Ghaziabad', 'Ghaziabad'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_HPR', 'Hapur', 'Hapur'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_BLS', 'Bulandshahr', 'Bulandshahr'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_BGP', 'Baghpat', 'Baghpat'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_MZF', 'Muzaffarnagar', 'Muzaffarnagar'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_SHM', 'Shamli', 'Shamli'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_SHR_P', 'Saharanpur', 'Saharanpur'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_MBD', 'Moradabad', 'Moradabad'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_BJN', 'Bijnor', 'Bijnor'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_RMP', 'Rampur', 'Rampur'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_AMR', 'Amroha', 'Amroha'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_SMB', 'Sambhal', 'Bahjoi'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_BLY', 'Bareilly', 'Bareilly'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_BDN', 'Badaun', 'Badaun'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_PLB', 'Pilibhit', 'Pilibhit'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_SPN', 'Shahjahanpur', 'Shahjahanpur'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_GKP', 'Gorakhpur', 'Gorakhpur'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_MHG', 'Maharajganj', 'Maharajganj'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_DEO', 'Deoria', 'Deoria'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_KUS', 'Kushinagar', 'Padrauna'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_BST', 'Basti', 'Basti'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_SDN', 'Siddharthnagar', 'Navgarh'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_SKN', 'Sant Kabir Nagar', 'Khalilabad'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_AZM', 'Azamgarh', 'Azamgarh'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_MAU', 'Mau', 'Mau'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_BAL', 'Ballia', 'Ballia'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_JNP', 'Jaunpur', 'Jaunpur'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_GZP', 'Ghazipur', 'Ghazipur'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_CND', 'Chandauli', 'Chandauli'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_MZP', 'Mirzapur', 'Mirzapur'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_SNB', 'Sonbhadra', 'Robertsganj'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_BHD', 'Bhadohi', 'Gyanpur'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_JHN', 'Jhansi', 'Jhansi'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_LLT', 'Lalitpur', 'Lalitpur'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_JLN', 'Jalaun', 'Orai'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_BND', 'Banda', 'Banda'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_CKT', 'Chitrakoot', 'Karwi'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_HMR', 'Hamirpur', 'Hamirpur'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_MHB', 'Mahoba', 'Mahoba'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_FTP', 'Fatehpur', 'Fatehpur'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_KSB', 'Kaushambi', 'Manjhanpur'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_PBH', 'Pratapgarh', 'Pratapgarh'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_MNP', 'Mainpuri', 'Mainpuri'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_FRZ', 'Firozabad', 'Firozabad'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_ETH', 'Etah', 'Etah'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_KSG', 'Kasganj', 'Kasganj'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_HTR', 'Hathras', 'Hathras'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_ALG', 'Aligarh', 'Aligarh'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_MTR', 'Mathura', 'Mathura'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_FRK', 'Farrukhabad', 'Fatehgarh'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_KNJ', 'Kannauj', 'Kannauj'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_ETW', 'Etawah', 'Etawah'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_ARY', 'Auraiya', 'Auraiya'],
      ['UP', 'HC_ALLAHABAD', 'Principal Seat at Prayagraj', 'UP_ABN', 'Ambedkar Nagar', 'Akbarpur'],

      // === 2. BOMBAY HIGH COURT (Maharashtra, Goa, Dadra & Nagar Haveli and Daman & Diu - 41 districts) ===
      // Principal Seat at Mumbai (12 MH)
      ['MH', 'HC_BOMBAY', 'Principal Seat at Mumbai', 'MH_MUM', 'Mumbai City', 'Mumbai'],
      ['MH', 'HC_BOMBAY', 'Principal Seat at Mumbai', 'MH_MSU', 'Mumbai Suburban', 'Bandra'],
      ['MH', 'HC_BOMBAY', 'Principal Seat at Mumbai', 'MH_THN', 'Thane', 'Thane'],
      ['MH', 'HC_BOMBAY', 'Principal Seat at Mumbai', 'MH_PLG', 'Palghar', 'Palghar'],
      ['MH', 'HC_BOMBAY', 'Principal Seat at Mumbai', 'MH_RGD', 'Raigad', 'Alibag'],
      ['MH', 'HC_BOMBAY', 'Principal Seat at Mumbai', 'MH_RTG', 'Ratnagiri', 'Ratnagiri'],
      ['MH', 'HC_BOMBAY', 'Principal Seat at Mumbai', 'MH_SND', 'Sindhudurg', 'Oros'],
      ['MH', 'HC_BOMBAY', 'Principal Seat at Mumbai', 'MH_PUN', 'Pune', 'Pune'],
      ['MH', 'HC_BOMBAY', 'Principal Seat at Mumbai', 'MH_SAT', 'Satara', 'Satara'],
      ['MH', 'HC_BOMBAY', 'Principal Seat at Mumbai', 'MH_SAN', 'Sangli', 'Sangli'],
      ['MH', 'HC_BOMBAY', 'Principal Seat at Mumbai', 'MH_KOL', 'Kolhapur', 'Kolhapur'],
      ['MH', 'HC_BOMBAY', 'Principal Seat at Mumbai', 'MH_SOL', 'Solapur', 'Solapur'],
      // Nagpur Bench (11 MH)
      ['MH', 'HC_BOMBAY', 'Nagpur Bench', 'MH_NGP', 'Nagpur', 'Nagpur'],
      ['MH', 'HC_BOMBAY', 'Nagpur Bench', 'MH_AMR', 'Amravati', 'Amravati'],
      ['MH', 'HC_BOMBAY', 'Nagpur Bench', 'MH_AKL', 'Akola', 'Akola'],
      ['MH', 'HC_BOMBAY', 'Nagpur Bench', 'MH_BHD', 'Bhandara', 'Bhandara'],
      ['MH', 'HC_BOMBAY', 'Nagpur Bench', 'MH_BLD', 'Buldhana', 'Buldhana'],
      ['MH', 'HC_BOMBAY', 'Nagpur Bench', 'MH_CND', 'Chandrapur', 'Chandrapur'],
      ['MH', 'HC_BOMBAY', 'Nagpur Bench', 'MH_GDC', 'Gadchiroli', 'Gadchiroli'],
      ['MH', 'HC_BOMBAY', 'Nagpur Bench', 'MH_GND', 'Gondia', 'Gondia'],
      ['MH', 'HC_BOMBAY', 'Nagpur Bench', 'MH_WRD', 'Wardha', 'Wardha'],
      ['MH', 'HC_BOMBAY', 'Nagpur Bench', 'MH_WSM', 'Washim', 'Washim'],
      ['MH', 'HC_BOMBAY', 'Nagpur Bench', 'MH_YVT', 'Yavatmal', 'Yavatmal'],
      // Aurangabad Bench (13 MH)
      ['MH', 'HC_BOMBAY', 'Aurangabad Bench', 'MH_CSN', 'Chhatrapati Sambhajinagar (Aurangabad)', 'Aurangabad'],
      ['MH', 'HC_BOMBAY', 'Aurangabad Bench', 'MH_AHM', 'Ahmednagar (Ahilyanagar)', 'Ahmednagar'],
      ['MH', 'HC_BOMBAY', 'Aurangabad Bench', 'MH_BED', 'Beed', 'Beed'],
      ['MH', 'HC_BOMBAY', 'Aurangabad Bench', 'MH_JLN', 'Jalna', 'Jalna'],
      ['MH', 'HC_BOMBAY', 'Aurangabad Bench', 'MH_LAT', 'Latur', 'Latur'],
      ['MH', 'HC_BOMBAY', 'Aurangabad Bench', 'MH_NAN', 'Nanded', 'Nanded'],
      ['MH', 'HC_BOMBAY', 'Aurangabad Bench', 'MH_DHR', 'Dharashiv (Osmanabad)', 'Osmanabad'],
      ['MH', 'HC_BOMBAY', 'Aurangabad Bench', 'MH_PBN', 'Parbhani', 'Parbhani'],
      ['MH', 'HC_BOMBAY', 'Aurangabad Bench', 'MH_HNG', 'Hingoli', 'Hingoli'],
      ['MH', 'HC_BOMBAY', 'Aurangabad Bench', 'MH_JLG', 'Jalgaon', 'Jalgaon'],
      ['MH', 'HC_BOMBAY', 'Aurangabad Bench', 'MH_DHL', 'Dhule', 'Dhule'],
      ['MH', 'HC_BOMBAY', 'Aurangabad Bench', 'MH_NDB', 'Nandurbar', 'Nandurbar'],
      ['MH', 'HC_BOMBAY', 'Aurangabad Bench', 'MH_NSK', 'Nashik', 'Nashik'],
      // Panaji Bench (Goa - 2)
      ['GA', 'HC_BOMBAY', 'Panaji Bench (Goa)', 'GA_NG', 'North Goa', 'Panaji'],
      ['GA', 'HC_BOMBAY', 'Panaji Bench (Goa)', 'GA_SG', 'South Goa', 'Margao'],
      // Dadra & Nagar Haveli and Daman & Diu (3)
      ['DH', 'HC_BOMBAY', 'Principal Seat at Mumbai', 'DH_DNH', 'Dadra and Nagar Haveli', 'Silvassa'],
      ['DH', 'HC_BOMBAY', 'Principal Seat at Mumbai', 'DH_DAM', 'Daman', 'Daman'],
      ['DH', 'HC_BOMBAY', 'Principal Seat at Mumbai', 'DH_DIU', 'Diu', 'Diu'],

      // === 3. CALCUTTA HIGH COURT (West Bengal & Andaman Nicobar - 26 districts) ===
      // Principal Seat at Kolkata (18 WB)
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_KOL', 'Kolkata', 'Kolkata'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_HWR', 'Howrah', 'Howrah'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_HGL', 'Hooghly', 'Chinsurah'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_NPG', 'North 24 Parganas', 'Barasat'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_SPG', 'South 24 Parganas', 'Alipore'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_NAD', 'Nadia', 'Krishnanagar'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_MSD', 'Murshidabad', 'Baharampur'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_PBD', 'Purba Bardhaman', 'Bardhaman'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_WBD', 'Paschim Bardhaman', 'Asansol'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_BRB', 'Birbhum', 'Suri'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_BNK', 'Bankura', 'Bankura'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_PRL', 'Purulia', 'Purulia'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_EPM', 'Purba Medinipur', 'Tamluk'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_WPM', 'Paschim Medinipur', 'Midnapore'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_JHG', 'Jhargram', 'Jhargram'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_MLD', 'Malda', 'English Bazar'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_UDJ', 'Uttar Dinajpur', 'Raiganj'],
      ['WB', 'HC_CALCUTTA', 'Principal Seat at Kolkata', 'WB_DDJ', 'Dakshin Dinajpur', 'Balurghat'],
      // Jalpaiguri Circuit Bench (5 WB)
      ['WB', 'HC_CALCUTTA', 'Jalpaiguri Circuit Bench', 'WB_JPG', 'Jalpaiguri', 'Jalpaiguri'],
      ['WB', 'HC_CALCUTTA', 'Jalpaiguri Circuit Bench', 'WB_DJG', 'Darjeeling', 'Darjeeling'],
      ['WB', 'HC_CALCUTTA', 'Jalpaiguri Circuit Bench', 'WB_KLP', 'Kalimpong', 'Kalimpong'],
      ['WB', 'HC_CALCUTTA', 'Jalpaiguri Circuit Bench', 'WB_CBR', 'Cooch Behar', 'Cooch Behar'],
      ['WB', 'HC_CALCUTTA', 'Jalpaiguri Circuit Bench', 'WB_APD', 'Alipurduar', 'Alipurduar'],
      // Port Blair Circuit Bench (Andaman & Nicobar - 3)
      ['AN', 'HC_CALCUTTA', 'Port Blair Circuit Bench', 'AN_SA', 'South Andaman', 'Port Blair'],
      ['AN', 'HC_CALCUTTA', 'Port Blair Circuit Bench', 'AN_NMA', 'North and Middle Andaman', 'Mayabunder'],
      ['AN', 'HC_CALCUTTA', 'Port Blair Circuit Bench', 'AN_NIC', 'Nicobar', 'Car Nicobar'],

      // === 4. GAUHATI HIGH COURT (Assam, Nagaland, Mizoram, Arunachal Pradesh - 88 districts) ===
      // Assam (35)
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_KMM', 'Kamrup Metropolitan', 'Guwahati'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_KMR', 'Kamrup Rural', 'Amingaon'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_NGN', 'Nagaon', 'Nagaon'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_SON', 'Sonitpur', 'Tezpur'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_CAC', 'Cachar', 'Silchar'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_DIB', 'Dibrugarh', 'Dibrugarh'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_JOR', 'Jorhat', 'Jorhat'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_TIN', 'Tinsukia', 'Tinsukia'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_BAR', 'Barpeta', 'Barpeta'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_DHU', 'Dhubri', 'Dhubri'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_GOA', 'Goalpara', 'Goalpara'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_BNG', 'Bongaigaon', 'Bongaigaon'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_DAR', 'Darrang', 'Mangaldai'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_MOR', 'Morigaon', 'Morigaon'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_SIV', 'Sivasagar', 'Sivasagar'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_KRM', 'Karimganj', 'Karimganj'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_HLK', 'Hailakandi', 'Hailakandi'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_GLG', 'Golaghat', 'Golaghat'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_LAK', 'Lakhimpur', 'North Lakhimpur'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_DHM', 'Dhemaji', 'Dhemaji'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_NLB', 'Nalbari', 'Nalbari'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_BAK', 'Baksa', 'Musalpur'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_CHG', 'Chirang', 'Kajalgaon'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_KKR', 'Kokrajhar', 'Kokrajhar'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_UDG', 'Udalguri', 'Udalguri'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_KBA', 'Karbi Anglong', 'Diphu'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_WKA', 'West Karbi Anglong', 'Hamren'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_DMH', 'Dima Hasao', 'Haflong'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_HOJ', 'Hojai', 'Sankardev Nagar'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_BSW', 'Biswanath', 'Biswanath Chariali'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_CRD', 'Charaideo', 'Sonari'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_SSM', 'South Salmara-Mankachar', 'Hatsingimari'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_MAJ', 'Majuli', 'Garamur'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_BJL', 'Bajali', 'Pathsala'],
      ['AS', 'HC_GAUHATI', 'Principal Seat at Guwahati', 'AS_TML', 'Tamulpur', 'Tamulpur'],
      // Nagaland (16)
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_KOH', 'Kohima', 'Kohima'],
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_DMP', 'Dimapur', 'Dimapur'],
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_MKG', 'Mokokchung', 'Mokokchung'],
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_MON', 'Mon', 'Mon'],
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_PHK', 'Phek', 'Phek'],
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_TSG', 'Tuensang', 'Tuensang'],
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_WOK', 'Wokha', 'Wokha'],
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_ZHB', 'Zunheboto', 'Zunheboto'],
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_KPH', 'Kiphire', 'Kiphire'],
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_LLG', 'Longleng', 'Longleng'],
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_PRN', 'Peren', 'Peren'],
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_NKL', 'Noklak', 'Noklak'],
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_CMD', 'Chumoukedima', 'Chumoukedima'],
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_NLD', 'Niuland', 'Niuland'],
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_TSM', 'Tseminyu', 'Tseminyu'],
      ['NL', 'HC_GAUHATI', 'Kohima Bench (Nagaland)', 'NL_SHM', 'Shamator', 'Shamator'],
      // Mizoram (11)
      ['MZ', 'HC_GAUHATI', 'Aizawl Bench (Mizoram)', 'MZ_AIZ', 'Aizawl', 'Aizawl'],
      ['MZ', 'HC_GAUHATI', 'Aizawl Bench (Mizoram)', 'MZ_LNG', 'Lunglei', 'Lunglei'],
      ['MZ', 'HC_GAUHATI', 'Aizawl Bench (Mizoram)', 'MZ_CMP', 'Champhai', 'Champhai'],
      ['MZ', 'HC_GAUHATI', 'Aizawl Bench (Mizoram)', 'MZ_KLB', 'Kolasib', 'Kolasib'],
      ['MZ', 'HC_GAUHATI', 'Aizawl Bench (Mizoram)', 'MZ_MMT', 'Mamit', 'Mamit'],
      ['MZ', 'HC_GAUHATI', 'Aizawl Bench (Mizoram)', 'MZ_SRC', 'Serchhip', 'Serchhip'],
      ['MZ', 'HC_GAUHATI', 'Aizawl Bench (Mizoram)', 'MZ_LTL', 'Lawngtlai', 'Lawngtlai'],
      ['MZ', 'HC_GAUHATI', 'Aizawl Bench (Mizoram)', 'MZ_SIH', 'Saiha', 'Saiha'],
      ['MZ', 'HC_GAUHATI', 'Aizawl Bench (Mizoram)', 'MZ_HNT', 'Hnahthial', 'Hnahthial'],
      ['MZ', 'HC_GAUHATI', 'Aizawl Bench (Mizoram)', 'MZ_KWZ', 'Khawzawl', 'Khawzawl'],
      ['MZ', 'HC_GAUHATI', 'Aizawl Bench (Mizoram)', 'MZ_STU', 'Saitual', 'Saitual'],
      // Arunachal Pradesh (26)
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_PPR', 'Papum Pare', 'Yupia'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_ITA', 'Capital Complex Itanagar', 'Itanagar'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_CNG', 'Changlang', 'Changlang'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_DBV', 'Dibang Valley', 'Anini'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_EKM', 'East Kameng', 'Seppa'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_ESG', 'East Siang', 'Pasighat'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_KML', 'Kamle', 'Raga'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_KDD', 'Kra Daadi', 'Jamin'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_KKM', 'Kurung Kumey', 'Koloriang'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_LPR', 'Leparada', 'Basar'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_LHT', 'Lohit', 'Tezu'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_LDG', 'Longding', 'Longding'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_LDV', 'Lower Dibang Valley', 'Roing'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_LSG', 'Lower Siang', 'Likabali'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_LSS', 'Lower Subansiri', 'Ziro'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_NMS', 'Namsai', 'Namsai'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_PKK', 'Pakke Kessang', 'Lemmi'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_SHY', 'Shi Yomi', 'Tato'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_SIA', 'Siang', 'Pangin'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_TWG', 'Tawang', 'Tawang'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_TRP', 'Tirap', 'Khonsa'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_USG', 'Upper Siang', 'Yingkiong'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_USS', 'Upper Subansiri', 'Daporijo'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_WKM', 'West Kameng', 'Bomdila'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_WSG', 'West Siang', 'Aalo'],
      ['AR', 'HC_GAUHATI', 'Itanagar Bench (Arunachal Pradesh)', 'AR_KYP', 'Keyi Panyor', 'Yachuli'],

      // === 5. RAJASTHAN HIGH COURT (Rajasthan - 50 districts) ===
      // Jodhpur Principal Seat (24)
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_JDH', 'Jodhpur', 'Jodhpur'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_JDR', 'Jodhpur Rural', 'Jodhpur'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_BKN', 'Bikaner', 'Bikaner'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_JSM', 'Jaisalmer', 'Jaisalmer'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_BAR', 'Barmer', 'Barmer'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_BLT', 'Balotra', 'Balotra'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_PAL', 'Pali', 'Pali'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_SIR', 'Sirohi', 'Sirohi'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_JAL', 'Jalore', 'Jalore'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_SNC', 'Sanchore', 'Sanchore'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_NAG', 'Nagaur', 'Nagaur'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_DDK', 'Didwana-Kuchaman', 'Didwana'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_UDP', 'Udaipur', 'Udaipur'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_SLM', 'Salumber', 'Salumber'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_RSM', 'Rajsamand', 'Rajsamand'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_CTG', 'Chittorgarh', 'Chittorgarh'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_BSW', 'Banswara', 'Banswara'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_DNG', 'Dungarpur', 'Dungarpur'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_PRT', 'Pratapgarh', 'Pratapgarh'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_SGN', 'Sri Ganganagar', 'Sri Ganganagar'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_ANP', 'Anupgarh', 'Anupgarh'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_HNM', 'Hanumangarh', 'Hanumangarh'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_CHU', 'Churu', 'Churu'],
      ['RJ', 'HC_RAJASTHAN', 'Principal Seat at Jodhpur', 'RJ_PHL', 'Phalodi', 'Phalodi'],
      // Jaipur Bench (26)
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_JPR', 'Jaipur', 'Jaipur'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_JPR_R', 'Jaipur Rural', 'Jaipur'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_DUD', 'Dudu', 'Dudu'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_KOT_B', 'Kotputli-Behror', 'Kotputli'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_AJM', 'Ajmer', 'Ajmer'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_BEA', 'Beawar', 'Beawar'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_KKR', 'Kekri', 'Kekri'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_ALW', 'Alwar', 'Alwar'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_KRT', 'Khairthal-Tijara', 'Tijara'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_BHR', 'Bharatpur', 'Bharatpur'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_DEG', 'Deeg', 'Deeg'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_BHL', 'Bhilwara', 'Bhilwara'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_SHP', 'Shahpura', 'Shahpura'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_BUN', 'Bundi', 'Bundi'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_DAU', 'Dausa', 'Dausa'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_DHL', 'Dholpur', 'Dholpur'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_JHJ', 'Jhunjhunu', 'Jhunjhunu'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_NMK', 'Neem Ka Thana', 'Neem Ka Thana'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_KRL', 'Karauli', 'Karauli'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_GPC', 'Gangapur City', 'Gangapur City'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_KOT', 'Kota', 'Kota'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_SWM', 'Sawai Madhopur', 'Sawai Madhopur'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_SKR', 'Sikar', 'Sikar'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_TNK', 'Tonk', 'Tonk'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_BRN', 'Baran', 'Baran'],
      ['RJ', 'HC_RAJASTHAN', 'Jaipur Bench', 'RJ_JHL', 'Jhalawar', 'Jhalawar'],

      // === 6. MADHYA PRADESH HIGH COURT (Madhya Pradesh - 55 districts) ===
      // Jabalpur Principal Seat (32)
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_JBL', 'Jabalpur', 'Jabalpur'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_BPL', 'Bhopal', 'Bhopal'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_SEH', 'Sehore', 'Sehore'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_RSN', 'Raisen', 'Raisen'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_RJG', 'Rajgarh', 'Rajgarh'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_VDS', 'Vidisha', 'Vidisha'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_KTN', 'Katni', 'Katni'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_NSP', 'Narsinghpur', 'Narsinghpur'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_MDL', 'Mandla', 'Mandla'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_DND', 'Dindori', 'Dindori'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_SEI', 'Seoni', 'Seoni'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_CDW', 'Chhindwara', 'Chhindwara'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_PDH', 'Pandhurna', 'Pandhurna'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_BLG', 'Balaghat', 'Balaghat'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_REW', 'Rewa', 'Rewa'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_MGJ', 'Mauganj', 'Mauganj'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_STN', 'Satna', 'Satna'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_MHR', 'Maihar', 'Maihar'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_SDH', 'Sidhi', 'Sidhi'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_SGL', 'Singrauli', 'Waidhan'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_SHD', 'Shahdol', 'Shahdol'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_UMR', 'Umaria', 'Umaria'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_ANP', 'Anuppur', 'Anuppur'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_SGR', 'Sagar', 'Sagar'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_DMH', 'Damoh', 'Damoh'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_PNN', 'Panna', 'Panna'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_CHT', 'Chhatarpur', 'Chhatarpur'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_TKM', 'Tikamgarh', 'Tikamgarh'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_NWR', 'Niwari', 'Niwari'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_HSH', 'Narmadapuram (Hoshangabad)', 'Hoshangabad'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_HRD', 'Harda', 'Harda'],
      ['MP', 'HC_MP', 'Principal Seat at Jabalpur', 'MP_BTL', 'Betul', 'Betul'],
      // Gwalior Bench (8)
      ['MP', 'HC_MP', 'Gwalior Bench', 'MP_GWL', 'Gwalior', 'Gwalior'],
      ['MP', 'HC_MP', 'Gwalior Bench', 'MP_MRN', 'Morena', 'Morena'],
      ['MP', 'HC_MP', 'Gwalior Bench', 'MP_BHD', 'Bhind', 'Bhind'],
      ['MP', 'HC_MP', 'Gwalior Bench', 'MP_SHP', 'Sheopur', 'Sheopur'],
      ['MP', 'HC_MP', 'Gwalior Bench', 'MP_SVP', 'Shivpuri', 'Shivpuri'],
      ['MP', 'HC_MP', 'Gwalior Bench', 'MP_GNA', 'Guna', 'Guna'],
      ['MP', 'HC_MP', 'Gwalior Bench', 'MP_ASK', 'Ashoknagar', 'Ashoknagar'],
      ['MP', 'HC_MP', 'Gwalior Bench', 'MP_DTA', 'Datia', 'Datia'],
      // Indore Bench (15)
      ['MP', 'HC_MP', 'Indore Bench', 'MP_IND', 'Indore', 'Indore'],
      ['MP', 'HC_MP', 'Indore Bench', 'MP_UJN', 'Ujjain', 'Ujjain'],
      ['MP', 'HC_MP', 'Indore Bench', 'MP_DWS', 'Dewas', 'Dewas'],
      ['MP', 'HC_MP', 'Indore Bench', 'MP_DHR', 'Dhar', 'Dhar'],
      ['MP', 'HC_MP', 'Indore Bench', 'MP_JHB', 'Jhabua', 'Jhabua'],
      ['MP', 'HC_MP', 'Indore Bench', 'MP_ALR', 'Alirajpur', 'Alirajpur'],
      ['MP', 'HC_MP', 'Indore Bench', 'MP_KRG', 'Khargone (West Nimar)', 'Khargone'],
      ['MP', 'HC_MP', 'Indore Bench', 'MP_BRW', 'Barwani', 'Barwani'],
      ['MP', 'HC_MP', 'Indore Bench', 'MP_KND', 'Khandwa (East Nimar)', 'Khandwa'],
      ['MP', 'HC_MP', 'Indore Bench', 'MP_BHP', 'Burhanpur', 'Burhanpur'],
      ['MP', 'HC_MP', 'Indore Bench', 'MP_RTL', 'Ratlam', 'Ratlam'],
      ['MP', 'HC_MP', 'Indore Bench', 'MP_MND', 'Mandsaur', 'Mandsaur'],
      ['MP', 'HC_MP', 'Indore Bench', 'MP_NMC', 'Neemuch', 'Neemuch'],
      ['MP', 'HC_MP', 'Indore Bench', 'MP_SJP', 'Shajapur', 'Shajapur'],
      ['MP', 'HC_MP', 'Indore Bench', 'MP_AGM', 'Agar Malwa', 'Agar'],

      // === 7. MADRAS HIGH COURT (Tamil Nadu & Puducherry - 42 districts) ===
      // Principal Seat at Chennai (25 TN + 4 PY)
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_CHN', 'Chennai', 'Chennai'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_CGP', 'Chengalpattu', 'Chengalpattu'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_KNC', 'Kanchipuram', 'Kanchipuram'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_TVL', 'Tiruvallur', 'Tiruvallur'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_VEL', 'Vellore', 'Vellore'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_RNP', 'Ranipet', 'Ranipet'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_TPR', 'Tirupathur', 'Tirupathur'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_TVM', 'Tiruvannamalai', 'Tiruvannamalai'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_VLP', 'Viluppuram', 'Viluppuram'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_KLK', 'Kallakurichi', 'Kallakurichi'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_CDL', 'Cuddalore', 'Cuddalore'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_DHM', 'Dharmapuri', 'Dharmapuri'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_KRG', 'Krishnagiri', 'Krishnagiri'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_SLM', 'Salem', 'Salem'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_NMK', 'Namakkal', 'Namakkal'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_ERD', 'Erode', 'Erode'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_TPU', 'Tiruppur', 'Tiruppur'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_CBE', 'Coimbatore', 'Coimbatore'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_NLG', 'Nilgiris', 'Udhagamandalam'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_ARL', 'Ariyalur', 'Ariyalur'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_PRB', 'Perambalur', 'Perambalur'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_TRZ', 'Tiruchirappalli', 'Tiruchirappalli'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_KRR', 'Karur', 'Karur'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_TNJ', 'Thanjavur', 'Thanjavur'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_TVR', 'Tiruvarur', 'Tiruvarur'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_NGP', 'Nagapattinam', 'Nagapattinam'],
      ['TN', 'HC_MADRAS', 'Principal Seat at Chennai', 'TN_MYL', 'Mayiladuthurai', 'Mayiladuthurai'],
      ['PY', 'HC_MADRAS', 'Principal Seat at Chennai', 'PY_PDY', 'Puducherry', 'Puducherry'],
      ['PY', 'HC_MADRAS', 'Principal Seat at Chennai', 'PY_KRK', 'Karaikal', 'Karaikal'],
      ['PY', 'HC_MADRAS', 'Principal Seat at Chennai', 'PY_MAH', 'Mahe', 'Mahe'],
      ['PY', 'HC_MADRAS', 'Principal Seat at Chennai', 'PY_YAN', 'Yanam', 'Yanam'],
      // Madurai Bench (11 TN)
      ['TN', 'HC_MADRAS', 'Madurai Bench', 'TN_MDU', 'Madurai', 'Madurai'],
      ['TN', 'HC_MADRAS', 'Madurai Bench', 'TN_DGL', 'Dindigul', 'Dindigul'],
      ['TN', 'HC_MADRAS', 'Madurai Bench', 'TN_THN', 'Theni', 'Theni'],
      ['TN', 'HC_MADRAS', 'Madurai Bench', 'TN_RMD', 'Ramanathapuram', 'Ramanathapuram'],
      ['TN', 'HC_MADRAS', 'Madurai Bench', 'TN_SVG', 'Sivaganga', 'Sivaganga'],
      ['TN', 'HC_MADRAS', 'Madurai Bench', 'TN_VRD', 'Virudhunagar', 'Virudhunagar'],
      ['TN', 'HC_MADRAS', 'Madurai Bench', 'TN_TNV', 'Tirunelveli', 'Tirunelveli'],
      ['TN', 'HC_MADRAS', 'Madurai Bench', 'TN_TKS', 'Tenkasi', 'Tenkasi'],
      ['TN', 'HC_MADRAS', 'Madurai Bench', 'TN_TUT', 'Thoothukudi (Tuticorin)', 'Thoothukudi'],
      ['TN', 'HC_MADRAS', 'Madurai Bench', 'TN_KKI', 'Kanniyakumari', 'Nagercoil'],
      ['TN', 'HC_MADRAS', 'Madurai Bench', 'TN_PDK', 'Pudukkottai', 'Pudukkottai'],

      // === 8. KARNATAKA HIGH COURT (Karnataka - 31 districts) ===
      // Principal Seat at Bengaluru (17)
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_BLR', 'Bengaluru Urban', 'Bengaluru'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_BLR_R', 'Bengaluru Rural', 'Bengaluru'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_RMG', 'Ramanagara', 'Ramanagara'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_CKB', 'Chikkaballapura', 'Chikkaballapura'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_KLR', 'Kolar', 'Kolar'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_TMK', 'Tumakuru', 'Tumakuru'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_MYS', 'Mysuru', 'Mysuru'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_MDY', 'Mandya', 'Mandya'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_HSN', 'Hassan', 'Hassan'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_CMR', 'Chamarajanagar', 'Chamarajanagar'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_KDG', 'Kodagu (Madikeri)', 'Madikeri'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_MNG', 'Dakshina Kannada (Mangaluru)', 'Mangaluru'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_UDP', 'Udupi', 'Udupi'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_CKM', 'Chikkamagaluru', 'Chikkamagaluru'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_SMG', 'Shivamogga', 'Shivamogga'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_DVG', 'Davanagere', 'Davanagere'],
      ['KA', 'HC_KARNATAKA', 'Principal Seat at Bengaluru', 'KA_CTA', 'Chitradurga', 'Chitradurga'],
      // Dharwad Bench (9)
      ['KA', 'HC_KARNATAKA', 'Dharwad Bench', 'KA_DHW', 'Dharwad (Hubballi-Dharwad)', 'Dharwad'],
      ['KA', 'HC_KARNATAKA', 'Dharwad Bench', 'KA_BLG', 'Belagavi', 'Belagavi'],
      ['KA', 'HC_KARNATAKA', 'Dharwad Bench', 'KA_BGK', 'Bagalkote', 'Bagalkote'],
      ['KA', 'HC_KARNATAKA', 'Dharwad Bench', 'KA_VJP', 'Vijayapura (Bijapur)', 'Vijayapura'],
      ['KA', 'HC_KARNATAKA', 'Dharwad Bench', 'KA_GDG', 'Gadag', 'Gadag'],
      ['KA', 'HC_KARNATAKA', 'Dharwad Bench', 'KA_HVR', 'Haveri', 'Haveri'],
      ['KA', 'HC_KARNATAKA', 'Dharwad Bench', 'KA_UKN', 'Uttara Kannada (Karwar)', 'Karwar'],
      ['KA', 'HC_KARNATAKA', 'Dharwad Bench', 'KA_BLR_D', 'Ballari', 'Ballari'],
      ['KA', 'HC_KARNATAKA', 'Dharwad Bench', 'KA_VJN', 'Vijayanagara', 'Hosapete'],
      // Kalaburagi Bench (5)
      ['KA', 'HC_KARNATAKA', 'Kalaburagi Bench', 'KA_KLB', 'Kalaburagi (Gulbarga)', 'Kalaburagi'],
      ['KA', 'HC_KARNATAKA', 'Kalaburagi Bench', 'KA_BDR', 'Bidar', 'Bidar'],
      ['KA', 'HC_KARNATAKA', 'Kalaburagi Bench', 'KA_RCR', 'Raichur', 'Raichur'],
      ['KA', 'HC_KARNATAKA', 'Kalaburagi Bench', 'KA_KPL', 'Koppal', 'Koppal'],
      ['KA', 'HC_KARNATAKA', 'Kalaburagi Bench', 'KA_YDG', 'Yadgir', 'Yadgir'],

      // === 9. PUNJAB & HARYANA HIGH COURT (Punjab, Haryana, Chandigarh - 46 districts) ===
      // Punjab (23)
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_ASR', 'Amritsar', 'Amritsar'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_BNL', 'Barnala', 'Barnala'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_BTI', 'Bathinda', 'Bathinda'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_FDK', 'Faridkot', 'Faridkot'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_FGS', 'Fatehgarh Sahib', 'Fatehgarh Sahib'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_FZK', 'Fazilka', 'Fazilka'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_FZR', 'Ferozepur', 'Ferozepur'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_GDP', 'Gurdaspur', 'Gurdaspur'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_HSP', 'Hoshiarpur', 'Hoshiarpur'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_JAL', 'Jalandhar', 'Jalandhar'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_KPT', 'Kapurthala', 'Kapurthala'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_LDH', 'Ludhiana', 'Ludhiana'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_MLK', 'Malerkotla', 'Malerkotla'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_MNS', 'Mansa', 'Mansa'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_MOG', 'Moga', 'Moga'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_PTK', 'Pathankot', 'Pathankot'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_PTL', 'Patiala', 'Patiala'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_RPN', 'Rupnagar (Ropar)', 'Rupnagar'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_SAS', 'Sahibzada Ajit Singh Nagar (Mohali)', 'Mohali'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_SGR', 'Sangrur', 'Sangrur'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_SBS', 'Shahid Bhagat Singh Nagar', 'Nawanshahr'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_SMS', 'Sri Muktsar Sahib', 'Muktsar'],
      ['PB', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'PB_TTN', 'Tarn Taran', 'Tarn Taran'],
      // Haryana (22)
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_AMB', 'Ambala', 'Ambala'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_BHW', 'Bhiwani', 'Bhiwani'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_CKD', 'Charkhi Dadri', 'Charkhi Dadri'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_FBD', 'Faridabad', 'Faridabad'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_FTB', 'Fatehabad', 'Fatehabad'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_GGN', 'Gurugram (Gurgaon)', 'Gurugram'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_HSR', 'Hisar', 'Hisar'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_JHJ', 'Jhajjar', 'Jhajjar'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_JND', 'Jind', 'Jind'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_KTH', 'Kaithal', 'Kaithal'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_KRN', 'Karnal', 'Karnal'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_KRK', 'Kurukshetra', 'Kurukshetra'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_MHN', 'Mahendragarh', 'Narnaul'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_NUH', 'Nuh (Mewat)', 'Nuh'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_PLW', 'Palwal', 'Palwal'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_PKL', 'Panchkula', 'Panchkula'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_PNP', 'Panipat', 'Panipat'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_REW', 'Rewari', 'Rewari'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_RTK', 'Rohtak', 'Rohtak'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_SRS', 'Sirsa', 'Sirsa'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_SNP', 'Sonipat', 'Sonipat'],
      ['HR', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'HR_YMN', 'Yamunanagar', 'Yamunanagar'],
      // Chandigarh (1)
      ['CH', 'HC_PUNJAB_HARYANA', 'Principal Seat at Chandigarh', 'CH_CHD', 'Chandigarh District', 'Chandigarh'],

      // === 10. DELHI HIGH COURT (Delhi NCT - 11 districts) ===
      ['DL', 'HC_DELHI', 'Principal Seat at New Delhi', 'DL_ND', 'New Delhi', 'Patiala House'],
      ['DL', 'HC_DELHI', 'Principal Seat at New Delhi', 'DL_CD', 'Central Delhi', 'Tis Hazari'],
      ['DL', 'HC_DELHI', 'Principal Seat at New Delhi', 'DL_WD', 'West Delhi', 'Tis Hazari'],
      ['DL', 'HC_DELHI', 'Principal Seat at New Delhi', 'DL_SD', 'South Delhi', 'Saket'],
      ['DL', 'HC_DELHI', 'Principal Seat at New Delhi', 'DL_SED', 'South East Delhi', 'Saket'],
      ['DL', 'HC_DELHI', 'Principal Seat at New Delhi', 'DL_SWD', 'South West Delhi', 'Dwarka'],
      ['DL', 'HC_DELHI', 'Principal Seat at New Delhi', 'DL_ED', 'East Delhi', 'Karkardooma'],
      ['DL', 'HC_DELHI', 'Principal Seat at New Delhi', 'DL_NED', 'North East Delhi', 'Karkardooma'],
      ['DL', 'HC_DELHI', 'Principal Seat at New Delhi', 'DL_SHD', 'Shahdara', 'Karkardooma'],
      ['DL', 'HC_DELHI', 'Principal Seat at New Delhi', 'DL_NWD', 'North West Delhi', 'Rohini'],
      ['DL', 'HC_DELHI', 'Principal Seat at New Delhi', 'DL_NRD', 'North Delhi', 'Rohini'],

      // === 11. KERALA HIGH COURT (Kerala & Lakshadweep - 15 districts) ===
      ['KL', 'HC_KERALA', 'Principal Seat at Ernakulam', 'KL_TVM', 'Thiruvananthapuram', 'Thiruvananthapuram'],
      ['KL', 'HC_KERALA', 'Principal Seat at Ernakulam', 'KL_KLM', 'Kollam', 'Kollam'],
      ['KL', 'HC_KERALA', 'Principal Seat at Ernakulam', 'KL_PTA', 'Pathanamthitta', 'Pathanamthitta'],
      ['KL', 'HC_KERALA', 'Principal Seat at Ernakulam', 'KL_ALP', 'Alappuzha', 'Alappuzha'],
      ['KL', 'HC_KERALA', 'Principal Seat at Ernakulam', 'KL_KTM', 'Kottayam', 'Kottayam'],
      ['KL', 'HC_KERALA', 'Principal Seat at Ernakulam', 'KL_IDK', 'Idukki', 'Painavu'],
      ['KL', 'HC_KERALA', 'Principal Seat at Ernakulam', 'KL_EKM', 'Ernakulam', 'Kochi'],
      ['KL', 'HC_KERALA', 'Principal Seat at Ernakulam', 'KL_TSR', 'Thrissur', 'Thrissur'],
      ['KL', 'HC_KERALA', 'Principal Seat at Ernakulam', 'KL_PLK', 'Palakkad', 'Palakkad'],
      ['KL', 'HC_KERALA', 'Principal Seat at Ernakulam', 'KL_MLP', 'Malappuram', 'Malappuram'],
      ['KL', 'HC_KERALA', 'Principal Seat at Ernakulam', 'KL_KKD', 'Kozhikode', 'Kozhikode'],
      ['KL', 'HC_KERALA', 'Principal Seat at Ernakulam', 'KL_WYD', 'Wayanad', 'Kalpetta'],
      ['KL', 'HC_KERALA', 'Principal Seat at Ernakulam', 'KL_KNR', 'Kannur', 'Kannur'],
      ['KL', 'HC_KERALA', 'Principal Seat at Ernakulam', 'KL_KSD', 'Kasaragod', 'Kasaragod'],
      ['LD', 'HC_KERALA', 'Principal Seat at Ernakulam', 'LD_LAK', 'Lakshadweep', 'Kavaratti'],

      // === 12. GUJARAT HIGH COURT (Gujarat - 33 districts) ===
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_AHM', 'Ahmedabad', 'Ahmedabad'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_SRT', 'Surat', 'Surat'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_VDR', 'Vadodara', 'Vadodara'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_RJK', 'Rajkot', 'Rajkot'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_BHV', 'Bhavnagar', 'Bhavnagar'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_JAM', 'Jamnagar', 'Jamnagar'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_JNG', 'Junagadh', 'Junagadh'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_GND', 'Gandhinagar', 'Gandhinagar'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_AND', 'Anand', 'Anand'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_BRC', 'Bharuch', 'Bharuch'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_BNK', 'Banaskantha', 'Palanpur'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_SBK', 'Sabarkantha', 'Himmatnagar'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_MSN', 'Mehsana', 'Mehsana'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_PTN', 'Patan', 'Patan'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_ARV', 'Aravalli', 'Modasa'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_KHD', 'Kheda', 'Nadiad'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_DHD', 'Dahod', 'Dahod'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_PNM', 'Panchmahal', 'Godhra'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_MHG', 'Mahisagar', 'Lunawada'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_CUD', 'Chhota Udaipur', 'Chhota Udaipur'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_NRM', 'Narmada', 'Rajpipla'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_NVS', 'Navsari', 'Navsari'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_VLS', 'Valsad', 'Valsad'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_TAP', 'Tapi', 'Vyara'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_DNG', 'Dang', 'Ahwa'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_SRN', 'Surendranagar', 'Surendranagar'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_MRB', 'Morbi', 'Morbi'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_DVD', 'Devbhumi Dwarka', 'Khambhalia'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_PRB', 'Porbandar', 'Porbandar'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_GRS', 'Gir Somnath', 'Veraval'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_AMR', 'Amreli', 'Amreli'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_BTD', 'Botad', 'Botad'],
      ['GJ', 'HC_GUJARAT', 'Principal Seat at Ahmedabad', 'GJ_KTC', 'Kutch', 'Bhuj'],

      // === 13. PATNA HIGH COURT (Bihar - 38 districts) ===
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_PAT', 'Patna', 'Patna'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_GAY', 'Gaya', 'Gaya'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_MZP', 'Muzaffarpur', 'Muzaffarpur'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_BHG', 'Bhagalpur', 'Bhagalpur'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_DBG', 'Darbhanga', 'Darbhanga'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_PRN', 'Purnia', 'Purnia'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_SRN', 'Saran', 'Chapra'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_NLN', 'Nalanda', 'Bihar Sharif'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_RHT', 'Rohtas', 'Sasaram'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_KMR', 'Kaimur', 'Bhabua'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_BJP', 'Bhojpur', 'Ara'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_BXR', 'Buxar', 'Buxar'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_JHN', 'Jehanabad', 'Jehanabad'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_ARW', 'Arwal', 'Arwal'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_NWD', 'Nawada', 'Nawada'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_ARG', 'Aurangabad (Bihar)', 'Aurangabad'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_VSH', 'Vaishali', 'Hajipur'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_SMS', 'Samastipur', 'Samastipur'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_MDB', 'Madhubani', 'Madhubani'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_STM', 'Sitamarhi', 'Sitamarhi'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_SHR', 'Sheohar', 'Sheohar'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_ECH', 'East Champaran', 'Motihari'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_WCH', 'West Champaran', 'Bettiah'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_SWN', 'Siwan', 'Siwan'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_GPL', 'Gopalganj', 'Gopalganj'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_BGS', 'Begusarai', 'Begusarai'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_KHG', 'Khagaria', 'Khagaria'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_MNG', 'Munger', 'Munger'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_LKS', 'Lakhisarai', 'Lakhisarai'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_SKP', 'Sheikhpura', 'Sheikhpura'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_JMU', 'Jamui', 'Jamui'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_BNK', 'Banka', 'Banka'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_SHS', 'Saharsa', 'Saharsa'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_MDP', 'Madhepura', 'Madhepura'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_SPL', 'Supaul', 'Supaul'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_KTH', 'Katihar', 'Katihar'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_ARR', 'Araria', 'Araria'],
      ['BR', 'HC_PATNA', 'Principal Seat at Patna', 'BR_KSG', 'Kishanganj', 'Kishanganj'],

      // === 14. ANDHRA PRADESH HIGH COURT (Andhra Pradesh - 26 districts) ===
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_GNT', 'Guntur', 'Guntur'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_KRS', 'Krishna', 'Machilipatnam'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_NTR', 'NTR', 'Vijayawada'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_VSK', 'Visakhapatnam', 'Visakhapatnam'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_AKP', 'Anakapalli', 'Anakapalli'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_ASR', 'Alluri Sitharama Raju', 'Paderu'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_KKD', 'Kakinada', 'Kakinada'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_EGD', 'East Godavari', 'Rajahmundry'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_KNS', 'Dr. B.R. Ambedkar Konaseema', 'Amalapuram'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_WGD', 'West Godavari', 'Bhimavaram'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_ELR', 'Eluru', 'Eluru'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_PRK', 'Prakasam', 'Ongole'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_NLR', 'Sri Potti Sriramulu Nellore', 'Nellore'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_BPT', 'Bapatla', 'Bapatla'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_PLN', 'Palnadu', 'Narasaraopet'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_KRN', 'Kurnool', 'Kurnool'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_NDL', 'Nandyal', 'Nandyal'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_ATP', 'Ananthapuramu', 'Anantapur'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_SSS', 'Sri Sathya Sai', 'Puttaparthi'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_YSR', 'YSR Kadapa', 'Kadapa'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_ANM', 'Annamayya', 'Rayachoti'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_CTR', 'Chittoor', 'Chittoor'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_TPT', 'Tirupati', 'Tirupati'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_SKL', 'Srikakulam', 'Srikakulam'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_VZM', 'Vizianagaram', 'Vizianagaram'],
      ['AP', 'HC_ANDHRA', 'Principal Seat at Amaravati', 'AP_PVM', 'Parvathipuram Manyam', 'Parvathipuram'],

      // === 15. TELANGANA HIGH COURT (Telangana - 33 districts) ===
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_HYD', 'Hyderabad', 'Hyderabad'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_RRD', 'Ranga Reddy', 'L.B. Nagar'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_MDM', 'Medchal-Malkajgiri', 'Shamirpet'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_HNK', 'Hanumakonda', 'Hanumakonda'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_WGL', 'Warangal', 'Warangal'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_KRM', 'Karimnagar', 'Karimnagar'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_NZB', 'Nizamabad', 'Nizamabad'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_KMM', 'Khammam', 'Khammam'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_NLG', 'Nalgonda', 'Nalgonda'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_MBN', 'Mahabubnagar', 'Mahabubnagar'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_ADB', 'Adilabad', 'Adilabad'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_BDK', 'Bhadradri Kothagudem', 'Kothagudem'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_JGT', 'Jagtial', 'Jagtial'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_JNG', 'Jangaon', 'Jangaon'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_JSB', 'Jayashankar Bhupalpally', 'Bhupalpally'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_JGD', 'Jogulamba Gadwal', 'Gadwal'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_KMR', 'Kamareddy', 'Kamareddy'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_KBA', 'Komaram Bheem Asifabad', 'Asifabad'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_MBB', 'Mahabubabad', 'Mahabubabad'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_MNC', 'Mancherial', 'Mancherial'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_MDK', 'Medak', 'Medak'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_MLG', 'Mulugu', 'Mulugu'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_NGK', 'Nagarkurnool', 'Nagarkurnool'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_NPT', 'Narayanpet', 'Narayanpet'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_NRM', 'Nirmal', 'Nirmal'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_PDP', 'Peddapalli', 'Peddapalli'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_RJS', 'Rajanna Sircilla', 'Sircilla'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_SGR', 'Sangareddy', 'Sangareddy'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_SDP', 'Siddipet', 'Siddipet'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_SRY', 'Suryapet', 'Suryapet'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_VKB', 'Vikarabad', 'Vikarabad'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_WNP', 'Wanaparthy', 'Wanaparthy'],
      ['TS', 'HC_TELANGANA', 'Principal Seat at Hyderabad', 'TS_YDB', 'Yadadri Bhuvanagiri', 'Bhuvanagiri'],

      // === 16. ORISSA HIGH COURT (Odisha - 30 districts) ===
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_CTC', 'Cuttack', 'Cuttack'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_KHD', 'Khordha (Bhubaneswar)', 'Bhubaneswar'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_PUR', 'Puri', 'Puri'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_GNJ', 'Ganjam', 'Berhampur'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_SBP', 'Sambalpur', 'Sambalpur'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_BLS', 'Balasore', 'Balasore'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_BRG', 'Bargarh', 'Bargarh'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_BDK', 'Bhadrak', 'Bhadrak'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_BLN', 'Bolangir', 'Bolangir'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_BDH', 'Boudh', 'Boudh'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_DGH', 'Deogarh', 'Deogarh'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_DNK', 'Dhenkanal', 'Dhenkanal'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_GJP', 'Gajapati', 'Paralakhemundi'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_JGS', 'Jagatsinghpur', 'Jagatsinghpur'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_JJP', 'Jajpur', 'Jajpur'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_JRS', 'Jharsuguda', 'Jharsuguda'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_KLH', 'Kalahandi', 'Bhawanipatna'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_KND', 'Kandhamal', 'Phulbani'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_KNP', 'Kendrapara', 'Kendrapara'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_KJN', 'Keonjhar', 'Keonjhar'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_KRP', 'Koraput', 'Jeypore'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_MLK', 'Malkangiri', 'Malkangiri'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_MYB', 'Mayurbhanj', 'Baripada'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_NBP', 'Nabarangpur', 'Nabarangpur'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_NYG', 'Nayagarh', 'Nayagarh'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_NPD', 'Nuapada', 'Nuapada'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_RYG', 'Rayagada', 'Rayagada'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_SBN', 'Subarnapur (Sonepur)', 'Sonepur'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_SND', 'Sundergarh', 'Rourkela / Sundergarh'],
      ['OD', 'HC_ORISSA', 'Principal Seat at Cuttack', 'OD_ANG', 'Angul', 'Angul'],

      // === 17. JHARKHAND HIGH COURT (Jharkhand - 24 districts) ===
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_RNC', 'Ranchi', 'Ranchi'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_DHN', 'Dhanbad', 'Dhanbad'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_ESN', 'East Singhbhum (Jamshedpur)', 'Jamshedpur'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_BKR', 'Bokaro', 'Bokaro'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_HZB', 'Hazaribagh', 'Hazaribagh'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_DGH', 'Deoghar', 'Deoghar'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_GRD', 'Giridih', 'Giridih'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_PLM', 'Palamu (Medininagar)', 'Medininagar'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_RMG', 'Ramgarh', 'Ramgarh'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_SRK', 'Saraikela Kharsawan', 'Saraikela'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_WSN', 'West Singhbhum (Chaibasa)', 'Chaibasa'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_GRW', 'Garhwa', 'Garhwa'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_CTR', 'Chatra', 'Chatra'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_KDM', 'Koderma', 'Koderma'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_GML', 'Gumla', 'Gumla'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_SMD', 'Simdega', 'Simdega'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_LHD', 'Lohardaga', 'Lohardaga'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_LTH', 'Latehar', 'Latehar'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_DMK', 'Dumka', 'Dumka'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_JMT', 'Jamtara', 'Jamtara'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_GDD', 'Godda', 'Godda'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_SBG', 'Sahibganj', 'Sahibganj'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_PKR', 'Pakur', 'Pakur'],
      ['JH', 'HC_JHARKHAND', 'Principal Seat at Ranchi', 'JH_KNT', 'Khunti', 'Khunti'],

      // === 18. CHHATTISGARH HIGH COURT (Chhattisgarh - 33 districts) ===
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_BSP', 'Bilaspur', 'Bilaspur'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_RPR', 'Raipur', 'Raipur'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_DRG', 'Durg', 'Durg'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_RJN', 'Rajnandgaon', 'Rajnandgaon'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_BST', 'Bastar (Jagdalpur)', 'Jagdalpur'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_SRG', 'Surguja (Ambikapur)', 'Ambikapur'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_KRB', 'Korba', 'Korba'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_RGH', 'Raigarh', 'Raigarh'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_JNJ', 'Janjgir-Champa', 'Janjgir'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_BLD', 'Balod', 'Balod'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_BLB', 'Baloda Bazar', 'Baloda Bazar'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_BLP', 'Balrampur-Ramanujganj', 'Balrampur'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_BMT', 'Bemetara', 'Bemetara'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_BJP', 'Bijapur', 'Bijapur'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_DTW', 'Dantewada', 'Dantewada'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_DHM', 'Dhamtari', 'Dhamtari'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_GRB', 'Gariaband', 'Gariaband'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_GPM', 'Gaurela-Pendra-Marwahi', 'Pendra'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_KNK', 'Kanker', 'Kanker'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_KWD', 'Kawardha (Kabirdham)', 'Kawardha'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_KDG', 'Kondagaon', 'Kondagaon'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_KCG', 'Khairagarh-Chhuikhadan-Gandai', 'Khairagarh'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_KRY', 'Koriya', 'Baikunthpur'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_MSM', 'Mahasamund', 'Mahasamund'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_MCB', 'Manendragarh-Chirmiri-Bharatpur', 'Manendragarh'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_MMA', 'Mohla-Manpur-Ambagarh Chowki', 'Mohla'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_MGL', 'Mungeli', 'Mungeli'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_NRP', 'Narayanpur', 'Narayanpur'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_SGB', 'Sarangarh-Bilaigarh', 'Sarangarh'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_SKT', 'Sakti', 'Sakti'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_SKM', 'Sukma', 'Sukma'],
      ['CG', 'HC_CHHATTISGARH', 'Principal Seat at Bilaspur', 'CG_SRJ', 'Surajpur', 'Surajpur'],

      // === 19. HIMACHAL PRADESH HIGH COURT (Himachal Pradesh - 12 districts) ===
      ['HP', 'HC_HIMACHAL', 'Principal Seat at Shimla', 'HP_SML', 'Shimla', 'Shimla'],
      ['HP', 'HC_HIMACHAL', 'Principal Seat at Shimla', 'HP_KNG', 'Kangra', 'Dharamshala'],
      ['HP', 'HC_HIMACHAL', 'Principal Seat at Shimla', 'HP_MND', 'Mandi', 'Mandi'],
      ['HP', 'HC_HIMACHAL', 'Principal Seat at Shimla', 'HP_KLU', 'Kullu', 'Kullu'],
      ['HP', 'HC_HIMACHAL', 'Principal Seat at Shimla', 'HP_SLN', 'Solan', 'Solan'],
      ['HP', 'HC_HIMACHAL', 'Principal Seat at Shimla', 'HP_SMR', 'Sirmaur', 'Nahan'],
      ['HP', 'HC_HIMACHAL', 'Principal Seat at Shimla', 'HP_HMP', 'Hamirpur', 'Hamirpur'],
      ['HP', 'HC_HIMACHAL', 'Principal Seat at Shimla', 'HP_UNA', 'Una', 'Una'],
      ['HP', 'HC_HIMACHAL', 'Principal Seat at Shimla', 'HP_BLS', 'Bilaspur (HP)', 'Bilaspur'],
      ['HP', 'HC_HIMACHAL', 'Principal Seat at Shimla', 'HP_CHM', 'Chamba', 'Chamba'],
      ['HP', 'HC_HIMACHAL', 'Principal Seat at Shimla', 'HP_KNR', 'Kinnaur', 'Reckong Peo'],
      ['HP', 'HC_HIMACHAL', 'Principal Seat at Shimla', 'HP_LHS', 'Lahaul and Spiti', 'Keylong'],

      // === 20. HIGH COURT OF JAMMU & KASHMIR AND LADAKH (J&K & Ladakh - 22 districts) ===
      // Srinagar Wing (10 JK)
      ['JK', 'HC_JK_LADAKH', 'Principal Seat at Srinagar', 'JK_SGR', 'Srinagar', 'Srinagar'],
      ['JK', 'HC_JK_LADAKH', 'Principal Seat at Srinagar', 'JK_ANT', 'Anantnag', 'Anantnag'],
      ['JK', 'HC_JK_LADAKH', 'Principal Seat at Srinagar', 'JK_BRM', 'Baramulla', 'Baramulla'],
      ['JK', 'HC_JK_LADAKH', 'Principal Seat at Srinagar', 'JK_BDG', 'Budgam', 'Budgam'],
      ['JK', 'HC_JK_LADAKH', 'Principal Seat at Srinagar', 'JK_BDP', 'Bandipora', 'Bandipora'],
      ['JK', 'HC_JK_LADAKH', 'Principal Seat at Srinagar', 'JK_GDB', 'Ganderbal', 'Ganderbal'],
      ['JK', 'HC_JK_LADAKH', 'Principal Seat at Srinagar', 'JK_KLG', 'Kulgam', 'Kulgam'],
      ['JK', 'HC_JK_LADAKH', 'Principal Seat at Srinagar', 'JK_KPW', 'Kupwara', 'Kupwara'],
      ['JK', 'HC_JK_LADAKH', 'Principal Seat at Srinagar', 'JK_PLW', 'Pulwama', 'Pulwama'],
      ['JK', 'HC_JK_LADAKH', 'Principal Seat at Srinagar', 'JK_SHP', 'Shopian', 'Shopian'],
      // Jammu Wing (10 JK)
      ['JK', 'HC_JK_LADAKH', 'Jammu Wing', 'JK_JAM', 'Jammu', 'Jammu'],
      ['JK', 'HC_JK_LADAKH', 'Jammu Wing', 'JK_DOD', 'Doda', 'Doda'],
      ['JK', 'HC_JK_LADAKH', 'Jammu Wing', 'JK_KTH', 'Kathua', 'Kathua'],
      ['JK', 'HC_JK_LADAKH', 'Jammu Wing', 'JK_KST', 'Kishtwar', 'Kishtwar'],
      ['JK', 'HC_JK_LADAKH', 'Jammu Wing', 'JK_PNC', 'Poonch', 'Poonch'],
      ['JK', 'HC_JK_LADAKH', 'Jammu Wing', 'JK_RJR', 'Rajouri', 'Rajouri'],
      ['JK', 'HC_JK_LADAKH', 'Jammu Wing', 'JK_RMB', 'Ramban', 'Ramban'],
      ['JK', 'HC_JK_LADAKH', 'Jammu Wing', 'JK_REA', 'Reasi', 'Reasi'],
      ['JK', 'HC_JK_LADAKH', 'Jammu Wing', 'JK_SMB', 'Samba', 'Samba'],
      ['JK', 'HC_JK_LADAKH', 'Jammu Wing', 'JK_UDH', 'Udhampur', 'Udhampur'],
      // Ladakh (2)
      ['LA', 'HC_JK_LADAKH', 'Principal Seat at Srinagar', 'LA_LEH', 'Leh Ladakh', 'Leh'],
      ['LA', 'HC_JK_LADAKH', 'Principal Seat at Srinagar', 'LA_KRG', 'Kargil', 'Kargil'],

      // === 21. UTTARAKHAND HIGH COURT (Uttarakhand - 13 districts) ===
      ['UK', 'HC_UTTARAKHAND', 'Principal Seat at Nainital', 'UK_NNT', 'Nainital', 'Nainital'],
      ['UK', 'HC_UTTARAKHAND', 'Principal Seat at Nainital', 'UK_DDN', 'Dehradun', 'Dehradun'],
      ['UK', 'HC_UTTARAKHAND', 'Principal Seat at Nainital', 'UK_HDW', 'Haridwar', 'Haridwar'],
      ['UK', 'HC_UTTARAKHAND', 'Principal Seat at Nainital', 'UK_USN', 'Udham Singh Nagar', 'Rudrapur'],
      ['UK', 'HC_UTTARAKHAND', 'Principal Seat at Nainital', 'UK_ALM', 'Almora', 'Almora'],
      ['UK', 'HC_UTTARAKHAND', 'Principal Seat at Nainital', 'UK_BGW', 'Bageshwar', 'Bageshwar'],
      ['UK', 'HC_UTTARAKHAND', 'Principal Seat at Nainital', 'UK_CHM', 'Chamoli', 'Gopeshwar'],
      ['UK', 'HC_UTTARAKHAND', 'Principal Seat at Nainital', 'UK_CPW', 'Champawat', 'Champawat'],
      ['UK', 'HC_UTTARAKHAND', 'Principal Seat at Nainital', 'UK_PGH', 'Pauri Garhwal', 'Pauri'],
      ['UK', 'HC_UTTARAKHAND', 'Principal Seat at Nainital', 'UK_PTH', 'Pithoragarh', 'Pithoragarh'],
      ['UK', 'HC_UTTARAKHAND', 'Principal Seat at Nainital', 'UK_RDP', 'Rudraprayag', 'Rudraprayag'],
      ['UK', 'HC_UTTARAKHAND', 'Principal Seat at Nainital', 'UK_TGH', 'Tehri Garhwal', 'New Tehri'],
      ['UK', 'HC_UTTARAKHAND', 'Principal Seat at Nainital', 'UK_UTK', 'Uttarkashi', 'Uttarkashi'],

      // === 22. MANIPUR HIGH COURT (Manipur - 16 districts) ===
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_IW', 'Imphal West', 'Lamphelpat'],
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_IE', 'Imphal East', 'Porompat'],
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_BSN', 'Bishnupur', 'Bishnupur'],
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_TBL', 'Thoubal', 'Thoubal'],
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_KCG', 'Kakching', 'Kakching'],
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_CCP', 'Churachandpur', 'Churachandpur'],
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_CDL', 'Chandel', 'Chandel'],
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_SNP', 'Senapati', 'Senapati'],
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_TMG', 'Tamenglong', 'Tamenglong'],
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_UKH', 'Ukhrul', 'Ukhrul'],
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_KPK', 'Kangpokpi', 'Kangpokpi'],
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_TNP', 'Tengnoupal', 'Tengnoupal'],
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_PHZ', 'Pherzawl', 'Pherzawl'],
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_NNY', 'Noney', 'Longmai'],
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_KMJ', 'Kamjong', 'Kamjong'],
      ['MN', 'HC_MANIPUR', 'Principal Seat at Imphal', 'MN_JRB', 'Jiribam', 'Jiribam'],

      // === 23. MEGHALAYA HIGH COURT (Meghalaya - 12 districts) ===
      ['ML', 'HC_MEGHALAYA', 'Principal Seat at Shillong', 'ML_EKH', 'East Khasi Hills (Shillong)', 'Shillong'],
      ['ML', 'HC_MEGHALAYA', 'Principal Seat at Shillong', 'ML_WKH', 'West Khasi Hills', 'Nongstoin'],
      ['ML', 'HC_MEGHALAYA', 'Principal Seat at Shillong', 'ML_SWK', 'South West Khasi Hills', 'Mawkyrwat'],
      ['ML', 'HC_MEGHALAYA', 'Principal Seat at Shillong', 'ML_EWK', 'Eastern West Khasi Hills', 'Mairang'],
      ['ML', 'HC_MEGHALAYA', 'Principal Seat at Shillong', 'ML_RBH', 'Ri-Bhoi', 'Nongpoh'],
      ['ML', 'HC_MEGHALAYA', 'Principal Seat at Shillong', 'ML_WJH', 'West Jaintia Hills', 'Jowai'],
      ['ML', 'HC_MEGHALAYA', 'Principal Seat at Shillong', 'ML_EJH', 'East Jaintia Hills', 'Khliehriat'],
      ['ML', 'HC_MEGHALAYA', 'Principal Seat at Shillong', 'ML_WGH', 'West Garo Hills (Tura)', 'Tura'],
      ['ML', 'HC_MEGHALAYA', 'Principal Seat at Shillong', 'ML_EGH', 'East Garo Hills', 'Williamnagar'],
      ['ML', 'HC_MEGHALAYA', 'Principal Seat at Shillong', 'ML_SGH', 'South Garo Hills', 'Baghmara'],
      ['ML', 'HC_MEGHALAYA', 'Principal Seat at Shillong', 'ML_NGH', 'North Garo Hills', 'Resubelpara'],
      ['ML', 'HC_MEGHALAYA', 'Principal Seat at Shillong', 'ML_SWG', 'South West Garo Hills', 'Ampati'],

      // === 24. TRIPURA HIGH COURT (Tripura - 8 districts) ===
      ['TR', 'HC_TRIPURA', 'Principal Seat at Agartala', 'TR_WTR', 'West Tripura (Agartala)', 'Agartala'],
      ['TR', 'HC_TRIPURA', 'Principal Seat at Agartala', 'TR_GMT', 'Gomati', 'Udaipur'],
      ['TR', 'HC_TRIPURA', 'Principal Seat at Agartala', 'TR_STR', 'South Tripura', 'Belonia'],
      ['TR', 'HC_TRIPURA', 'Principal Seat at Agartala', 'TR_KHW', 'Khowai', 'Khowai'],
      ['TR', 'HC_TRIPURA', 'Principal Seat at Agartala', 'TR_SPH', 'Sepahijala', 'Bishramganj'],
      ['TR', 'HC_TRIPURA', 'Principal Seat at Agartala', 'TR_DHL', 'Dhalai', 'Ambassa'],
      ['TR', 'HC_TRIPURA', 'Principal Seat at Agartala', 'TR_UNK', 'Unakoti', 'Kailashahar'],
      ['TR', 'HC_TRIPURA', 'Principal Seat at Agartala', 'TR_NTR', 'North Tripura', 'Dharmanagar'],

      // === 25. SIKKIM HIGH COURT (Sikkim - 6 districts) ===
      ['SK', 'HC_SIKKIM', 'Principal Seat at Gangtok', 'SK_ESK', 'East Sikkim (Gangtok)', 'Gangtok'],
      ['SK', 'HC_SIKKIM', 'Principal Seat at Gangtok', 'SK_WSK', 'West Sikkim', 'Gyalshing'],
      ['SK', 'HC_SIKKIM', 'Principal Seat at Gangtok', 'SK_NSK', 'North Sikkim', 'Mangan'],
      ['SK', 'HC_SIKKIM', 'Principal Seat at Gangtok', 'SK_SSK', 'South Sikkim', 'Namchi'],
      ['SK', 'HC_SIKKIM', 'Principal Seat at Gangtok', 'SK_PKY', 'Pakyong', 'Pakyong'],
      ['SK', 'HC_SIKKIM', 'Principal Seat at Gangtok', 'SK_SRG', 'Soreng', 'Soreng']
    ];

    let insertedDistricts = 0;
    for (const [stateCode, hcCode, benchName, distCode, distName, hq] of allDistricts) {
      const stateId = stateMap[stateCode];
      const hcId = hcMap[hcCode];
      const benchId = getBenchId(hcCode, benchName);

      if (stateId && hcId && benchId) {
        await connection.query(
          `INSERT INTO districts (state_ut_id, high_court_id, bench_id, district_code, district_name, headquarters)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             high_court_id=VALUES(high_court_id),
             bench_id=VALUES(bench_id),
             district_code=VALUES(district_code),
             headquarters=VALUES(headquarters)`,
          [stateId, hcId, benchId, distCode, distName, hq]
        );
        insertedDistricts++;
      } else {
        console.warn(`Warning: Could not link district ${distName} (${stateCode}, ${hcCode}, ${benchName})`);
      }
    }
    console.log(`  -> Successfully processed & seeded ${insertedDistricts} all-India Judicial Districts.`);

    const [distRows] = await connection.query('SELECT id, district_code, district_name, state_ut_id FROM districts');
    const distMap = {};
    for (const r of distRows) {
      distMap[r.district_code] = r.id;
      distMap[r.district_name] = r.id;
    }

    // -------------------------------------------------------------
    // 6. SEED COURT LEVELS / TIERS
    // -------------------------------------------------------------
    console.log('6. Seeding Indian Judicial Court Levels...');
    const courtLevelsData = [
      [
        'LEVEL_APEX',
        'Supreme Court of India',
        1,
        'Apex',
        'Highest judicial forum and final court of appeal under the Constitution of India.'
      ],
      [
        'LEVEL_HIGH_COURT',
        'High Court',
        2,
        'High Court',
        'Constitutional Court for the State/UT exercising original, appellate, and writ jurisdiction under Articles 226/227.'
      ],
      [
        'LEVEL_DISTRICT_SESSIONS',
        'Principal District & Sessions Judge',
        3,
        'District Level',
        'Principal civil court of original jurisdiction and highest criminal court in the district, empowered to try major sessions offences and hear first appeals.'
      ],
      [
        'LEVEL_ADDL_DISTRICT_SESSIONS',
        'Additional District & Sessions Judge',
        4,
        'District Level',
        'Court sharing concurrent civil and criminal sessions trial powers and appellate powers as assigned by Principal District Judge.'
      ],
      [
        'LEVEL_SR_CIVIL_CJM',
        'Principal Senior Civil Judge / Chief Judicial Magistrate (CJM)',
        5,
        'Subordinate Senior',
        'Handles civil suits of higher pecuniary value and major magisterial criminal matters under CrPC/BNSS with sentencing power up to 7 years.'
      ],
      [
        'LEVEL_JR_CIVIL_JMFC',
        'Junior Civil Judge / Judicial Magistrate First Class (JMFC)',
        6,
        'Subordinate Junior',
        'Entry-level trial court handling civil suits of lower pecuniary value and criminal offences punishable up to 3 years.'
      ]
    ];

    for (const [code, name, tier, cat, desc] of courtLevelsData) {
      await connection.query(
        `INSERT INTO court_levels (level_code, level_name, tier_order, category, description)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           tier_order=VALUES(tier_order),
           category=VALUES(category),
           description=VALUES(description)`,
        [code, name, tier, cat, desc]
      );
    }
    console.log(`  -> Seeded ${courtLevelsData.length} Court Levels.`);

    const [levelRows] = await connection.query('SELECT id, level_code FROM court_levels');
    const levelMap = {};
    for (const r of levelRows) {
      levelMap[r.level_code] = r.id;
    }

    // -------------------------------------------------------------
    // 7. SEED SUBORDINATE COURTS IN KEY DISTRICTS
    // -------------------------------------------------------------
    console.log('7. Seeding Representative Subordinate Courts...');
    const subCourtsData = [
      // Prayagraj
      ['UP_PRY', 'LEVEL_DISTRICT_SESSIONS', 'Court of Principal District & Sessions Judge, Prayagraj', 'Combined / Dual', 'District Court Complex, Prayagraj'],
      ['UP_PRY', 'LEVEL_ADDL_DISTRICT_SESSIONS', 'Court of Additional Sessions Judge (Court 1), Prayagraj', 'Criminal', 'District Court Complex, Prayagraj'],
      ['UP_PRY', 'LEVEL_SR_CIVIL_CJM', 'Court of Chief Judicial Magistrate, Prayagraj', 'Criminal', 'District Court Complex, Prayagraj'],
      ['UP_PRY', 'LEVEL_SR_CIVIL_CJM', 'Court of Civil Judge (Senior Division), Prayagraj', 'Civil', 'District Court Complex, Prayagraj'],
      ['UP_PRY', 'LEVEL_JR_CIVIL_JMFC', 'Court of Judicial Magistrate 1st Class (Court 1), Prayagraj', 'Criminal', 'District Court Complex, Prayagraj'],

      // Lucknow
      ['UP_LKO', 'LEVEL_DISTRICT_SESSIONS', 'Court of Principal District & Sessions Judge, Lucknow', 'Combined / Dual', 'Kaiserbagh Court Complex, Lucknow'],
      ['UP_LKO', 'LEVEL_ADDL_DISTRICT_SESSIONS', 'Court of Special Judge (CBI / ACB), Lucknow', 'Special', 'Kaiserbagh Court Complex, Lucknow'],
      ['UP_LKO', 'LEVEL_SR_CIVIL_CJM', 'Court of Chief Judicial Magistrate, Lucknow', 'Criminal', 'Kaiserbagh Court Complex, Lucknow'],
      ['UP_LKO', 'LEVEL_SR_CIVIL_CJM', 'Court of Civil Judge (Senior Division), Lucknow', 'Civil', 'Kaiserbagh Court Complex, Lucknow'],
      ['UP_LKO', 'LEVEL_JR_CIVIL_JMFC', 'Court of Judicial Magistrate First Class, Lucknow', 'Criminal', 'Kaiserbagh Court Complex, Lucknow'],

      // Varanasi
      ['UP_VNS', 'LEVEL_DISTRICT_SESSIONS', 'Court of Principal District & Sessions Judge, Varanasi', 'Combined / Dual', 'Kachehari, Varanasi'],
      ['UP_VNS', 'LEVEL_SR_CIVIL_CJM', 'Court of Civil Judge (Senior Division), Varanasi', 'Civil', 'Kachehari, Varanasi'],
      ['UP_VNS', 'LEVEL_SR_CIVIL_CJM', 'Court of Chief Judicial Magistrate, Varanasi', 'Criminal', 'Kachehari, Varanasi'],

      // Mumbai
      ['MH_MUM', 'LEVEL_DISTRICT_SESSIONS', 'City Civil and Sessions Court, Mumbai', 'Combined / Dual', 'Fort / Kala Ghoda, Mumbai'],
      ['MH_MUM', 'LEVEL_SR_CIVIL_CJM', 'Court of Chief Metropolitan Magistrate, Esplanade, Mumbai', 'Criminal', 'Esplanade, Mumbai'],
      ['MH_MUM', 'LEVEL_JR_CIVIL_JMFC', 'Court of Metropolitan Magistrate (Court 37), Mumbai', 'Criminal', 'Esplanade, Mumbai'],

      // New Delhi
      ['DL_ND', 'LEVEL_DISTRICT_SESSIONS', 'Court of Principal District & Sessions Judge, New Delhi', 'Combined / Dual', 'Patiala House Courts, New Delhi'],
      ['DL_ND', 'LEVEL_SR_CIVIL_CJM', 'Court of Chief Metropolitan Magistrate, Patiala House Courts', 'Criminal', 'Patiala House Courts, New Delhi'],
      ['DL_ND', 'LEVEL_SR_CIVIL_CJM', 'Court of Senior Civil Judge-cum-Rent Controller, New Delhi', 'Civil', 'Patiala House Courts, New Delhi'],

      // Central Delhi (Tis Hazari)
      ['DL_CD', 'LEVEL_DISTRICT_SESSIONS', 'Court of Principal District & Sessions Judge (HQ), Tis Hazari', 'Combined / Dual', 'Tis Hazari Courts, Delhi'],
      ['DL_CD', 'LEVEL_SR_CIVIL_CJM', 'Court of Chief Metropolitan Magistrate (Central), Tis Hazari', 'Criminal', 'Tis Hazari Courts, Delhi'],

      // Jodhpur
      ['RJ_JDH', 'LEVEL_DISTRICT_SESSIONS', 'Court of Principal District & Sessions Judge, Jodhpur Metropolitan', 'Combined / Dual', 'Pali Road, Jodhpur'],
      ['RJ_JDH', 'LEVEL_SR_CIVIL_CJM', 'Court of Chief Judicial Magistrate, Jodhpur Metropolitan', 'Criminal', 'Pali Road, Jodhpur'],

      // Jaipur
      ['RJ_JPR', 'LEVEL_DISTRICT_SESSIONS', 'Court of Principal District & Sessions Judge, Jaipur Metropolitan-I', 'Combined / Dual', 'Session Court Complex, Jaipur'],
      ['RJ_JPR', 'LEVEL_SR_CIVIL_CJM', 'Court of Chief Metropolitan Magistrate, Jaipur', 'Criminal', 'Session Court Complex, Jaipur'],

      // Bengaluru
      ['KA_BLR', 'LEVEL_DISTRICT_SESSIONS', 'City Civil and Sessions Court, Bengaluru', 'Combined / Dual', 'City Civil Court Complex, Bengaluru'],
      ['KA_BLR', 'LEVEL_SR_CIVIL_CJM', 'Court of Chief Metropolitan Magistrate, Bengaluru', 'Criminal', 'Nrupathunga Road, Bengaluru'],

      // East Khasi Hills (Shillong)
      ['ML_EKH', 'LEVEL_DISTRICT_SESSIONS', 'Court of District & Sessions Judge, East Khasi Hills', 'Combined / Dual', 'Deputy Commissioner Court Complex, Shillong'],
      ['ML_EKH', 'LEVEL_SR_CIVIL_CJM', 'Court of Chief Judicial Magistrate, Shillong', 'Criminal', 'Shillong']
    ];

    for (const [distCode, levelCode, courtName, courtType, loc] of subCourtsData) {
      const distId = distMap[distCode];
      const levelId = levelMap[levelCode];
      if (distId && levelId) {
        const [existing] = await connection.query(
          `SELECT id FROM subordinate_courts WHERE district_id = ? AND court_name = ?`,
          [distId, courtName]
        );
        if (existing.length === 0) {
          await connection.query(
            `INSERT INTO subordinate_courts (district_id, court_level_id, court_name, court_type, location)
             VALUES (?, ?, ?, ?, ?)`,
            [distId, levelId, courtName, courtType, loc]
          );
        }
      }
    }
    console.log(`  -> Seeded representative Subordinate Courts.`);

    // -------------------------------------------------------------
    // 8. SEED DATA-DRIVEN APPELLATE PATHS
    // -------------------------------------------------------------
    console.log('8. Seeding Data-Driven Appellate Paths...');
    const appellatePathsData = [
      // Civil Routes
      [
        'Civil',
        'LEVEL_JR_CIVIL_JMFC',
        'LEVEL_SR_CIVIL_CJM',
        'Regular First Appeal (Pecuniary Limit)',
        'Code of Civil Procedure, 1908 (Section 96)',
        'First Appeal against decree passed by Junior Civil Judge to Senior Civil Judge / District Judge based on statutory valuation.'
      ],
      [
        'Civil',
        'LEVEL_SR_CIVIL_CJM',
        'LEVEL_DISTRICT_SESSIONS',
        'Regular First Appeal (RFA)',
        'Code of Civil Procedure, 1908 (Section 96 & Order XLI)',
        'First Appeal on questions of fact and law against the decree/order of Senior Civil Judge to District & Sessions Court.'
      ],
      [
        'Civil',
        'LEVEL_DISTRICT_SESSIONS',
        'LEVEL_HIGH_COURT',
        'Second Appeal / High Court First Appeal (RFA / RSA)',
        'Code of Civil Procedure, 1908 (Section 96 / Section 100)',
        'Second Appeal to the High Court lying strictly on a Substantial Question of Law (Sec 100) or First Appeal against District Judge original decree (Sec 96).'
      ],
      [
        'Civil',
        'LEVEL_HIGH_COURT',
        'LEVEL_APEX',
        'Special Leave Petition (Civil) / Civil Appeal',
        'Constitution of India (Articles 133 & 136)',
        'Apex appellate jurisdiction before Supreme Court of India via SLP (Civil) or Certificate of Fitness under Article 133/134A.'
      ],

      // Criminal Routes
      [
        'Criminal',
        'LEVEL_JR_CIVIL_JMFC',
        'LEVEL_DISTRICT_SESSIONS',
        'Criminal Appeal against Conviction',
        'Code of Criminal Procedure, 1973 (Section 374(3)) / BNSS',
        'Appeal by any person convicted on a trial held by a Judicial Magistrate of the First Class to the Court of Session.'
      ],
      [
        'Criminal',
        'LEVEL_SR_CIVIL_CJM',
        'LEVEL_DISTRICT_SESSIONS',
        'Criminal Appeal against Sentence / Order',
        'Code of Criminal Procedure, 1973 (Section 374(3)) / BNSS',
        'Appeal against conviction or sentencing order passed by Chief Judicial Magistrate / Chief Metropolitan Magistrate to Court of Session.'
      ],
      [
        'Criminal',
        'LEVEL_DISTRICT_SESSIONS',
        'LEVEL_HIGH_COURT',
        'Criminal Appeal / Capital Confirmation',
        'Code of Criminal Procedure, 1973 (Section 374(2) & Section 366) / BNSS',
        'Direct Criminal Appeal to High Court where conviction involves imprisonment exceeding 7 years; death sentences require mandatory High Court confirmation.'
      ],
      [
        'Criminal',
        'LEVEL_HIGH_COURT',
        'LEVEL_APEX',
        'Special Leave Petition (Criminal) / Criminal Appeal',
        'Constitution of India (Articles 134 & 136)',
        'Apex Criminal Appeal before Supreme Court of India against High Court judgment or conviction reversal to death penalty.'
      ],

      // Constitutional Routes
      [
        'Constitutional',
        'LEVEL_HIGH_COURT',
        'LEVEL_APEX',
        'Constitutional Special Leave Petition / Article 132 Appeal',
        'Constitution of India (Articles 132 & 136)',
        'Appeal to Supreme Court on substantial questions of law as to the interpretation of the Constitution.'
      ],

      // Family Routes
      [
        'Family',
        'LEVEL_DISTRICT_SESSIONS',
        'LEVEL_HIGH_COURT',
        'Family Court First Appeal',
        'Family Courts Act, 1984 (Section 19)',
        'Statutory appeal against every judgment or order not being an interlocutory order passed by a Family Court directly to the High Court Division Bench.'
      ],
      [
        'Family',
        'LEVEL_HIGH_COURT',
        'LEVEL_APEX',
        'Special Leave Petition (Civil - Matrimonial / Family)',
        'Constitution of India (Article 136)',
        'Final petition before the Supreme Court in matrimonial, child custody, or family property disputes.'
      ],

      // Commercial Routes
      [
        'Commercial',
        'LEVEL_DISTRICT_SESSIONS',
        'LEVEL_HIGH_COURT',
        'Commercial Appellate Division Appeal (FAO-Comm)',
        'Commercial Courts Act, 2015 (Section 13)',
        'Statutory appeal from judgment of Commercial Court / Commercial Division to Commercial Appellate Division of High Court within 60 days.'
      ],
      [
        'Commercial',
        'LEVEL_HIGH_COURT',
        'LEVEL_APEX',
        'Special Leave Petition (Commercial)',
        'Constitution of India (Article 136)',
        'Apex appeal in high-stakes commercial disputes before the Supreme Court of India.'
      ]
    ];

    await connection.query('DELETE FROM appellate_paths');
    for (const [cat, fromCode, toCode, appType, statute, desc] of appellatePathsData) {
      const fromId = levelMap[fromCode];
      const toId = levelMap[toCode];
      if (fromId && toId) {
        await connection.query(
          `INSERT INTO appellate_paths (case_category, from_level_id, to_level_id, appeal_type, governing_statute, description)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [cat, fromId, toId, appType, statute, desc]
        );
      }
    }
    console.log(`  -> Seeded ${appellatePathsData.length} statutory Appellate Paths.`);

    // -------------------------------------------------------------
    // 9. UPDATE SEED CASES WITH REALISTIC HIERARCHY ASSOCIATIONS
    // -------------------------------------------------------------
    console.log('9. Updating Existing Seed Cases with Realistic Hierarchy Associations...');
    
    const upStateId = stateMap['UP'];
    const alldHcId = hcMap['HC_ALLAHABAD'];
    const pryBenchId = getBenchId('HC_ALLAHABAD', 'Principal Seat at Prayagraj');
    const pryDistId = distMap['UP_PRY'];
    const sessionsLevelId = levelMap['LEVEL_DISTRICT_SESSIONS'];
    const [subCourtPry] = await connection.query(
      `SELECT id FROM subordinate_courts WHERE district_id = ? AND court_level_id = ? LIMIT 1`,
      [pryDistId, sessionsLevelId]
    );

    const lkoBenchId = getBenchId('HC_ALLAHABAD', 'Lucknow Bench');
    const lkoDistId = distMap['UP_LKO'];
    const [subCourtLko] = await connection.query(
      `SELECT id FROM subordinate_courts WHERE district_id = ? AND court_level_id = ? LIMIT 1`,
      [lkoDistId, sessionsLevelId]
    );

    const dlStateId = stateMap['DL'];
    const dlHcId = hcMap['HC_DELHI'];
    const dlBenchId = getBenchId('HC_DELHI', 'Principal Seat at New Delhi');
    const dlDistId = distMap['DL_ND'];
    const [subCourtDl] = await connection.query(
      `SELECT id FROM subordinate_courts WHERE district_id = ? LIMIT 1`,
      [dlDistId]
    );

    const mhStateId = stateMap['MH'];
    const bombayHcId = hcMap['HC_BOMBAY'];
    const mumBenchId = getBenchId('HC_BOMBAY', 'Principal Seat at Mumbai');
    const mumDistId = distMap['MH_MUM'];
    const [subCourtMum] = await connection.query(
      `SELECT id FROM subordinate_courts WHERE district_id = ? LIMIT 1`,
      [mumDistId]
    );

    const vnsDistId = distMap['UP_VNS'];
    const [subCourtVns] = await connection.query(
      `SELECT id FROM subordinate_courts WHERE district_id = ? LIMIT 1`,
      [vnsDistId]
    );

    const caseHierarchyMappings = [
      { id: 1, state: upStateId, hc: alldHcId, bench: pryBenchId, dist: pryDistId, court: subCourtPry[0]?.id || null, level: sessionsLevelId },
      { id: 2, state: upStateId, hc: alldHcId, bench: lkoBenchId, dist: lkoDistId, court: subCourtLko[0]?.id || null, level: sessionsLevelId },
      { id: 3, state: dlStateId, hc: dlHcId, bench: dlBenchId, dist: dlDistId, court: subCourtDl[0]?.id || null, level: sessionsLevelId },
      { id: 4, state: mhStateId, hc: bombayHcId, bench: mumBenchId, dist: mumDistId, court: subCourtMum[0]?.id || null, level: sessionsLevelId },
      { id: 5, state: upStateId, hc: alldHcId, bench: pryBenchId, dist: vnsDistId, court: subCourtVns[0]?.id || null, level: sessionsLevelId }
    ];

    for (const mapping of caseHierarchyMappings) {
      await connection.query(
        `UPDATE cases 
         SET state_ut_id = ?, high_court_id = ?, bench_id = ?, district_id = ?, subordinate_court_id = ?, court_level_id = ?
         WHERE id = ?`,
        [mapping.state, mapping.hc, mapping.bench, mapping.dist, mapping.court, mapping.level, mapping.id]
      );
    }
    console.log('  -> Updated seed cases with accurate judiciary hierarchy values.');

    console.log('=== Indian Judiciary Hierarchy Seeding Complete! ===');
  } catch (err) {
    console.error('Hierarchy seeding failed:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedHierarchy();
