'use strict';

const fs = require('fs');
const path = require('path');
const LegalAct = require('../models/LegalAct');
const LegalSection = require('../models/LegalSection');
const LegalJudgment = require('../models/LegalJudgment');
const LegalCategory = require('../models/LegalCategory');
const CaseLegalIntegration = require('../models/CaseLegalIntegration');
const db = require('../config/db');

class LegalController {
  // 1. Legal Dashboard / Main Portal
  static async index(req, res, next) {
    try {
      const [
        stats,
        acts,
        recentLandmarks,
        recentVerifiedJudgments,
        scPreview,
        hcPreview,
        categories,
        integratedStats,
        domainRows,
        yearRows,
        featuredSections
      ] = await Promise.all([
        LegalAct.getStats(),
        LegalAct.getAll(),
        LegalJudgment.getRecentLandmarks(6),
        LegalJudgment.getRecentVerifiedJudgments(6),
        LegalJudgment.getSupremeCourtJudgments({ limit: 4 }),
        LegalJudgment.getHighCourtJudgments({ limit: 4 }),
        LegalCategory.getAll(),
        CaseLegalIntegration.getIntegratedStats(),
        db.query(
          `SELECT DISTINCT domain FROM legal_judgments
           WHERE is_synthetic = 0 AND record_provenance = 'REAL_VERIFIED'
           ORDER BY domain ASC`
        ),
        db.query(
          `SELECT DISTINCT YEAR(judgment_date) AS yr FROM legal_judgments
           WHERE is_synthetic = 0 AND record_provenance = 'REAL_VERIFIED'
           ORDER BY yr DESC`
        ),
        db.query(
          `SELECT ls.id, ls.section_number, ls.section_title, ls.legal_nature, ls.status,
                  la.act_code, la.short_title AS act_short_title
           FROM legal_sections ls
           JOIN legal_acts la ON ls.act_id = la.id
           WHERE (la.act_code = 'CONST_1950' AND ls.section_number IN ('Art 14', 'Art 19', 'Art 21', 'Art 32', 'Art 226', 'Art 368'))
              OR (la.act_code = 'IPC_1860' AND ls.section_number IN ('302', '420', '498A'))
              OR (la.act_code = 'BNS_2023' AND ls.section_number IN ('103', '318', '85'))
              OR (la.act_code = 'CRPC_1973' AND ls.section_number IN ('41A', '154', '438', '482'))
              OR (la.act_code = 'BNSS_2023' AND ls.section_number IN ('35', '173', '482', '528'))
              OR (la.act_code = 'IEA_1872' AND ls.section_number IN ('27', '65B'))
              OR (la.act_code = 'BSA_2023' AND ls.section_number IN ('23', '63'))
           ORDER BY la.id ASC, ls.section_order ASC
           LIMIT 12`
        )
      ]);

      res.render('legal/index', {
        title: 'Legal Knowledge Repository | JIS',
        stats,
        acts,
        recentLandmarks,
        recentVerifiedJudgments,
        scJudgments: scPreview.judgments,
        hcJudgments: hcPreview.judgments,
        featuredSections: featuredSections[0],
        categories,
        integratedStats,
        domains: domainRows[0].map(d => d.domain),
        years: yearRows[0].map(y => y.yr),
        user: req.session.user || null
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Acts Explorer
  static async listActs(req, res, next) {
    try {
      const { status, search } = req.query;
      const acts = await LegalAct.getAll({ status, search });
      const stats = await LegalAct.getStats();

      res.render('legal/acts', {
        title: 'Statutory Acts & Codes | JIS Legal Repository',
        acts,
        stats,
        currentStatus: status || 'all',
        search: search || '',
        user: req.session.user || null
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Act Detail & Chapter Structure
  static async viewAct(req, res, next) {
    try {
      const actParam = req.params.id;
      let act = null;
      if (/^\d+$/.test(actParam)) {
        act = await LegalAct.getById(parseInt(actParam, 10));
      }
      if (!act) {
        act = await LegalAct.getByCode(actParam);
      }

      if (!act) {
        return res.status(404).render('errors/404', { title: 'Legal Act Not Found | JIS' });
      }

      const data = await LegalAct.getWithStructure(act.id);
      res.render('legal/actDetail', {
        title: `${data.act.short_title} Structure | JIS`,
        act: data.act,
        chapters: data.chapters,
        unassignedSections: data.unassignedSections,
        totalSections: data.totalSections,
        user: req.session.user || null
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. Section Detail (with reverse case navigation)
  static async viewSection(req, res, next) {
    try {
      const sectionId = req.params.id;
      const section = await LegalSection.getById(sectionId);

      if (!section) {
        return res.status(404).render('errors/404', { title: 'Legal Section Not Found | JIS' });
      }

      const page = parseInt(req.query.page || 1, 10);
      const [relations, procedural, categories, linkedJudgments, casePagination] = await Promise.all([
        LegalSection.getRelations(sectionId),
        LegalSection.getProceduralClassification(sectionId),
        LegalSection.getCategories(sectionId),
        LegalSection.getLinkedJudgments(sectionId),
        CaseLegalIntegration.getCasesForSection(sectionId, page, 10)
      ]);

      res.render('legal/sectionDetail', {
        title: `Section ${section.section_number} - ${section.act_short_title} | JIS`,
        section,
        relations,
        procedural,
        categories,
        linkedJudgments,
        casePagination,
        user: req.session.user || null
      });
    } catch (err) {
      next(err);
    }
  }

  // 5. Supreme Court Landmark Judgments (REAL_VERIFIED only)
  static async supremeCourtJudgments(req, res, next) {
    try {
      const { domain, year, search, pdf_only, page } = req.query;
      const result = await LegalJudgment.getSupremeCourtJudgments({
        domain, year, search, pdf_only, page
      });
      const stats = await LegalAct.getStats();

      const [years] = await db.query(
        `SELECT DISTINCT YEAR(judgment_date) as yr 
         FROM legal_judgments 
         WHERE court_tier = 'Supreme Court of India'
           AND is_synthetic = 0
           AND record_provenance = 'REAL_VERIFIED'
         ORDER BY yr DESC`
      );

      const [domains] = await db.query(
        `SELECT DISTINCT domain 
         FROM legal_judgments 
         WHERE court_tier = 'Supreme Court of India'
           AND is_synthetic = 0
           AND record_provenance = 'REAL_VERIFIED'
         ORDER BY domain ASC`
      );

      res.render('legal/supremeCourt', {
        title: 'Supreme Court Landmark Judgments | JIS',
        judgments: result.judgments,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        stats,
        years: years.map(y => y.yr),
        domains: domains.map(d => d.domain),
        currentDomain: domain || '',
        currentYear: year || '',
        currentPdfOnly: pdf_only || '',
        search: search || '',
        user: req.session.user || null
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. High Courts Judgments (REAL_VERIFIED only)
  static async highCourtJudgments(req, res, next) {
    try {
      const { high_court_id, domain, year, search, page } = req.query;
      const result = await LegalJudgment.getHighCourtJudgments({
        high_court_id, domain, year, search, page
      });
      const stats = await LegalAct.getStats();

      const [highCourts] = await db.query(
        `SELECT hc.id, hc.name, hc.code, hc.principal_seat_city,
                (SELECT COUNT(*) FROM legal_judgments lj
                 WHERE lj.high_court_id = hc.id AND lj.is_synthetic = 0 AND lj.record_provenance = 'REAL_VERIFIED') AS verified_count
         FROM high_courts hc
         ORDER BY verified_count DESC, hc.name ASC`
      );
      const [domains] = await db.query(
        `SELECT DISTINCT domain 
         FROM legal_judgments 
         WHERE court_tier = 'High Court'
           AND is_synthetic = 0
           AND record_provenance = 'REAL_VERIFIED'
         ORDER BY domain ASC`
      );
      const [years] = await db.query(
        `SELECT DISTINCT YEAR(judgment_date) as yr 
         FROM legal_judgments 
         WHERE court_tier = 'High Court'
           AND is_synthetic = 0
           AND record_provenance = 'REAL_VERIFIED'
         ORDER BY yr DESC`
      );

      res.render('legal/highCourts', {
        title: 'High Court Judgments | JIS',
        judgments: result.judgments,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        stats,
        highCourts,
        domains: domains.map(d => d.domain),
        years: years.map(y => y.yr),
        currentHcId: high_court_id || '',
        currentDomain: domain || '',
        currentYear: year || '',
        search: search || '',
        user: req.session.user || null
      });
    } catch (err) {
      next(err);
    }
  }

  // 7. Judgment Detail (REAL_VERIFIED only, with discussed provisions & verified PDF)
  static async viewJudgment(req, res, next) {
    try {
      const judgmentId = req.params.id;
      const judgment = await LegalJudgment.getById(judgmentId);

      if (!judgment) {
        return res.status(404).render('errors/404', {
          title: 'Judgment Not Found | JIS',
          message: 'This judgment record is not available in the verified public legal repository.'
        });
      }

      const page = parseInt(req.query.page || 1, 10);
      const [casePagination, discussedSections] = await Promise.all([
        CaseLegalIntegration.getCasesForJudgment(judgmentId, page, 10),
        CaseLegalIntegration.getSectionsForJudgment(judgmentId)
      ]);

      res.render('legal/judgmentDetail', {
        title: `${judgment.case_name} (${judgment.citation}) | JIS`,
        judgment,
        casePagination,
        discussedSections,
        user: req.session.user || null
      });
    } catch (err) {
      next(err);
    }
  }

  // 7b. Public-Safe Verified Judgment PDF Stream / Download
  static async downloadJudgmentPdf(req, res, next) {
    try {
      const judgmentId = parseInt(req.params.id, 10);
      if (isNaN(judgmentId) || judgmentId <= 0) {
        return res.status(404).render('errors/404', {
          title: 'Judgment Document Unavailable | JIS',
          message: 'Invalid judgment identifier.'
        });
      }

      const doc = await LegalJudgment.getVerifiedDocumentForJudgment(judgmentId);
      if (!doc || !doc.storage_path) {
        return res.status(404).render('errors/404', {
          title: 'Judgment Document Unavailable | JIS',
          message: 'A verified full-text PDF document is not yet archived on the local JIS server for this judgment.'
        });
      }

      const allowedDir = path.resolve(__dirname, '..', 'uploads', 'legal_judgments');
      const resolvedPath = path.resolve(__dirname, '..', doc.storage_path);

      // Strict path containment check — never expose arbitrary filesystem paths or staff uploads
      if (!resolvedPath.startsWith(allowedDir + path.sep) || !fs.existsSync(resolvedPath)) {
        return res.status(404).render('errors/404', {
          title: 'Judgment Document Unavailable | JIS',
          message: 'The verified judgment PDF file is currently unavailable on disk.'
        });
      }

      const stat = fs.statSync(resolvedPath);
      const safeFilename = path.basename(doc.original_filename || `Judgment_${judgmentId}.pdf`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const dispositionType = req.query.download === '1' ? 'attachment' : 'inline';

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `${dispositionType}; filename="${safeFilename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');

      const stream = fs.createReadStream(resolvedPath);
      stream.on('error', (err) => next(err));
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  // 8. Old ↔ New Law Cross-Reference Matrix
  static async mappingMatrix(req, res, next) {
    try {
      const { act_pair, relation_type, search } = req.query;
      const mappings = await LegalSection.getAllMappings({
        act_pair: act_pair || 'IPC_BNS',
        relation_type,
        search
      });

      res.render('legal/mapping', {
        title: 'Old ↔ New Criminal Law Cross-Reference Matrix | JIS',
        mappings,
        currentPair: act_pair || 'IPC_BNS',
        currentRelType: relation_type || '',
        search: search || '',
        user: req.session.user || null
      });
    } catch (err) {
      next(err);
    }
  }

  // 9. Categories / Taxonomy View
  static async listCategories(req, res, next) {
    try {
      const categories = await LegalCategory.getAll();
      res.render('legal/categories', {
        title: 'Legal Taxonomy & Subject Domains | JIS',
        categories,
        user: req.session.user || null
      });
    } catch (err) {
      next(err);
    }
  }

  // 10. Category Detail
  static async viewCategory(req, res, next) {
    try {
      const categoryId = req.params.id;
      const category = await LegalCategory.getById(categoryId);
      if (!category) {
        return res.status(404).render('errors/404', { title: 'Category Not Found | JIS' });
      }

      const sections = await LegalCategory.getSectionsByCategory(categoryId);
      res.render('legal/categoryDetail', {
        title: `${category.name} | Legal Taxonomy`,
        category,
        sections,
        user: req.session.user || null
      });
    } catch (err) {
      next(err);
    }
  }

  // 11. Universal Legal Search (supports query + filters on REAL_VERIFIED records)
  static async search(req, res, next) {
    try {
      const queryStr = (req.query.q || '').trim();
      const { court_tier, domain, year, landmark, pdf_only, page } = req.query;
      const hasCriteria = Boolean(queryStr || court_tier || domain || year || landmark || pdf_only);

      const [domainRows, yearRows] = await Promise.all([
        db.query(
          `SELECT DISTINCT domain FROM legal_judgments
           WHERE is_synthetic = 0 AND record_provenance = 'REAL_VERIFIED'
           ORDER BY domain ASC`
        ),
        db.query(
          `SELECT DISTINCT YEAR(judgment_date) AS yr FROM legal_judgments
           WHERE is_synthetic = 0 AND record_provenance = 'REAL_VERIFIED'
           ORDER BY yr DESC`
        )
      ]);

      if (!hasCriteria) {
        return res.render('legal/search', {
          title: 'Search Legal Knowledge Repository | JIS',
          query: '',
          filters: { court_tier: '', domain: '', year: '', landmark: '', pdf_only: '' },
          domains: domainRows[0].map(d => d.domain),
          years: yearRows[0].map(y => y.yr),
          results: null,
          user: req.session.user || null
        });
      }

      const results = await LegalJudgment.universalSearch(queryStr, {
        court_tier,
        domain,
        year,
        landmark,
        pdf_only,
        page
      });

      res.render('legal/search', {
        title: queryStr ? `Search: "${queryStr}" | JIS Legal Repository` : 'Filtered Judgments | JIS Legal Repository',
        query: queryStr,
        filters: {
          court_tier: court_tier || '',
          domain: domain || '',
          year: year || '',
          landmark: landmark || '',
          pdf_only: pdf_only || ''
        },
        domains: domainRows[0].map(d => d.domain),
        years: yearRows[0].map(y => y.yr),
        results,
        user: req.session.user || null
      });
    } catch (err) {
      next(err);
    }
  }

  // 12. API: Lookup Old/New Equivalent
  static async apiMappingLookup(req, res, next) {
    try {
      const { act, sec } = req.query;
      if (!act || !sec) {
        return res.status(400).json({ success: false, message: 'Both act and sec query parameters are required.' });
      }

      const section = await LegalSection.getByActAndNumber(act, sec);
      if (!section) {
        return res.status(404).json({ success: false, message: 'Section not found.' });
      }

      const relations = await LegalSection.getRelations(section.id);
      const procedural = await LegalSection.getProceduralClassification(section.id);

      return res.json({
        success: true,
        section,
        relations,
        procedural
      });
    } catch (err) {
      next(err);
    }
  }

  // 13. API: Get Sections for an Act
  static async apiGetActSections(req, res, next) {
    try {
      const actId = parseInt(req.params.id, 10);
      if (isNaN(actId)) {
        return res.status(400).json({ success: false, message: 'Invalid act ID parameter.' });
      }

      const sections = await CaseLegalIntegration.getSectionsByAct(actId);
      return res.json({
        success: true,
        actId,
        sections
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = LegalController;
