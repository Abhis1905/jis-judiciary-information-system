'use strict';

const db = require('../config/db');

class Hierarchy {
  // 1. Get all States & UTs
  static async getAllStates() {
    const [rows] = await db.query(
      'SELECT id, code, name, type FROM states_uts ORDER BY name ASC'
    );
    return rows;
  }

  // 2. Get all High Courts
  static async getAllHighCourts() {
    const [rows] = await db.query(
      'SELECT id, code, name, established_year, principal_seat_city FROM high_courts ORDER BY name ASC'
    );
    return rows;
  }

  // 3. Get High Courts with jurisdiction over a specific state/UT
  static async getHighCourtsByState(stateUtId) {
    const [rows] = await db.query(
      `SELECT hc.id, hc.code, hc.name, hc.established_year, hc.principal_seat_city, hcj.is_primary
       FROM high_courts hc
       JOIN high_court_jurisdictions hcj ON hc.id = hcj.high_court_id
       WHERE hcj.state_ut_id = ?
       ORDER BY hcj.is_primary DESC, hc.name ASC`,
      [stateUtId]
    );
    return rows;
  }

  // 4. Get Benches for a High Court
  static async getBenchesByHighCourt(highCourtId) {
    const [rows] = await db.query(
      `SELECT id, high_court_id, bench_name, bench_type, city
       FROM high_court_benches
       WHERE high_court_id = ?
       ORDER BY FIELD(bench_type, 'Principal Seat', 'Permanent Bench', 'Circuit Bench'), bench_name ASC`,
      [highCourtId]
    );
    return rows;
  }

  // 5. Get Districts by State and optionally Bench / High Court / District ID
  static async getDistricts({ stateUtId, highCourtId, benchId, districtId } = {}) {
    let sql = `SELECT d.id, d.state_ut_id, d.high_court_id, d.bench_id, d.district_code, d.district_name, d.headquarters,
                      s.name AS state_name, hc.name AS high_court_name, b.bench_name
               FROM districts d
               JOIN states_uts s ON d.state_ut_id = s.id
               JOIN high_courts hc ON d.high_court_id = hc.id
               JOIN high_court_benches b ON d.bench_id = b.id
               WHERE 1=1`;
    const params = [];

    if (stateUtId) {
      sql += ' AND d.state_ut_id = ?';
      params.push(stateUtId);
    }
    if (highCourtId) {
      sql += ' AND d.high_court_id = ?';
      params.push(highCourtId);
    }
    if (districtId) {
      sql += ' AND d.id = ?';
      params.push(districtId);
    }
    if (benchId) {
      sql += ' AND d.bench_id = ?';
      params.push(benchId);
    }

    sql += ' ORDER BY d.district_name ASC';
    const [rows] = await db.query(sql, params);
    return rows;
  }

  // 6. Get all Court Levels
  static async getCourtLevels() {
    const [rows] = await db.query(
      `SELECT id, level_code, level_name, tier_order, category, description
       FROM court_levels
       ORDER BY tier_order ASC`
    );
    return rows;
  }

  // 7. Get Subordinate Courts by District and/or Level
  static async getSubordinateCourts({ districtId, courtLevelId }) {
    let sql = `SELECT sc.id, sc.district_id, sc.court_level_id, sc.court_name, sc.court_type, sc.location,
                      cl.level_name, cl.tier_order, cl.category
               FROM subordinate_courts sc
               JOIN court_levels cl ON sc.court_level_id = cl.id
               WHERE 1=1`;
    const params = [];

    if (districtId) {
      sql += ' AND sc.district_id = ?';
      params.push(districtId);
    }
    if (courtLevelId) {
      sql += ' AND sc.court_level_id = ?';
      params.push(courtLevelId);
    }

    sql += ' ORDER BY cl.tier_order ASC, sc.court_name ASC';
    const [rows] = await db.query(sql, params);
    return rows;
  }

  // 8. Get Appellate Paths for a specific case category and starting level
  static async getAppellatePaths(caseCategory, fromLevelId = null) {
    let sql = `SELECT ap.id, ap.case_category, ap.from_level_id, ap.to_level_id, ap.appeal_type, ap.governing_statute, ap.description,
                      fl.level_name AS from_level_name, fl.tier_order AS from_tier, fl.category AS from_category,
                      tl.level_name AS to_level_name, tl.tier_order AS to_tier, tl.category AS to_category
               FROM appellate_paths ap
               JOIN court_levels fl ON ap.from_level_id = fl.id
               JOIN court_levels tl ON ap.to_level_id = tl.id
               WHERE ap.case_category = ?`;
    const params = [caseCategory];

    if (fromLevelId) {
      sql += ' AND ap.from_level_id = ?';
      params.push(fromLevelId);
    }

    sql += ' ORDER BY fl.tier_order DESC, tl.tier_order DESC';
    const [rows] = await db.query(sql, params);
    return rows;
  }

  // 9. Get Full Sequential Appellate Chain from any starting court level up to Apex Court
  static async getFullAppellateChain(caseCategory, startLevelId) {
    if (!caseCategory) caseCategory = 'Civil';
    
    // If no startLevelId is passed, default to District & Sessions level (tier 3)
    let currentLevelId = startLevelId;
    if (!currentLevelId) {
      const [defaultLevel] = await db.query(
        `SELECT id FROM court_levels WHERE level_code = 'LEVEL_DISTRICT_SESSIONS' LIMIT 1`
      );
      currentLevelId = defaultLevel[0]?.id;
    }

    const chain = [];
    let visited = new Set();

    while (currentLevelId && !visited.has(currentLevelId)) {
      visited.add(currentLevelId);
      const [nextStep] = await db.query(
        `SELECT ap.id, ap.case_category, ap.from_level_id, ap.to_level_id, ap.appeal_type, ap.governing_statute, ap.description,
                fl.level_name AS from_level_name, fl.tier_order AS from_tier, fl.category AS from_category,
                tl.level_name AS to_level_name, tl.tier_order AS to_tier, tl.category AS to_category
         FROM appellate_paths ap
         JOIN court_levels fl ON ap.from_level_id = fl.id
         JOIN court_levels tl ON ap.to_level_id = tl.id
         WHERE ap.case_category = ? AND ap.from_level_id = ?
         LIMIT 1`,
        [caseCategory, currentLevelId]
      );

      if (nextStep.length > 0) {
        chain.push(nextStep[0]);
        currentLevelId = nextStep[0].to_level_id;
      } else {
        break;
      }
    }

    return chain;
  }

  // 10. Logical Consistency Validation for Hierarchy Selections
  static async validateHierarchySelection({ stateUtId, highCourtId, benchId, districtId, subordinateCourtId, courtLevelId, caseType }) {
    // Validate State & High Court mapping
    if (stateUtId && highCourtId) {
      const [jurisdiction] = await db.query(
        `SELECT id FROM high_court_jurisdictions WHERE high_court_id = ? AND state_ut_id = ? LIMIT 1`,
        [highCourtId, stateUtId]
      );
      if (jurisdiction.length === 0) {
        return {
          isValid: false,
          error: 'The selected High Court does not exercise judicial jurisdiction over the chosen State/UT.'
        };
      }
    }

    // Validate High Court & Bench mapping
    if (highCourtId && benchId) {
      const [benches] = await db.query(
        `SELECT id FROM high_court_benches WHERE id = ? AND high_court_id = ? LIMIT 1`,
        [benchId, highCourtId]
      );
      if (benches.length === 0) {
        return {
          isValid: false,
          error: 'The selected Bench / Seat does not belong to the chosen High Court.'
        };
      }
    }

    // Validate District consistency
    if (districtId) {
      const [districts] = await db.query(
        `SELECT id, state_ut_id, high_court_id, bench_id, district_name FROM districts WHERE id = ? LIMIT 1`,
        [districtId]
      );
      if (districts.length === 0) {
        return {
          isValid: false,
          error: 'Selected Judicial District does not exist.'
        };
      }
      const dist = districts[0];
      if (stateUtId && dist.state_ut_id !== Number(stateUtId)) {
        return {
          isValid: false,
          error: `District '${dist.district_name}' does not belong to the selected State/UT.`
        };
      }
      if (highCourtId && dist.high_court_id !== Number(highCourtId)) {
        return {
          isValid: false,
          error: `District '${dist.district_name}' is not under the jurisdiction of the selected High Court.`
        };
      }
      if (benchId && dist.bench_id !== Number(benchId)) {
        return {
          isValid: false,
          error: `District '${dist.district_name}' is not assigned to the selected High Court Bench / Seat.`
        };
      }
    }

    // Validate Subordinate Court consistency
    if (subordinateCourtId) {
      const [subCourts] = await db.query(
        `SELECT id, district_id, court_level_id, court_name FROM subordinate_courts WHERE id = ? LIMIT 1`,
        [subordinateCourtId]
      );
      if (subCourts.length === 0) {
        return {
          isValid: false,
          error: 'Selected Subordinate Court establishment does not exist.'
        };
      }
      const sub = subCourts[0];
      if (districtId && sub.district_id !== Number(districtId)) {
        return {
          isValid: false,
          error: `Subordinate Court '${sub.court_name}' does not belong to the selected District.`
        };
      }
      if (courtLevelId && sub.court_level_id !== Number(courtLevelId)) {
        return {
          isValid: false,
          error: `Subordinate Court '${sub.court_name}' tier does not match the chosen Court Level.`
        };
      }
    }

    // Validate Court Level
    if (courtLevelId) {
      const [levels] = await db.query(
        `SELECT id, level_code, level_name FROM court_levels WHERE id = ? LIMIT 1`,
        [courtLevelId]
      );
      if (levels.length === 0) {
        return {
          isValid: false,
          error: 'Selected Court Tier / Level does not exist.'
        };
      }
    }

    // Validate Case Type for Statutory Appellate Pathway
    if (caseType) {
      const validCategories = ['Civil', 'Criminal', 'Constitutional', 'Family', 'Commercial'];
      if (!validCategories.includes(caseType)) {
        return {
          isValid: false,
          error: `Invalid case type '${caseType}'. Must be one of: ${validCategories.join(', ')}.`
        };
      }
    }

    return { isValid: true };
  }
}

module.exports = Hierarchy;
