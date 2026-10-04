'use strict';

const express = require('express');
const router = express.Router();
const hierarchyController = require('../controllers/hierarchyController');

// Public API endpoints for cascading jurisdiction dropdowns
router.get('/states', hierarchyController.getStates);
router.get('/high-courts', hierarchyController.getHighCourts);
router.get('/benches', hierarchyController.getBenches);
router.get('/districts', hierarchyController.getDistricts);
router.get('/court-levels', hierarchyController.getCourtLevels);
router.get('/subordinate-courts', hierarchyController.getSubordinateCourts);
router.get('/appellate-path', hierarchyController.getAppellatePath);

module.exports = router;
