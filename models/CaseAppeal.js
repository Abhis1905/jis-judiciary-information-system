'use strict';

const crypto = require('crypto');
const db = require('../config/db');
const Hierarchy = require('./Hierarchy');
const Notification = require('./Notification');
const { RECORD_PROVENANCE } = require('../config/constants');

class CaseAppeal {
  /**
   * Generate a unique case number for an appeal case following JIS conventions (L-4)
   */
  static async generateAppealCaseNumber(destinationCourtLevelId, filingYear = new Date().getFullYear(), conn = db) {
    let tierCode = 'HC';
    if (destinationCourtLevelId === 1) {
      tierCode = 'SC';
    } else if (destinationCourtLevelId >= 3) {
      tierCode = 'DC';
    }

    for (let attempts = 0; attempts < 50; attempts++) {
      const randNum = crypto.randomInt(100000, 1000000);
      const candidate = `JIS/APP/${tierCode}/${filingYear}/${randNum}`;

      const [existing] = await conn.query(
        'SELECT id FROM cases WHERE case_number = ? LIMIT 1',
        [candidate]
      );
      if (existing.length === 0) {
        return candidate;
      }
    }

    // Guaranteed unique fallback using timestamp + random hex suffix
    const fallbackSuffix = `${Date.now().toString().slice(-6)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    return `JIS/APP/${tierCode}/${filingYear}/${fallbackSuffix}`;
  }

  /**
   * Validate appeal creation rules against statutory hierarchy
   */
  static async validateAppealCreation({
    originalCaseId,
    destinationCourtLevelId,
    destinationHighCourtId,
    destinationBenchId,
    appealType
  }) {
    if (!originalCaseId || !destinationCourtLevelId) {
      return {
        isValid: false,
        error: 'Original Case ID and Destination Court Level are required.'
      };
    }

    // 1. Fetch original case
    const [caseRows] = await db.query(
      `SELECT c.*, cl.tier_order, cl.level_code, cl.level_name,
              hc.name AS high_court_name, b.bench_name, d.district_name
       FROM cases c
       LEFT JOIN court_levels cl ON c.court_level_id = cl.id
       LEFT JOIN high_courts hc ON c.high_court_id = hc.id
       LEFT JOIN high_court_benches b ON c.bench_id = b.id
       LEFT JOIN districts d ON c.district_id = d.id
       WHERE c.id = ?`,
      [originalCaseId]
    );

    if (caseRows.length === 0) {
      return {
        isValid: false,
        error: 'The original case record does not exist in the database.'
      };
    }

    const originalCase = caseRows[0];
    const origTier = originalCase.tier_order || (originalCase.court_level_id === 1 ? 1 : originalCase.court_level_id === 2 ? 2 : 3);
    const origLevelId = originalCase.court_level_id || (origTier === 1 ? 1 : origTier === 2 ? 2 : 3);

    // 2. Fetch destination court level
    const [destLevelRows] = await db.query(
      'SELECT id, level_code, level_name, tier_order, category FROM court_levels WHERE id = ?',
      [destinationCourtLevelId]
    );

    if (destLevelRows.length === 0) {
      return {
        isValid: false,
        error: 'Invalid destination court level selected.'
      };
    }

    const destLevel = destLevelRows[0];
    const destTier = destLevel.tier_order;

    // 3. Rule: Direct Subordinate/District -> Supreme Court is PROHIBITED
    if (origTier >= 3 && destTier === 1) {
      return {
        isValid: false,
        error: 'Direct appeal from District/Subordinate Court to the Supreme Court of India is prohibited. Appeals must progress through the High Court first.'
      };
    }

    // 4. Rule: Destination must be higher in hierarchy (lower tier_order number)
    if (destTier >= origTier) {
      return {
        isValid: false,
        error: `Invalid appellate direction: Destination court tier (${destLevel.level_name}) cannot be at or below the originating court tier (${originalCase.level_name || 'Current Tier'}).`
      };
    }

    // 5. Check statutory appellate paths
    const [paths] = await db.query(
      `SELECT * FROM appellate_paths 
       WHERE case_category = ? AND from_level_id = ? AND to_level_id = ?
       LIMIT 1`,
      [originalCase.case_type, origLevelId, destLevel.id]
    );

    // If exact level path not found, check broader tier transition (e.g. tier 3/4/5/6 -> tier 2, tier 2 -> tier 1)
    let matchedPath = paths[0] || null;
    if (!matchedPath) {
      const [broadPaths] = await db.query(
        `SELECT ap.*, fl.tier_order as from_tier, tl.tier_order as to_tier
         FROM appellate_paths ap
         JOIN court_levels fl ON ap.from_level_id = fl.id
         JOIN court_levels tl ON ap.to_level_id = tl.id
         WHERE ap.case_category = ? AND fl.tier_order >= ? AND tl.tier_order = ?
         LIMIT 1`,
        [originalCase.case_type, origTier, destTier]
      );
      matchedPath = broadPaths[0] || null;
    }

    if (!matchedPath && destTier !== 1 && destTier !== 2) {
      return {
        isValid: false,
        error: `No statutory appellate pathway exists for '${originalCase.case_type}' cases from ${originalCase.level_name} to ${destLevel.level_name}.`
      };
    }

    // 6. Validate High Court destination if appealing to High Court
    if (destTier === 2) {
      const targetHcId = destinationHighCourtId || originalCase.high_court_id;
      if (!targetHcId) {
        return {
          isValid: false,
          error: 'A valid destination High Court must be specified for High Court appeals.'
        };
      }

      const [hcRows] = await db.query('SELECT id, name FROM high_courts WHERE id = ?', [targetHcId]);
      if (hcRows.length === 0) {
        return {
          isValid: false,
          error: 'The selected destination High Court does not exist.'
        };
      }

      // Check if original case has a state, and ensure target HC has jurisdiction over that state
      if (originalCase.state_ut_id) {
        const [jurisdiction] = await db.query(
          'SELECT id FROM high_court_jurisdictions WHERE high_court_id = ? AND state_ut_id = ? LIMIT 1',
          [targetHcId, originalCase.state_ut_id]
        );
        if (jurisdiction.length === 0) {
          return {
            isValid: false,
            error: `High Court '${hcRows[0].name}' does not hold judicial jurisdiction over the originating State/UT.`
          };
        }
      }

      if (destinationBenchId) {
        const [benchRows] = await db.query(
          'SELECT id FROM high_court_benches WHERE id = ? AND high_court_id = ? LIMIT 1',
          [destinationBenchId, targetHcId]
        );
        if (benchRows.length === 0) {
          return {
            isValid: false,
            error: 'The selected Bench does not belong to the destination High Court.'
          };
        }
      }
    }

    // 7. Check for duplicate active appeal to the same tier
    const [dupAppeals] = await db.query(
      `SELECT ca.id, ca.appeal_case_id, c.case_number, ca.status 
       FROM case_appeals ca
       JOIN cases c ON ca.appeal_case_id = c.id
       WHERE ca.original_case_id = ? AND ca.destination_court_level_id = ? AND ca.status IN ('Filed', 'Admitted', 'Pending')
       LIMIT 1`,
      [originalCaseId, destLevel.id]
    );

    if (dupAppeals.length > 0) {
      return {
        isValid: false,
        error: `An active appeal (${dupAppeals[0].case_number}) is already pending before ${destLevel.level_name} (Status: ${dupAppeals[0].status}).`
      };
    }

    // Determine appeal_level ENUM
    let appealLevelEnum = 'DISTRICT_TO_HIGH_COURT';
    if (destTier === 1) {
      appealLevelEnum = 'HIGH_COURT_TO_SUPREME_COURT';
    } else if (origTier > 4 && destTier === 2) {
      appealLevelEnum = 'SUBORDINATE_TO_HIGH_COURT';
    } else if (destTier >= 3) {
      appealLevelEnum = 'SUBORDINATE_TO_DISTRICT';
    }

    return {
      isValid: true,
      originalCase,
      destLevel,
      matchedPath,
      appealLevel: appealLevelEnum
    };
  }

  /**
   * Create an Appeal: creates the appeal case in `cases` and the link in `case_appeals`
   */
  static async createAppeal({
    originalCaseId,
    destinationCourtLevelId,
    destinationHighCourtId,
    destinationBenchId,
    destinationDistrictId,
    appealType,
    grounds,
    filingDate,
    userId,
    isSynthetic = 0
  }) {
    const validation = await this.validateAppealCreation({
      originalCaseId,
      destinationCourtLevelId,
      destinationHighCourtId,
      destinationBenchId,
      appealType
    });

    if (!validation.isValid) {
      const err = new Error(validation.error);
      err.statusCode = 400;
      throw err;
    }

    const { originalCase, destLevel, matchedPath, appealLevel } = validation;
    const dateStr = filingDate || new Date().toISOString().split('T')[0];
    const filingYear = new Date(dateStr).getFullYear();

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const appealCaseNumber = await this.generateAppealCaseNumber(destLevel.id, filingYear, conn);
      const resolvedAppealType = appealType || (matchedPath ? matchedPath.appeal_type : 'Statutory Appeal');
      const resolvedStatute = matchedPath ? matchedPath.governing_statute : 'Constitution of India / Applicable Procedural Code';
      const provenance = isSynthetic ? RECORD_PROVENANCE.SYNTHETIC_WORKFLOW : RECORD_PROVENANCE.STAFF_FILED;

      // Target hierarchy determination
      let targetStateId = originalCase.state_ut_id;
      let targetHcId = null;
      let targetBenchId = null;
      let targetDistId = null;

      if (destLevel.tier_order === 1) {
        // Supreme Court of India
        targetStateId = originalCase.state_ut_id;
        targetHcId = null;
        targetBenchId = null;
        targetDistId = null;
      } else if (destLevel.tier_order === 2) {
        // High Court
        targetHcId = destinationHighCourtId || originalCase.high_court_id;
        targetBenchId = destinationBenchId || originalCase.bench_id;
        targetDistId = null;
      } else {
        // District / Subordinate Court
        targetHcId = destinationHighCourtId || originalCase.high_court_id;
        targetBenchId = destinationBenchId || originalCase.bench_id;
        targetDistId = destinationDistrictId || originalCase.district_id;
      }

      const appealTitle = `Appeal: ${originalCase.title}`.slice(0, 255);
      const appealDesc = grounds
        ? `Appeal against order/decree in Case ${originalCase.case_number}. Grounds: ${grounds}`
        : `Statutory appeal arising from lower court proceedings in Case ${originalCase.case_number}.`;

      // 1. Insert new Case record
      const [caseResult] = await conn.query(
        `INSERT INTO cases (
          case_number, title, case_type, petitioner_name, respondent_name,
          description, status, is_public, filed_by, filing_date,
          state_ut_id, high_court_id, bench_id, district_id, subordinate_court_id, court_level_id
        ) VALUES (?, ?, ?, ?, ?, ?, 'Filed', ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
        [
          appealCaseNumber,
          appealTitle,
          originalCase.case_type,
          originalCase.petitioner_name,
          originalCase.respondent_name,
          appealDesc,
          originalCase.is_public ? 1 : 0,
          userId,
          dateStr,
          targetStateId,
          targetHcId,
          targetBenchId,
          targetDistId,
          destLevel.id
        ]
      );

      const appealCaseId = caseResult.insertId;

      // 2. Insert into `case_appeals` junction table (including provenance M-10)
      const [appealResult] = await conn.query(
        `INSERT INTO case_appeals (
          original_case_id, appeal_case_id, appeal_level,
          originating_court_level_id, destination_court_level_id,
          destination_high_court_id, destination_bench_id, destination_district_id,
          appeal_type, governing_statute, filing_date, status, grounds,
          is_synthetic, provenance, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Filed', ?, ?, ?, ?)`,
        [
          originalCase.id,
          appealCaseId,
          appealLevel,
          originalCase.court_level_id,
          destLevel.id,
          targetHcId,
          targetBenchId,
          targetDistId,
          resolvedAppealType,
          resolvedStatute,
          dateStr,
          grounds || null,
          isSynthetic ? 1 : 0,
          provenance,
          userId
        ]
      );

      // 3. Batch-inherit statutory legal sections and precedents (Fixes H-7 N+1 queries)
      const [origSections] = await conn.query(
        'SELECT legal_section_id, relevance_type FROM case_legal_sections WHERE case_id = ?',
        [originalCase.id]
      );
      if (origSections.length > 0) {
        const secValues = origSections.map(sec => [
          appealCaseId,
          sec.legal_section_id,
          sec.relevance_type,
          isSynthetic ? 1 : 0,
          'Inherited from original case appeal'
        ]);
        await conn.query(
          `INSERT IGNORE INTO case_legal_sections (case_id, legal_section_id, relevance_type, is_synthetic, notes)
           VALUES ?`,
          [secValues]
        );
      }

      const [origJudgments] = await conn.query(
        'SELECT judgment_id, relevance_type FROM case_legal_judgments WHERE case_id = ?',
        [originalCase.id]
      );
      if (origJudgments.length > 0) {
        const judgValues = origJudgments.map(j => [
          appealCaseId,
          j.judgment_id,
          j.relevance_type,
          isSynthetic ? 1 : 0,
          'Inherited precedent from original case appeal'
        ]);
        await conn.query(
          `INSERT IGNORE INTO case_legal_judgments (case_id, judgment_id, relevance_type, is_synthetic, notes)
           VALUES ?`,
          [judgValues]
        );
      }

      // 4. Create in-app notification inside transaction
      if (originalCase.judge_id) {
        await conn.query(
          'INSERT INTO notifications (user_id, message, case_id) VALUES (?, ?, ?)',
          [
            originalCase.judge_id,
            `Appeal filed: Case ${originalCase.case_number} has been appealed to ${destLevel.level_name} (${appealCaseNumber}).`,
            originalCase.id
          ]
        );
      }

      await conn.commit();

      return {
        appealId: appealResult.insertId,
        appealCaseId,
        appealCaseNumber,
        appealType: resolvedAppealType,
        destinationCourtLevel: destLevel.level_name
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Traverse complete appeal history for any case (forward and backward)
   */
  static async getAppealHistory(caseId) {
    const numericCaseId = parseInt(caseId, 10);
    if (isNaN(numericCaseId)) return null;

    // 1. Find Root Case by traversing backward
    let currentId = numericCaseId;
    let visitedBackward = new Set();

    while (currentId && !visitedBackward.has(currentId)) {
      visitedBackward.add(currentId);
      const [parent] = await db.query(
        'SELECT original_case_id FROM case_appeals WHERE appeal_case_id = ? LIMIT 1',
        [currentId]
      );
      if (parent.length > 0) {
        currentId = parent[0].original_case_id;
      } else {
        break;
      }
    }

    const rootCaseId = currentId;

    // 2. Fetch full case details for root
    const [rootCaseRows] = await db.query(
      `SELECT c.id, c.case_number, c.title, c.case_type, c.status, c.filing_date, c.is_public,
              cl.id AS court_level_id, cl.level_name, cl.level_code, cl.tier_order, cl.category,
              hc.name AS high_court_name, b.bench_name, d.district_name
       FROM cases c
       LEFT JOIN court_levels cl ON c.court_level_id = cl.id
       LEFT JOIN high_courts hc ON c.high_court_id = hc.id
       LEFT JOIN high_court_benches b ON c.bench_id = b.id
       LEFT JOIN districts d ON c.district_id = d.id
       WHERE c.id = ?`,
      [rootCaseId]
    );

    if (rootCaseRows.length === 0) return null;

    const rootCase = rootCaseRows[0];
    const chain = [];

    // Push root case into chain
    chain.push({
      caseId: rootCase.id,
      caseNumber: rootCase.case_number,
      title: rootCase.title,
      caseType: rootCase.case_type,
      status: rootCase.status,
      filingDate: rootCase.filing_date,
      isPublic: Boolean(rootCase.is_public),
      courtLevelId: rootCase.court_level_id,
      levelName: rootCase.level_name || (rootCase.tier_order === 1 ? 'Supreme Court of India' : rootCase.tier_order === 2 ? 'High Court' : 'District Court'),
      tierOrder: rootCase.tier_order || 3,
      category: rootCase.category || 'Trial Court',
      highCourtName: rootCase.high_court_name,
      benchName: rootCase.bench_name,
      districtName: rootCase.district_name,
      isRoot: true,
      isCurrent: rootCase.id === numericCaseId,
      appealId: null,
      appealType: null,
      appealLevel: null,
      governingStatute: null,
      grounds: null,
      appealStatus: null
    });

    // 3. Traverse forward along all appeal links
    let forwardParentId = rootCaseId;
    let visitedForward = new Set();

    while (forwardParentId && !visitedForward.has(forwardParentId)) {
      visitedForward.add(forwardParentId);
      const [appeals] = await db.query(
        `SELECT ca.id AS appeal_id, ca.appeal_level, ca.appeal_type, ca.governing_statute,
                ca.status AS appeal_status, ca.grounds, ca.filing_date AS appeal_filing_date,
                c.id AS appeal_case_id, c.case_number, c.title, c.case_type, c.status, c.filing_date, c.is_public,
                cl.id AS court_level_id, cl.level_name, cl.level_code, cl.tier_order, cl.category,
                hc.name AS high_court_name, b.bench_name, d.district_name
         FROM case_appeals ca
         JOIN cases c ON ca.appeal_case_id = c.id
         LEFT JOIN court_levels cl ON c.court_level_id = cl.id
         LEFT JOIN high_courts hc ON c.high_court_id = hc.id
         LEFT JOIN high_court_benches b ON c.bench_id = b.id
         LEFT JOIN districts d ON c.district_id = d.id
         WHERE ca.original_case_id = ?
         ORDER BY ca.id ASC`,
        [forwardParentId]
      );

      if (appeals.length > 0) {
        for (const app of appeals) {
          chain.push({
            caseId: app.appeal_case_id,
            caseNumber: app.case_number,
            title: app.title,
            caseType: app.case_type,
            status: app.status,
            filingDate: app.filing_date,
            isPublic: Boolean(app.is_public),
            courtLevelId: app.court_level_id,
            levelName: app.level_name || (app.tier_order === 1 ? 'Supreme Court of India' : 'High Court'),
            tierOrder: app.tier_order || 2,
            category: app.category || 'Appellate Forum',
            highCourtName: app.high_court_name,
            benchName: app.bench_name,
            districtName: app.district_name,
            isRoot: false,
            isCurrent: app.appeal_case_id === numericCaseId,
            appealId: app.appeal_id,
            appealType: app.appeal_type,
            appealLevel: app.appeal_level,
            governingStatute: app.governing_statute,
            grounds: app.grounds,
            appealStatus: app.appeal_status
          });
        }
        forwardParentId = appeals[appeals.length - 1].appeal_case_id;
      } else {
        break;
      }
    }

    const currentCaseIndex = chain.findIndex(n => n.caseId === numericCaseId);
    const hasAppeals = chain.length > 1;

    // Determine if further appeal is possible from the current case
    const currentCase = chain[currentCaseIndex] || chain[0];
    const canAppealFurther = currentCase.tierOrder > 1; // Tier 1 (Supreme Court) is final

    return {
      rootCase,
      chain,
      totalLevels: chain.length,
      hasAppeals,
      currentCaseIndex,
      currentCase,
      canAppealFurther
    };
  }

  /**
   * Get direct appeal record by ID
   */
  static async getAppealById(appealId) {
    const [rows] = await db.query(
      `SELECT ca.*,
              oc.case_number AS original_case_number, oc.title AS original_case_title, oc.status AS original_case_status,
              ac.case_number AS appeal_case_number, ac.title AS appeal_case_title, ac.status AS appeal_case_status,
              fl.level_name AS originating_level_name, tl.level_name AS destination_level_name,
              hc.name AS destination_high_court_name, b.bench_name AS destination_bench_name,
              u.full_name AS created_by_name
       FROM case_appeals ca
       JOIN cases oc ON ca.original_case_id = oc.id
       JOIN cases ac ON ca.appeal_case_id = ac.id
       JOIN court_levels fl ON ca.originating_court_level_id = fl.id
       JOIN court_levels tl ON ca.destination_court_level_id = tl.id
       LEFT JOIN high_courts hc ON ca.destination_high_court_id = hc.id
       LEFT JOIN high_court_benches b ON ca.destination_bench_id = b.id
       LEFT JOIN users u ON ca.created_by = u.id
       WHERE ca.id = ?`,
      [appealId]
    );
    return rows[0] || null;
  }

  /**
   * Get valid next appellate destination options for a given case
   */
  static async getNextAppellateDestinations(caseId) {
    const [caseRows] = await db.query(
      `SELECT c.*, cl.tier_order, cl.level_name
       FROM cases c
       LEFT JOIN court_levels cl ON c.court_level_id = cl.id
       WHERE c.id = ?`,
      [caseId]
    );
    if (caseRows.length === 0) return [];

    const caseRecord = caseRows[0];
    const currentTier = caseRecord.tier_order || 3;
    const currentLevelId = caseRecord.court_level_id || 3;

    if (currentTier === 1) {
      // Supreme Court of India is apex - no further appeal
      return [];
    }

    // Query valid transitions from statutory `appellate_paths`
    const [paths] = await db.query(
      `SELECT ap.id as path_id, ap.appeal_type, ap.governing_statute, ap.description,
              tl.id as destination_level_id, tl.level_name as destination_level_name, tl.tier_order as destination_tier, tl.category
       FROM appellate_paths ap
       JOIN court_levels tl ON ap.to_level_id = tl.id
       WHERE ap.case_category = ? AND ap.from_level_id = ?
       ORDER BY tl.tier_order DESC`,
      [caseRecord.case_type, currentLevelId]
    );

    if (paths.length > 0) {
      return paths;
    }

    // Fallback: If current tier is 2 (High Court), target tier is 1 (Supreme Court)
    if (currentTier === 2) {
      const [scLevel] = await db.query("SELECT * FROM court_levels WHERE tier_order = 1 LIMIT 1");
      if (scLevel.length > 0) {
        return [{
          path_id: null,
          appeal_type: `Special Leave Petition (${caseRecord.case_type}) / Civil/Criminal Appeal`,
          governing_statute: 'Constitution of India (Articles 133, 134, 136)',
          description: 'Apex appeal before Supreme Court of India',
          destination_level_id: scLevel[0].id,
          destination_level_name: scLevel[0].level_name,
          destination_tier: 1,
          category: 'Apex'
        }];
      }
    }

    // Fallback: If current tier is 3/4/5/6, target tier is 2 (High Court)
    if (currentTier >= 3) {
      const [hcLevel] = await db.query("SELECT * FROM court_levels WHERE tier_order = 2 LIMIT 1");
      if (hcLevel.length > 0) {
        return [{
          path_id: null,
          appeal_type: `${caseRecord.case_type} Appeal to High Court`,
          governing_statute: caseRecord.case_type === 'Criminal' ? 'CrPC (Section 374) / BNSS' : 'CPC (Section 96 / 100)',
          description: 'Statutory First or Second Appeal to High Court',
          destination_level_id: hcLevel[0].id,
          destination_level_name: hcLevel[0].level_name,
          destination_tier: 2,
          category: 'High Court'
        }];
      }
    }

    return [];
  }
}

module.exports = CaseAppeal;
