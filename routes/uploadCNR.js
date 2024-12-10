const express = require("express");
const UnsaveCnrCollection = require("../models/unsavedCnrSchema");
const mongoose = require("mongoose");
const cnrDetailsCollection = require("../models/cnrDetailsSchema");
const uploadCnrRoute = express.Router();

// API to store CNR numbers
uploadCnrRoute.post("/upload-cnr-numbers", async (req, res) => {
  try {
    const { cnrNumbers, userID } = req.body;

    console.log("Request body:", req.body);
    if (!userID || !mongoose.Types.ObjectId.isValid(userID)) {
      return res.status(400).json({ error: "A valid userID is required." });
    }

    if (!Array.isArray(cnrNumbers) || !cnrNumbers.length) {
      return res
        .status(400)
        .json({ error: "cnrNumbers must be a non-empty array." });
    }

    const savedEntries = [];
    for (const cnrNumber of cnrNumbers) {
      console.log(`Processing CNR Number: ${cnrNumber}`);

      const isCnrNumberFound = await cnrDetailsCollection.findOne({
        cnrNumber: cnrNumber,
      });

      if (isCnrNumberFound) {
        if (!isCnrNumberFound.userIDs.includes(userID)) {
          isCnrNumberFound.userIDs.push(userID);
          await isCnrNumberFound.save();
        } else {
          console.log(`CNR details already uploaded : ${cnrNumber}`);
          continue;
        }
        console.log(`Access granted to CNR details for : ${cnrNumber}`);
      } else {
        let existingEntry = await UnsaveCnrCollection.findOne({ cnrNumber });
        if (existingEntry) {
          console.log(`Found existing entry for CNR: ${cnrNumber}`);
          if (!existingEntry.userIDs.includes(userID)) {
            console.log(`Adding userID to existing CNR: ${cnrNumber}`);
            existingEntry.userIDs.push(userID);
            await existingEntry.save();
          }
          savedEntries.push(existingEntry);
        } else {
          console.log(`Creating new entry for CNR: ${cnrNumber}`);
          console.log("userID--------", userID);
          const newEntry = new UnsaveCnrCollection({
            cnrNumber,
            userIDs: [userID],
            status: false,
          });
          await newEntry.save();
          savedEntries.push(newEntry);
        }
      }
    }

    res
      .status(200)
      .json({ status: true, message: "The CNR Number is currently being processed and will be available shortly." });
  } catch (error) {
    console.error("Error saving CNR numbers:", error.message);
    res
      .status(500)
      .json({
        status: false,
        error: "An error occurred while storing CNR numbers.",
      });
  }
});

module.exports = uploadCnrRoute;
