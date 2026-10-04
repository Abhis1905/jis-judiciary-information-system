'use strict';

const express = require('express');
const router = express.Router();
const LegalController = require('../controllers/legalController');

// Main Legal Dashboard
router.get('/', LegalController.index);
router.get('/dashboard', LegalController.index);

// Acts and Codes
router.get('/acts', LegalController.listActs);
router.get('/acts/:id', LegalController.viewAct);

// Sections
router.get('/sections/:id', LegalController.viewSection);

// Judgments
router.get('/judgments/supreme-court', LegalController.supremeCourtJudgments);
router.get('/judgments/high-courts', LegalController.highCourtJudgments);
router.get('/judgments/:id/pdf', LegalController.downloadJudgmentPdf);
router.get('/judgments/:id', LegalController.viewJudgment);

// Old ↔ New Criminal Law Mapping
router.get('/mapping', LegalController.mappingMatrix);

// Legal Categories / Taxonomy
router.get('/categories', LegalController.listCategories);
router.get('/categories/:id', LegalController.viewCategory);

// Universal Legal Search
router.get('/search', LegalController.search);

// API Endpoints
router.get('/api/mapping/lookup', LegalController.apiMappingLookup);
router.get('/mapping/lookup', LegalController.apiMappingLookup);
router.get('/api/acts/:id/sections', LegalController.apiGetActSections);
router.get('/acts/:id/sections', LegalController.apiGetActSections);

module.exports = router;
