const express = require("express");
const cnrDetailsCollection = require("../models/cnrDetailsSchema");
// const updateCnrData = require("../models/updateCnrData");

const getAllCnrDetails = express.Router();

getAllCnrDetails.get("/getCnrDetails/:userID", async(req, res) => {
    const {userID} = req.params;
    try{

        const cnrDetails = await cnrDetailsCollection.find({
            userIDs: userID,
          });
      
          // console.log("cnrDetails:", cnrDetails)
          if(cnrDetails){
            return res.status(200).json({
              status: true,
              cnrDetails: cnrDetails,
            }); 
          }else{
            return res.status(200).json({
                status: false,
                messages: `Data not found for userId : ${userID}`,
              });  
          }        

    }catch(err){
        // console.log("err:", err)
        res.status(500).json({status: false, message:"Internal server error", err:err.message})
    }
})

// Filter API
// getAllCnrDetails.post("/cnr-details/filter", async (req, res) => {
//   try {
//     const filters = req.body;

//     // Building a dynamic query based on filters
//     const query = {};

//     if (filters.cnrNumber) {
//       query.cnrNumber = filters.cnrNumber;
//     }

//     if (filters.status !== undefined) {
//       query["cnrDetails.status"] = filters.status;
//     }

//     if (filters.caseType) {
//       query["cnrDetails.Case Details.Case Type"] = filters.caseType;
//     }

//     if (filters.firstHearingDate) {
//       query["cnrDetails.Case Status"] = {
//         $elemMatch: {
//           "0": "First Hearing Date",
//           "1": filters.firstHearingDate,
//         },
//       };
//     }

//     if (filters.nextHearingDate) {
//       query["cnrDetails.Case Status"] = {
//         $elemMatch: {
//           "0": "Next Hearing Date",
//           "1": filters.nextHearingDate,
//         },
//       };
//     }

//     if (filters.judge) {
//       query["cnrDetails.Case History"] = {
//         $elemMatch: {
//           "0": filters.judge,
//         },
//       };
//     }

//     if (filters.petitionerAndAdvocate) {
//       query["cnrDetails.Petitioner and Advocate"] = {
//         $regex: filters.petitionerAndAdvocate,
//         $options: "i",
//       };
//     }

//     if (filters.respondentAndAdvocate) {
//       query["cnrDetails.Respondent and Advocate"] = {
//         $regex: filters.respondentAndAdvocate,
//         $options: "i",
//       };
//     }

//     if (filters.courtNumberAndJudge) {
//       query["cnrDetails.Case Status"] = {
//         $elemMatch: {
//           "0": "Court Number and Judge",
//           "1": { $regex: filters.courtNumberAndJudge, $options: "i" },
//         },
//       };
//     }

//     if (filters.caseStage) {
//       query["cnrDetails.Case Status"] = {
//         $elemMatch: {
//           "0": "Case Stage",
//           "1": { $regex: filters.caseStage, $options: "i" },
//         },
//       };
//     }

//     if (filters.filingNumber) {
//       query["cnrDetails.Case Details.Filing Number"] = filters.filingNumber;
//     }

//     if (filters.filingDate) {
//       query["cnrDetails.Case Details.Filing Date"] = filters.filingDate;
//     }

//     if (filters.registrationNumber) {
//       query["cnrDetails.Case Details.Registration Number"] = filters.registrationNumber;
//     }

//     if (filters.registrationDate) {
//       query["cnrDetails.Case Details.Registration Date:"] = filters.registrationDate;
//     }

//     // Check for multiple keyword matches
//     const keywordFilters = [
//       filters.petitionerAndAdvocate,
//       filters.respondentAndAdvocate,
//       filters.courtNumberAndJudge,
//       filters.caseStage,
//     ].filter(Boolean);

//     if (keywordFilters.length > 0) {
//       query.$or = keywordFilters.map((keyword) => ({
//         "cnrDetails.Case Status": {
//           $elemMatch: {
//             "1": { $regex: keyword, $options: "i" },
//           },
//         },
//       }));
//     }

//     const results = await updateCnrData.find(query);

//     res.status(200).json({
//       success: true,
//       data: results,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "An error occurred while filtering data.",
//       error: error.message,
//     });
//   }
// });



module.exports = getAllCnrDetails;