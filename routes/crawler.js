// const express = require("express");
// const axios = require("axios");
// const crawlerRoute = express.Router();
// const cnrDetailsCollection = require("../models/cnrDetailsSchema.js");
// const UnsaveCnrCollection = require("../models/unsavedCnrSchema.js");
// require("dotenv").config();

// crawlerRoute.post("/crawler/caseDetails", async (req, res) => {
//   const { cnr_number, userID } = req.body;

//   if(!userID){
//     return res
//     .status(400)
//     .json({
//       error:
//         "Not a valid userID !",
//     });
//   }

//   if (!cnr_number || !/^[A-Za-z0-9]{16}$/.test(cnr_number)) {
//     return res
//       .status(400)
//       .json({
//         error:
//           "Invalid CNR number. It must be 16 alphanumeric characters long.",
//       });
//   }

//   try {
//     const isCnrNumberFound = await cnrDetailsCollection.findOne({
//       cnrNumber: cnr_number,
//     });

//     console.log("isCnrNumberFound:", isCnrNumberFound)
//     if(isCnrNumberFound){

//       if(!isCnrNumberFound.userIDs.includes(userID)){
//         isCnrNumberFound.userIDs.push(userID)
//         await isCnrNumberFound.save();
//       }else{
//         return res.status(200).json({
//           status: true,
//           message: `CNR details already uploaded : ${cnr_number}`,
//         });
//       }

//     return res.status(200).json({
//         status: true,
//         message: `Access granted to CNR details for : ${cnr_number}`,
//       }); 
//     }else{

   

//     // const result = await getCaseDetailsProcess(cnr_number);
//     // const apiUrl = "http://localhost:8000/api/standard/ecourt";
//     const apiUrl = `${process.env.STANDARD_API}/api/standard/ecourt`
//       const payload = { cnr_number };

//       const response = await axios.post(apiUrl, payload);

//       const result = response.data;

//     if (result.status === true) {
//       const savedCnrDetails = new cnrDetailsCollection({
//         cnrNumber: result.cnr_number,
//         cnrDetails: result,
//         userIDs: [userID],
//       });
//       await savedCnrDetails.save();

//       return res.status(201).json({
//         status: true,
//         message: `Details saved for: ${result.cnr_number}`,
//         savedData: result,
//       });
//     } else {
//       const isCnrNumberFound = await cnrDetailsCollection.findOne({
//         cnrNumber: cnr_number,
//       });
//       // cnrDetailsCollection

//       console.log("------isCnrNumberFound:", isCnrNumberFound)

//       if (!isCnrNumberFound) {
//         const unsavedCnrExists = await UnsaveCnrCollection.findOne({
//           cnrNumber: cnr_number,
//         });

//         if (!unsavedCnrExists) {
//           const saveUnsavedCnrNumber = new UnsaveCnrCollection({
//             cnrNumber: cnr_number,
//             userIDs: [userID]
//           });

//           await saveUnsavedCnrNumber.save();
//           return res.status(201).json({
//             status: true,
//             message: `Unsaved CNR number added: ${cnr_number}`,
//             savedData: result,
//           });
//         } else {

//           if(!unsavedCnrExists.userIDs.includes(userID)){
//             unsavedCnrExists.userIDs.push(userID)
//             await unsavedCnrExists.save();
//           }
//           return res.status(200).json({
//             status: false,
//             message: `CNR number already exists in unsaved collection: ${cnr_number}`,
//           });
//         }
//       } else {
//         return res.status(200).json({
//           status: false,
//           message: `CNR number already exists in saved collection: ${cnr_number}`,
//         });
//       }
//     }
//   }

//   } catch (err) {
//     console.log("err::", err)
//     res.status(500).json({ error: "An unexpected error occurred.",message:err.message });
//   }
// });

// module.exports = { crawlerRoute };


const express = require("express");
const axios = require("axios");
const crawlerRoute = express.Router();
const cnrDetailsCollection = require("../models/cnrDetailsSchema.js");
const UnsaveCnrCollection = require("../models/unsavedCnrSchema.js");
require("dotenv").config();

crawlerRoute.post("/crawler/caseDetails", async (req, res) => {
  const { cnr_number, userID } = req.body;

  // Validate userID
  if (!userID) {
    return res.status(400).json({
      error: "Not a valid userID!",
    });
  }

  // Validate cnr_number
  if (!cnr_number || !/^[A-Za-z0-9]{16}$/.test(cnr_number)) {
    return res.status(400).json({
      error: "Invalid CNR number. It must be 16 alphanumeric characters long.",
    });
  }

  try {
    // Check if the CNR number already exists in the saved collection
    const savedCnrDetails = await cnrDetailsCollection.findOne({ cnrNumber: cnr_number });

    if (savedCnrDetails) {
      // Add userID to existing entry if not already included
      if (!savedCnrDetails.userIDs.includes(userID)) {
        savedCnrDetails.userIDs.push(userID);
        await savedCnrDetails.save();
      } else {
        return res.status(200).json({
          status: true,
          message: `CNR details already uploaded: ${cnr_number}`,
        });
      }

      return res.status(200).json({
        status: true,
        message: `Access granted to CNR details for: ${cnr_number}`,
      });
    }

    // If not found, fetch data from the external API
    const apiUrl = `${process.env.STANDARD_API}/api/standard/ecourt`;
    if (!apiUrl) {
      throw new Error("STANDARD_API environment variable is not defined.");
    }

    const payload = { cnr_number };
    const response = await axios.post(apiUrl, payload);
    const result = response.data;

    if (result.status) {
      // Save new CNR details
      const newCnrDetails = new cnrDetailsCollection({
        cnrNumber: result.cnr_number,
        cnrDetails: result,
        userIDs: [userID],
      });
      await newCnrDetails.save();

      return res.status(201).json({
        status: true,
        message: `Details saved for: ${result.cnr_number}`,
        savedData: result,
      });
    } else {
      // Handle unsaved CNR numbers
      const unsavedCnr = await UnsaveCnrCollection.findOne({ cnrNumber: cnr_number });

      if (!unsavedCnr) {
        const newUnsavedCnr = new UnsaveCnrCollection({
          cnrNumber: cnr_number,
          userIDs: [userID],
        });
        await newUnsavedCnr.save();

        return res.status(201).json({
          status: true,
          message: `Unsaved CNR number added: ${cnr_number}`,
          savedData: result,
        });
      } else {
        if (!unsavedCnr.userIDs.includes(userID)) {
          unsavedCnr.userIDs.push(userID);
          await unsavedCnr.save();
        }

        return res.status(200).json({
          status: false,
          message: `CNR number already exists in unsaved collection: ${cnr_number}`,
        });
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({
      error: "An unexpected error occurred.",
      message: err.message,
    });
  }
});

module.exports = { crawlerRoute };
