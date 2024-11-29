const expressAsyncHandler = require('express-async-handler');
const Case = require('../models/caseModel'); 
const SearchCase = require('../models/searchcase'); 
const User = require('../models/userModel');
const mongoose = require('mongoose');

// Save a case
const saveCaseDetails = expressAsyncHandler(async (req, res) => {
  const { userId } = req.params; // Retrieve userId from params
  const { cnr_number, ccEmails } = req.body; // Retrieve cnr_number and ccEmails from body

  if (!cnr_number) {
    return res.status(400).json({ success: false, message: 'CNR number is required.' });
  }

  // Ensure userId is valid and exists
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid userId.' });
  }
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  // Ensure ccEmails is an array of objects
  if (ccEmails && !Array.isArray(ccEmails)) {
    return res.status(400).json({ success: false, message: 'ccEmails must be an array.' });
  }

  // Ensure each item in the ccEmails array is an object with a name and email
  if (ccEmails) {
    for (const ccEmail of ccEmails) {
      if (!ccEmail.name || !ccEmail.email) {
        return res.status(400).json({
          success: false,
          message: 'Each CC email must have both a name and an email.',
        });
      }
    }
  }

  try {
    // Save the case with CC emails if provided
    const newCase = await Case.create({ cnrNumber: cnr_number, userId, ccEmails });

    return res.status(201).json({
      success: true,
      message: 'Case saved successfully.',
      case: newCase,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error (unique index violated)
      return res.status(400).json({
        success: false,
        message: 'Case with this CNR number already exists for this user.',
      });
    }
    console.error('Error saving case:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});



const getCaseDetails = expressAsyncHandler(async (req, res) => {
    const { userId } = req.params;
  
    if (!userId) {
      return res.status(400).json({ success: false, message: 'UserId is required.' });
    }
  
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId.' });
    }
  
    try {
      // Fetch all cases for the given userId
      const cases = await Case.find({ userId }); // Fetch all cases for the userId
      if (!cases || cases.length === 0) {
        return res.status(404).json({ success: false, message: 'No cases found for this user.' });
      }
  
      // For each case, fetch the corresponding detailed case information from SearchCase
      const caseDetails = await Promise.all(
        cases.map(async (caseData) => {
          const detailedCaseData = await SearchCase.findOne({ cnrNumber: caseData.cnrNumber });
          return {
            case: caseData,
            caseDetails: detailedCaseData,
          };
        })
      );
  
      // console.log('Fetched case details:', caseDetails);  // Add console log for debugging
  
      return res.status(200).json({
        success: true,
        message: 'Case details retrieved successfully.',
        data: caseDetails,
      });
    } catch (error) {
      console.error('Error fetching case details:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });
  
  
  

module.exports = { saveCaseDetails,getCaseDetails  };
