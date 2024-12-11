const express = require("express");
const UnsaveCnrCollection = require("../models/unsavedCnrSchema");
const updateCnrData = require("../models/updateCnrData");
// const { getCaseDetailsProcess } = require("../utils/getCaseDetailsProcess");
const cron = require("node-cron");
const cnrDetailsCollection = require("../models/cnrDetailsSchema");
require("dotenv").config()
const getUnsavedCnrRoute = express.Router();
const axios = require("axios")

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processCnrNumbers = async (
  filteredCnrNumbers,
  maxRetries = 5,
  delayMs = 7000
) => {
  const results = [];

  // console.log(" ARr filteredCnrNumbers:", filteredCnrNumbers);
  for (const el of filteredCnrNumbers) {
    let cnrNumber = el.cnrNumber;
    let userIDs = el.userIDs;
    let attempt = 0;
    let success = false;
    let response;

    // console.log(`Processing CNR number: ${cnrNumber}`);

    while (attempt < maxRetries && !success) {
      attempt += 1;
      // console.log(`Attempt ${attempt} for CNR number: ${cnrNumber}`);

      try {
        // response = await getCaseDetailsProcess(cnrNumber);
        const apiUrl = `${process.env.STANDARD_API}/api/standard/ecourt`
        // console.log("apiUrl:", apiUrl)
      const payload = { cnr_number: cnrNumber };

      let caseData = await axios.post(apiUrl, payload);


      response = caseData.data
      // console.log("response standard api:", response)


        if (response.status === true) {
          let modifiedResult = {
            result: response,
            userIDs: userIDs,
          };
          // console.log(`Successfully processed CNR number: ${cnrNumber}`);
          results.push(modifiedResult);
          success = true;
        } else {
          console.error(
            `Failed attempt ${attempt} for CNR number: ${cnrNumber}. Retrying after ${
              delayMs / 1000
            } seconds...`
          );
          await delay(delayMs); // Delay before retrying
        }
      } catch (err) {
        console.error(
          `Error processing CNR number: ${cnrNumber} on attempt ${attempt}:`,
          err.message
        );
        await delay(delayMs); // Delay before retrying
      }

      if (attempt === maxRetries && !success) {
        console.error(
          `Max retries reached for CNR number: ${cnrNumber}. Skipping...`
        );
        results.push({
          cnr_number: cnrNumber,
          status: false,
          message: "Failed after max retries.",
          userIDs: userIDs,
        });
      }
    }

    if (success) {
      // console.log(
      //   `Waiting ${
      //     delayMs / 1000
      //   } seconds before processing the next CNR number...`
      // );
      await delay(delayMs); // Delay before moving to the next CNR number
    }
  }

  return results;
};

const processUnsavedCnr = async () => {
  try {
    // const unSaveCnrNumber = await UnsaveCnrCollection.find({ status: false }).limit(1);
    // console.log("unSavedCnrNumber", unSaveCnrNumber);
    // if(unSaveCnrNumber.length === 0 ){
    //   return {status: true, message:"Not found any unSaved CNR Number !"}
    // }

    // const haveToUpdateCnrDetails = await updateCnrData.find();

    // const updatedCnrNumbers = haveToUpdateCnrDetails.map(
    //   (item) => item.cnrNumber
    // );

    // const filteredCnrNumbers = unSaveCnrNumber.filter(
    //   (item) => !updatedCnrNumbers.includes(item.cnrNumber)
    // );


    const haveToUpdateCnrDetails = await updateCnrData.find();
    const unSaveCnrNumber = await UnsaveCnrCollection.find({ status: false });

    // Extract the `cnrNumber` field from `haveToUpdateCnrDetails`
    const updatedCnrNumbers = new Set(haveToUpdateCnrDetails.map(item => item.cnrNumber));

    // Filter `unSaveCnrNumber` to get only those not in `updatedCnrNumbers`
    const filteredCnrNumbers = unSaveCnrNumber
      .filter(item => !updatedCnrNumbers.has(item.cnrNumber))
      .slice(0, 10); // Limit the result to 5 items

    // console.log("filteredCnrNumbers-----", filteredCnrNumbers);

    if(filteredCnrNumbers.length === 0 ){
      return {status: true, message:"Not found any unSaved CNR Number !"}
    }

    if (filteredCnrNumbers.length > 0) {
      const response = await processCnrNumbers(filteredCnrNumbers);

      for (let result of response) {
        // console.log("result--", result)
        if (result.result.status === true) {
            const haveto = result.result.cnr_number

            const updatedDocument = await UnsaveCnrCollection.findOneAndUpdate(
              { cnrNumber: haveto }, // Find the document with this cnrNumber
              { status: true }, // Update the status field
              { new: true } // Return the updated document
            );
        
            if (updatedDocument) {
              // console.log("CNR status updated successfully in unsave:", updatedDocument);
            } else {
              // console.log("CNR not found in unsave");
            }
         

          const savedCnrDetails = new cnrDetailsCollection({
            cnrNumber: result.result.cnr_number,
            cnrDetails: result.result,
            // userIDs:result.userIDs || [],
            userIDs: result.userIDs.map((id) =>(id)),
          });
          await savedCnrDetails.save();
          // console.log(`Details saved for in cron: ${result.result.cnr_number}`);
        } else if (result?.result.status === false) {
          const isCnrNumberFound = await cnrDetailsCollection.findOne({
            cnrNumber: result.cnr_number,
          });
          if (!isCnrNumberFound) {
            const unsavedCnrExists = await UnsaveCnrCollection.findOne({
              cnrNumber: result.cnr_number,
            });

            if (!unsavedCnrExists) {
              const saveUnsavedCnrNumber = new UnsaveCnrCollection({
                cnrNumber: result.cnr_number,
                userIDs: [userID],
                status: false
              });

              await saveUnsavedCnrNumber.save();
              // console.log(`Unsaved CNR number status false : ${result.cnr_number}`)
            }
          }
        } else {
          // console.log("--- not saved ---");
        }
      }
    } else {
      // console.log("No unmatched CNR numbers found!");
    }
  } catch (err) {
    // console.log("err:", err);
  }
};

// Set up cron job to run every 2 hr
cron.schedule("*/23 * * * *", async () => {
  console.log("standard api running...");
  await processUnsavedCnr();
});

getUnsavedCnrRoute.get("/unSavedCnr", async (req, res) => {
  try {
    let response = await processUnsavedCnr();
    res.status(200).json({ response });
  } catch (err) {
    res.status(500).json({ status: false, err: err.message });
  }
});

module.exports = getUnsavedCnrRoute;
