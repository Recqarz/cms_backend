// const express = require("express");
// const axios = require("axios");
// const nodeCron = require("node-cron");
// const updateCnrData = require("./models/updateCnrData"); // Import your schema

// const router = express.Router();

// // Function to call the API with the cnr_number
// const callApiForCnrNumber = async (cnrNumber) => {
//   try {
//     const apiUrl = `${process.env.STANDARD_API}/api/standard/ecourt`;
//     const payload = { cnr_number: cnrNumber };

//     const response = await axios.post(apiUrl, payload);
//     console.log(`API called successfully for CNR Number: ${cnrNumber}`, response.data);

//     // You may update the database after the API call
//     await updateCnrData.findOneAndUpdate(
//       { cnrNumber },
//       { "cnrDetails.isCaseUpdate": true, updatedAt: new Date() }
//     );
//   } catch (error) {
//     console.error(`Error calling API for CNR Number: ${cnrNumber}`, error);
//   }
// };

// // Scheduler function
// const scheduleCnrUpdates = async () => {
//   try {
//     // Fetch all cases with isCaseUpdate = false
//     const cases = await updateCnrData.find({ "cnrDetails.isCaseUpdate": false });

//     cases.forEach((caseItem) => {
//       const nextHearingDate = caseItem.cnrDetails["Case Status"]?.find(
//         (status) => status[0] === "Next Hearing Date"
//       )?.[1];

//       console.log("nextHearingDate:", nextHearingDate)

//       if (nextHearingDate) {
//         const hearingDate = new Date(nextHearingDate.replace(/(\d{1,2})(st|nd|rd|th)/, "$1"));

//         // Schedule for the next day at 9 A.M.
//         const nextDay = new Date(hearingDate);
//         nextDay.setDate(hearingDate.getDate() + 1);
//         nodeCron.schedule(`${nextDay.getMinutes()} ${nextDay.getHours()} ${nextDay.getDate()} ${nextDay.getMonth() + 1} *`, () => {
//           callApiForCnrNumber(caseItem.cnrNumber);
//         });

//         // Schedule for 3 days after the hearing date at 9 A.M.
//         const threeDaysLater = new Date(hearingDate);
//         threeDaysLater.setDate(hearingDate.getDate() + 3);
//         nodeCron.schedule(`${threeDaysLater.getMinutes()} ${threeDaysLater.getHours()} ${threeDaysLater.getDate()} ${threeDaysLater.getMonth() + 1} *`, () => {
//           callApiForCnrNumber(caseItem.cnrNumber);
//         });

//         // Schedule every Monday at 9 A.M. starting from 4 days after the hearing date
//         const fourDaysLater = new Date(hearingDate);
//         fourDaysLater.setDate(hearingDate.getDate() + 4);

//         nodeCron.schedule("0 9 * * 1", () => {
//           const today = new Date();
//           if (today >= fourDaysLater) {
//             callApiForCnrNumber(caseItem.cnrNumber);
//           }
//         });
//       }
//     });
//   } catch (error) {
//     console.error("Error scheduling CNR updates:", error);
//   }
// };

// // Initialize the scheduler
// scheduleCnrUpdates();

// // Export your router
// module.exports = router;
