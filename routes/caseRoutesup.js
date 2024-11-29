require('dotenv').config();
const express = require('express');
const multer = require('multer');
const router = express.Router();
const Case = require('../models/searchcase'); 
const xlsx = require('xlsx');
const fetch = require('node-fetch'); 

// Set up multer for file upload (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return cb(new Error('Only Excel files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // Limit file size to 2 MB
});

// Route for bulk upload
router.post('/upload-bulk', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  try {
    // Read the uploaded Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const cnrNumbers = xlsx.utils.sheet_to_json(sheet, { header: 1 }).map((row) => row[0]);

    if (!cnrNumbers || cnrNumbers.length === 0) {
      return res.status(400).json({ success: false, message: 'The uploaded file is empty or invalid.' });
    }

    let successful = 0;
    let failed = 0;

    // Process each CNR sequentially
    for (const cnrNumber of cnrNumbers) {
      try {
        const existingCase = await Case.findOne({ cnrNumber });
        if (existingCase) {
          console.log(`Duplicate entry skipped for CNR: ${cnrNumber}`);
          successful++;
          continue;
        }

        await fetchCaseDetailsAndSave(cnrNumber);
        successful++;
      } catch (error) {
        failed++;
        console.error(`Error processing CNR: ${cnrNumber}`, error.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk upload completed.',
      successful,
      failed,
    });
  } catch (error) {
    console.error('Error processing bulk upload:', error.message);
    res.status(500).json({ success: false, message: 'Error processing file.' });
  }
});

// Function to fetch case details from external API and save to DB
const fetchCaseDetailsAndSave = async (cnrNumber) => {
  try {
    const apiUrl = process.env.API_URL; // Fetch API URL from environment variables

    const externalResponse = await fetchWithRetry(
      apiUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnr_number: cnrNumber }),
      }
    );

    const responseText = await externalResponse.text();

    if (!externalResponse.ok) {
      throw new Error(`API request failed with status ${externalResponse.status}`);
    }

    try {
      const externalData = JSON.parse(responseText);
      if (externalData['Case Details']) {
        const caseDetails = transformCaseData(externalData);

        const existingCase = await Case.findOne({ cnrNumber });
        if (!existingCase) {
          await Case.create({ cnrNumber, caseDetails });
        } else {
          console.log(`Duplicate entry skipped for CNR: ${cnrNumber}`);
        }
      } else {
        console.error(`No case details found for CNR: ${cnrNumber}`);
      }
    } catch (jsonParseError) {
      console.error(`Error parsing JSON for CNR ${cnrNumber}:`, responseText);
      throw new Error('Invalid JSON response');
    }
  } catch (error) {
    console.error(`Error fetching case details for ${cnrNumber}:`, error.message);
    throw error;
  }
};

// Function to retry fetching details
const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error; // Exhausted retries
      console.warn(`Retrying API request (${i + 1}/${retries})...`);
    }
  }
};

const transformCaseData = (data) => {
  const caseDetails = data['Case Details'] || {};

  return {
    cnrNumber: caseDetails['CNR Number']?.split(' (')[0] || 'N/A',
    caseType: caseDetails['Case Type'] || 'N/A',
    filingDate: caseDetails['Filing Date'] || 'N/A',
    filingNumber: caseDetails['Filing Number'] || 'N/A',
    registrationDate: caseDetails['Registration Date'] || 'N/A',
    registrationNumber: caseDetails['Registration Number'] || 'N/A',
    acts: Array.isArray(caseDetails['Acts'])
      ? caseDetails['Acts'].join(', ')
      : caseDetails['Acts'] || 'N/A',
    caseStatus: Array.isArray(data['Case Status']) ? data['Case Status'] : [],
    caseHistory: Array.isArray(data['Case History']) ? data['Case History'] : [],
    firDetails: data['FIR Details'] || {},
    petitionerAndAdvocate: (Array.isArray(data['Petitioner and Advocate']) && data['Petitioner and Advocate'].length > 0
      ? data['Petitioner and Advocate'].map((item) => item.replace(/\n/g, ' '))
      : ['N/A']).join(', '),
    respondentAndAdvocate: (Array.isArray(data['Respondent and Advocate']) && data['Respondent and Advocate'].length > 0
      ? data['Respondent and Advocate'].map((item) => item.replace(/\n/g, ' '))
      : ['N/A']).join(', '),
  };
};

module.exports = router;
