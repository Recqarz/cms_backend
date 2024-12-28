import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { CnrDetail } from "./case.model.js";
import { UnsavedCnr } from "./unSavedCnr/unSavedCnr.js";
import fs from "fs";
import xlsx from "xlsx";
import { ExternalUser } from "../externalUser/externaluser.model.js";

export const getCnrDetails = async (req, res) => {
  const { token } = req.headers;
  const {
    pageNo = 1,
    pageLimit = 10,
    filterText,
    nextHearing,
    petitioner,
    respondent,
  } = req.query;
  const filterOption = "active";
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }
  try {
    let isVerify;
    try {
      isVerify = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET_KEY);
    } catch (error) {
      console.error("JWT verification error:", error.message);
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    const filterQuery = {
      "userId.userId": isVerify.id,
    };
    if (filterOption && filterOption.toLowerCase() !== "all") {
      const filterMap = {
        active: {
          "caseStatus.2.1": { $not: { $regex: /case disposed/i } },
        },
        inactive: {
          "caseStatus.2.1": { $regex: /case disposed/i },
        },
      };
      const selectedFilter = filterMap[filterOption.toLowerCase()];
      if (selectedFilter) {
        Object.assign(filterQuery, selectedFilter);
      }
    }
    if (filterText) {
      const textSearchFields = [
        "cnrNumber",
        "caseDetails.CNR Number",
        "caseDetails.Case Type",
        "caseDetails.Filing Number",
        "caseDetails.Registration Number",
        "firDetails.FIR Number",
        "firDetails.Police Station",
        "caseStatus.2.1",
        "petitionerAndAdvocate.0.0",
        "respondentAndAdvocate.0.0",
      ];

      filterQuery.$or = textSearchFields.map((field) => ({
        [field]: { $regex: new RegExp(filterText, "i") },
      }));
    }
    const data = await CnrDetail.find(filterQuery);
    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No CNR details found.",
      });
    }
    let sortedData = data;
    if (nextHearing === "1" || nextHearing === "-1") {
      sortedData = data.sort((a, b) => {
        const dateA = parseDate(a.caseStatus?.[1]?.[1]);
        const dateB = parseDate(b.caseStatus?.[1]?.[1]);
        if (!dateA || !dateB) return 0;
        return nextHearing === "1" ? dateA - dateB : dateB - dateA;
      });
    }
    if (petitioner === "1" || petitioner === "-1") {
      sortedData = sortedData.sort((a, b) => {
        const petitionerA = cleanPetitionerName(
          a.petitionerAndAdvocate?.[0]?.[0]
        );
        const petitionerB = cleanPetitionerName(
          b.petitionerAndAdvocate?.[0]?.[0]
        );
        if (!petitionerA || !petitionerB) return 0;
        return petitioner === "1"
          ? petitionerA.localeCompare(petitionerB)
          : petitionerB.localeCompare(petitionerA);
      });
    }
    if (respondent === "1" || respondent === "-1") {
      sortedData = sortedData.sort((a, b) => {
        const respondentA = cleanPetitionerName(
          a.respondentAndAdvocate?.[0]?.[0]
        );
        const respondentB = cleanPetitionerName(
          b.respondentAndAdvocate?.[0]?.[0]
        );
        if (!respondentA || !respondentB) return 0;
        return respondent === "1"
          ? respondentA.localeCompare(respondentB)
          : respondentB.localeCompare(respondentA);
      });
    }
    const startIndex = (parseInt(pageNo, 10) - 1) * parseInt(pageLimit, 10);
    const endIndex = startIndex + parseInt(pageLimit, 10);
    const paginatedData = sortedData.slice(startIndex, endIndex);
    return res.status(200).json({
      success: true,
      data: paginatedData,
      message: "CNR details found.",
      pageSize: Math.ceil(sortedData.length / parseInt(pageLimit, 10)),
    });
  } catch (error) {
    console.error("Error getting CNR details:", error.stack);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

export const getDisposedCnrDetails = async (req, res) => {
  const { token } = req.headers;
  const {
    pageNo = 1,
    pageLimit = 10,
    filterText,
    nextHearing,
    petitioner,
    respondent,
  } = req.query;
  const filterOption = "inactive";
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }
  try {
    let isVerify;
    try {
      isVerify = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET_KEY);
    } catch (error) {
      console.error("JWT verification error:", error.message);
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    const filterQuery = {
      "userId.userId": isVerify.id,
    };
    if (filterOption && filterOption.toLowerCase() !== "all") {
      const filterMap = {
        active: {
          "caseStatus.2.1": { $not: { $regex: /case disposed/i } },
        },
        inactive: {
          "caseStatus.2.1": { $regex: /case disposed/i },
        },
      };
      const selectedFilter = filterMap[filterOption.toLowerCase()];
      if (selectedFilter) {
        Object.assign(filterQuery, selectedFilter);
      }
    }
    if (filterText) {
      const textSearchFields = [
        "cnrNumber",
        "caseDetails.CNR Number",
        "caseDetails.Case Type",
        "caseDetails.Filing Number",
        "caseDetails.Registration Number",
        "firDetails.FIR Number",
        "firDetails.Police Station",
        "caseStatus.2.1",
        "petitionerAndAdvocate.0.0",
        "respondentAndAdvocate.0.0",
      ];

      filterQuery.$or = textSearchFields.map((field) => ({
        [field]: { $regex: new RegExp(filterText, "i") },
      }));
    }
    const data = await CnrDetail.find(filterQuery);
    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No CNR details found.",
      });
    }
    let sortedData = data;
    if (nextHearing === "1" || nextHearing === "-1") {
      sortedData = data.sort((a, b) => {
        const dateA = parseDate(a.caseStatus?.[1]?.[1]);
        const dateB = parseDate(b.caseStatus?.[1]?.[1]);
        if (!dateA || !dateB) return 0;
        return nextHearing === "1" ? dateA - dateB : dateB - dateA;
      });
    }
    if (petitioner === "1" || petitioner === "-1") {
      sortedData = sortedData.sort((a, b) => {
        const petitionerA = cleanPetitionerName(
          a.petitionerAndAdvocate?.[0]?.[0]
        );
        const petitionerB = cleanPetitionerName(
          b.petitionerAndAdvocate?.[0]?.[0]
        );
        if (!petitionerA || !petitionerB) return 0;
        return petitioner === "1"
          ? petitionerA.localeCompare(petitionerB)
          : petitionerB.localeCompare(petitionerA);
      });
    }
    if (respondent === "1" || respondent === "-1") {
      sortedData = sortedData.sort((a, b) => {
        const respondentA = cleanPetitionerName(
          a.respondentAndAdvocate?.[0]?.[0]
        );
        const respondentB = cleanPetitionerName(
          b.respondentAndAdvocate?.[0]?.[0]
        );
        if (!respondentA || !respondentB) return 0;
        return respondent === "1"
          ? respondentA.localeCompare(respondentB)
          : respondentB.localeCompare(respondentA);
      });
    }
    const startIndex = (parseInt(pageNo, 10) - 1) * parseInt(pageLimit, 10);
    const endIndex = startIndex + parseInt(pageLimit, 10);
    const paginatedData = sortedData.slice(startIndex, endIndex);
    return res.status(200).json({
      success: true,
      data: paginatedData,
      message: "CNR details found.",
      pageSize: Math.ceil(sortedData.length / parseInt(pageLimit, 10)),
    });
  } catch (error) {
    console.error("Error getting CNR details:", error.stack);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// Helper function to parse date strings like "01st March 2023"
function parseDate(dateString) {
  if (!dateString) return null;

  try {
    // Remove ordinal suffixes (st, nd, rd, th)
    const cleanDateString = dateString.replace(/(\d+)(st|nd|rd|th)/i, "$1");
    return new Date(cleanDateString);
  } catch (error) {
    console.error("Error parsing date:", error.message);
    return null;
  }
}

// Helper function to clean and extract the petitioner's name from the format
function cleanPetitionerName(petitionerString) {
  if (!petitionerString) return null;

  try {
    const nameMatch = petitionerString.match(/^\d+\)\s*([^-]+)/);
    return nameMatch ? nameMatch[1].trim() : null;
  } catch (error) {
    console.error("Error cleaning petitioner name:", error.message);
    return null;
  }
}

export const getUnsavedCnrDetails = async (req, res) => {
  const { token } = req.headers;
  const {
    pageLimit = 10,
    currentPage = 1,
    searchQuery = "",
    selectedFilter = "",
  } = req.query;
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Token is missing." });
  }
  try {
    const isVerify = jwt.verify(
      token?.split(" ")[1],
      process.env.JWT_SECRET_KEY
    );
    if (!isVerify) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: Invalid token." });
    }
    const query = {
      userId: { $elemMatch: { userId: isVerify.id } },
    };
    if (searchQuery) {
      query.cnrNumber = { $regex: searchQuery, $options: "i" };
    }
    if (selectedFilter.toLowerCase() !== "all") {
      query.status = { $regex: `^${selectedFilter}$`, $options: "i" };
    }
    const totalItems = await UnsavedCnr.countDocuments(query);
    const unsavedCnr = await UnsavedCnr.find(query);
    const startIndex =
      (parseInt(currentPage, 10) - 1) * parseInt(pageLimit, 10);
    const endIndex = startIndex + parseInt(pageLimit, 10);
    const paginatedData = unsavedCnr.slice(startIndex, endIndex);
    if (!unsavedCnr || unsavedCnr.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No unsaved Cnr details found." });
    }
    const ndatas = paginatedData.map((ele) => {
      return {
        cnr: ele.cnrNumber,
        status: ele.status,
        date: new Date(ele.createdAt).toISOString().split("T")[0],
      };
    });

    return res.status(200).json({
      success: true,
      data: ndatas,
      pageSize: Math.ceil(totalItems / pageLimit),
      message: "Unsaved Cnr details found.",
    });
  } catch (error) {
    console.error("Error getting unsaved Cnr details:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

export const AddNewSingleCnr = async (req, res) => {
  const { token } = req.headers;
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Token is missing." });
  }
  const { cnrNumber, externalUserName, externalUserId, jointUser } = req.body;
  if (!cnrNumber || !externalUserName || !externalUserId) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: cnrNumber, externalUserName, and externalUserId are required.",
    });
  }
  try {
    const tokenParts = token.split(" ");
    const decodedToken = jwt.verify(tokenParts[1], process.env.JWT_SECRET_KEY);
    if (!decodedToken) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token verification failed.",
      });
    }
    const userId = decodedToken.id;
    if (cnrNumber.length !== 16) {
      const newCnr = new UnsavedCnr({
        cnrNumber,
        userId: [{ userId, externalUserName, externalUserId, jointUser }],
        status: "invalidcnr",
      });
      await newCnr.save();
      return res
        .status(200)
        .json({ success: false, message: "Invalid CNR Number." });
    }
    const existingCnr = await CnrDetail.findOne({ cnrNumber });
    if (existingCnr) {
      const userCnrExists = existingCnr.userId.some(
        (user) => user.userId === userId
      );
      if (userCnrExists) {
        return res
          .status(409)
          .json({ success: false, message: "Already assigned CNR." });
      }
      existingCnr.userId.push({
        userId,
        externalUserName,
        externalUserId,
        jointUser,
      });
      await existingCnr.save();
      const unsavedCnrs = await UnsavedCnr.findOne({ cnrNumber });
      if (unsavedCnrs) {
        const userCnrExistsss = unsavedCnrs.userId.some(
          (user) => user.userId === userId
        );
        if (!userCnrExistsss) {
          unsavedCnrs.userId.push({
            userId,
            externalUserName,
            externalUserId,
            jointUser,
          });
          await unsavedCnrs.save();
        }
      } else {
        const newCnr = new UnsavedCnr({
          cnrNumber,
          userId: [{ userId, externalUserName, externalUserId, jointUser }],
          status: "processed",
        });
        await newCnr.save();
      }
      const externalUser = await ExternalUser.findById(externalUserId);
      if (externalUser) {
        externalUser.noOfAssigncases += 1;
        await externalUser.save();
      }
      return res
        .status(201)
        .json({ success: true, message: "CNR details added successfully." });
    }
    const unsavedCnr = await UnsavedCnr.findOne({ cnrNumber });
    if (unsavedCnr) {
      const userCnrExistss = unsavedCnr.userId.some(
        (user) => user.userId === userId
      );
      if (userCnrExistss) {
        return res
          .status(409)
          .json({ success: false, message: "Already assigned CNR." });
      }
      unsavedCnr.userId.push({
        userId,
        externalUserName,
        externalUserId,
        jointUser,
      });
      unsavedCnr.status = "priority";
      await unsavedCnr.save();
      return res.status(201).json({
        success: true,
        message: "CNR details will be available shortly.",
      });
    }
    const newCnr = new UnsavedCnr({
      cnrNumber,
      userId: [{ userId, externalUserName, externalUserId, jointUser }],
      status: "priority",
    });
    await newCnr.save();
    return res.status(201).json({
      success: true,
      message: "CNR details will be available shortly.",
    });
  } catch (error) {
    console.error("Error adding new CNR details:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error occurred while processing the request.",
    });
  }
};

export const AddNewBulkCnr = async (req, res) => {
  const { token } = req.headers;
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Token is missing." });
  }
  const { externalUserName, externalUserId } = req.body;
  if (!req.file) {
    fs.unlinkSync(req.file.path);
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded." });
  }
  if (!externalUserId || !externalUserName) {
    fs.unlinkSync(req.file.path);
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields." });
  }
  try {
    const tokenParts = token.split(" ");
    const decodedToken = jwt.verify(tokenParts[1], process.env.JWT_SECRET_KEY);
    if (!decodedToken) {
      fs.unlinkSync(req.file.path);
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token verification failed.",
      });
    }
    const userId = decodedToken.id;
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const cnrData = xlsx.utils.sheet_to_json(sheet);
    if (cnrData.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Excel file is empty" });
    }
    for (let i = 0; i < cnrData.length; i++) {
      const cnrNumber = cnrData[i]?.["CNR NO."];
      if (!cnrNumber) {
        continue;
      }
      const jointUser = [];
      for (let j = 1; j <= 8; j++) {
        const name = cnrData[i][`user${j}name`];
        const email = cnrData[i][`user${j}email`];
        const mobile = cnrData[i][`user${j}mobile`];
        const dayBeforeNotification = parseInt(
          cnrData[i][`user${j}daybeforenotification`] || 4
        );

        if (email || mobile) {
          jointUser.push({
            name: name || "",
            email: email ? String(email) : "",
            mobile: mobile ? String(mobile) : "",
            dayBeforeNotification: Math.min(
              parseInt(dayBeforeNotification) || 4,
              4
            ),
          });
        }
      }
      if (cnrNumber.length !== 16) {
        const newCnr = new UnsavedCnr({
          cnrNumber,
          userId: [{ userId, externalUserName, externalUserId, jointUser }],
          status: "invalidcnr",
        });
        await newCnr.save();
        continue;
      }

      const cnrDetail = await CnrDetail.findOne({ cnrNumber: cnrNumber });
      if (cnrDetail) {
        const userCnrExists = cnrDetail.userId.some(
          (user) => user.userId === userId
        );
        if (userCnrExists) {
          continue;
        }
        let obj = {
          userId: userId,
          externalUserName: externalUserName,
          externalUserId: externalUserId,
          jointUser,
        };
        cnrDetail.userId.push(obj);
        await cnrDetail.save();
        const unsavedCnrs = await UnsavedCnr.findOne({ cnrNumber });
        if (unsavedCnrs) {
          const userCnrExistsss = unsavedCnrs.userId.some(
            (user) => user.userId === userId
          );
          if (!userCnrExistsss) {
            unsavedCnrs.userId.push({
              userId,
              externalUserName,
              externalUserId,
              jointUser,
            });
            await unsavedCnrs.save();
          }
        } else {
          const newCnr = new UnsavedCnr({
            cnrNumber,
            userId: [{ userId, externalUserName, externalUserId, jointUser }],
            status: "processed",
          });
          await newCnr.save();
        }
      } else {
        const newCnrDetail = await UnsavedCnr.findOne({ cnrNumber: cnrNumber });
        if (newCnrDetail) {
          const userCnrExistss = newCnrDetail.userId.some(
            (user) => user.userId === userId
          );
          if (userCnrExistss) {
            continue;
          }
          newCnrDetail.userId.push({
            userId,
            externalUserName,
            externalUserId,
            jointUser,
          });
          newCnrDetail.status = "pending";
          await newCnrDetail.save();
        } else {
          const newCnr = new UnsavedCnr({
            cnrNumber,
            userId: [{ userId, externalUserName, externalUserId, jointUser }],
            status: "pending",
          });
          await newCnr.save();
        }
      }
    }
    const nnuser = await ExternalUser.findById(externalUserId);
    nnuser.noOfAssigncases = nnuser.noOfAssigncases + cnrData.length;
    await nnuser.save();
    fs.unlinkSync(req.file.path);
    return res
      .status(201)
      .json({ success: true, message: "Cnr details are being processing." });
  } catch (error) {
    console.error("Error adding new Cnr details:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

export const getSingleCnr = async (req, res) => {
  const { cnrNumber } = req.params;
  try {
    const cnrDetail = await CnrDetail.findOne({ cnrNumber: cnrNumber });
    if (!cnrDetail) {
      return res
        .status(404)
        .json({ success: false, message: "No Cnr details found." });
    }
    return res.status(200).json({ success: true, data: cnrDetail });
  } catch (error) {
    console.error("Error getting single Cnr:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
