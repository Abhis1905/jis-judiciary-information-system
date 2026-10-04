'use strict';

const express    = require('express');
const router     = express.Router();
const publicCtrl = require('../controllers/publicController');

// C1 – Home / Case Search & Public Records (anonymous)
router.get('/',       publicCtrl.getHome);
router.get('/search', publicCtrl.getHome);

// C2 – Case Status Detail (anonymous, is_public enforced in controller)
router.get('/case/:id', publicCtrl.getCaseStatus);

// C3 – Court Notices (anonymous)
router.get('/notices', publicCtrl.getNotices);

module.exports = router;
