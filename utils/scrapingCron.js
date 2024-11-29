const cron = require('node-cron');
const axios = require('axios');
const _ = require('lodash');
const Case = require('../models/searchcase');

// Function to extract a valid CNR number
function extractValidCNR(input) {
    if (!input) return null;

    const cleanedInput = input.replace(/[^A-Z0-9]/g, '').slice(0, 16);
    return cleanedInput.length === 16 ? cleanedInput : null;
}

// Function to update the case with new scraped data
async function updateCaseWithScrapedData(dbCase, cnrNumberFromDB, scrapedData) {
    const updatedCaseDetails = {
        ...dbCase.caseDetails, // Keep existing data
        cnrNumber: scrapedData['Case Details']?.["CNR Number"]
            ? extractValidCNR(scrapedData['Case Details']["CNR Number"])
            : dbCase.caseDetails?.cnrNumber,
        caseType: scrapedData['Case Details']?.["Case Type"] || dbCase.caseDetails?.caseType,
        filingDate: scrapedData['Case Details']?.["Filing Date"] || dbCase.caseDetails?.filingDate,
        filingNumber: scrapedData['Case Details']?.["Filing Number"] || dbCase.caseDetails?.filingNumber,
        registrationDate: scrapedData['Case Details']?.["Registration Date"] || dbCase.caseDetails?.registrationDate,
        registrationNumber: scrapedData['Case Details']?.["Registration Number"] || dbCase.caseDetails?.registrationNumber,
        acts: scrapedData['Case Details']?.["Acts"]
            ? scrapedData['Case Details']["Acts"].map(item => item[0]).join(", ")
            : dbCase.caseDetails?.acts,

        // Keep the caseStatus as an array of arrays, not a string
        caseStatus: scrapedData['Case Status']
            ? scrapedData['Case Status'].map(item => [item[0], item[1]]) // Ensure it's an array of arrays
            : dbCase.caseStatus,

        // Keep the caseHistory as it is, or use scraped data if available
        caseHistory: scrapedData['Case History'] || dbCase.caseHistory,

        // Ensure petitioner and respondent are stored as strings
        petitionerAndAdvocate: scrapedData['Petitioner and Advocate']
            ? scrapedData['Petitioner and Advocate'].join(", ")
            : dbCase.petitionerAndAdvocate,
        respondentAndAdvocate: scrapedData['Respondent and Advocate']
            ? scrapedData['Respondent and Advocate'].join(", ")
            : dbCase.respondentAndAdvocate
    };

    // Update case details and save it
    dbCase.caseDetails = updatedCaseDetails;

    // Save the updated case document
    await dbCase.save(); // This will update the document in the database without creating a new one
    console.log(`Case with CNR ${cnrNumberFromDB} successfully updated with new data.`);
}

// Cron Job to scrape data and update records
cron.schedule('0 */12 * * *', async () => {
    console.log('Running cron job to scrape data...');

    try {
        const cases = await Case.find(); // Fetch all cases from the database

        for (const dbCase of cases) {
            if (!dbCase.cnrNumber) {
                console.error(`CNR number is missing in record ID ${dbCase._id}`);
                continue;
            }

            const cnrNumberFromDB = extractValidCNR(dbCase.cnrNumber);

            if (!cnrNumberFromDB) {
                console.error(`Invalid CNR number in record ID ${dbCase._id}: ${dbCase.cnrNumber}`);
                continue;
            }

            console.log(`Fetching data for CNR Number: ${cnrNumberFromDB}`);

            try {
                // Make API call to fetch case details
                const response = await axios.post(
                    'http://127.0.0.1:5000/getCase_Details_satus',
                    { cnr_number: cnrNumberFromDB },
                    { headers: { 'Content-Type': 'application/json' } }
                );

                const scrapedData = response.data;
                console.log('Scraped Data:', JSON.stringify(scrapedData, null, 2));

                // Skip if the API response is invalid
                if (!scrapedData || typeof scrapedData !== 'object') {
                    console.error(`Invalid data received for CNR ${cnrNumberFromDB}: ${JSON.stringify(scrapedData)}`);
                    continue;
                }

                // Update the existing case document with the new scraped data
                await updateCaseWithScrapedData(dbCase, cnrNumberFromDB, scrapedData);

            } catch (axiosError) {
                console.error(`Failed to fetch data for CNR ${cnrNumberFromDB}: ${axiosError.message}`);
            }
        }
    } catch (error) {
        console.error('Error in cron job:', error.message);
    }
});
