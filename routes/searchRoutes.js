const express = require('express');
const router = express.Router();
const Case = require('../models/searchcase'); // Adjust path if necessary

// Save the case details to the database
router.post('/save-to-database-a', async (req, res) => {
  const { cnrNumber, caseDetails } = req.body;

  if (!cnrNumber || !caseDetails) {
    return res.status(400).json({
      success: false,
      message: 'CNR Number and Case Details are required.',
    });
  }

  const cleanCnrNumber = cnrNumber.slice(0, 16);

  try {
    // Check if the case already exists in the database
    const caseExists = await Case.findOne({ cnrNumber: cleanCnrNumber });
    if (caseExists) {
      return res.status(400).json({
        success: false,
        message: 'Case already exists in Database A.',
      });
    }

    // Create and save the new case
    const newCase = new Case({
      cnrNumber: cleanCnrNumber,
      caseDetails,
    });

    await newCase.save();
    res.status(201).json({
      success: true,
      message: 'Case saved to Database A successfully.',
    });
  } catch (error) {
    console.error('Error saving case to Database A:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
});

// Check if the CNR number exists in the database
router.get('/check-cnr/:cnrNumber', async (req, res) => {
  const { cnrNumber } = req.params;
  // console.log("Request for CNR:", cnrNumber); // Add this log for debugging

  try {
    const caseData = await Case.findOne({ cnrNumber });

    if (caseData) {
      // console.log("Case found:", caseData);
      return res.status(200).json({
        success: true,
        case: caseData,
      });
    } else {
      // console.log("Case not found for CNR:", cnrNumber);
      return res.status(404).json({
        success: false,
        message: 'Case not found in the database.',
      });
    }
  } catch (error) {
    // console.error('Error checking CNR:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
});

module.exports = router;
