const express = require('express');
const { saveCaseDetails,getCaseDetails } = require('../controllers/caseController');
const router = express.Router();

// Save a new case for a specific user
router.post('/save-case/:userId', saveCaseDetails);

router.get('/get-case-details/:userId', getCaseDetails);


module.exports = router;
