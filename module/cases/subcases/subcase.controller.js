import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { CnrDetail } from "../case.model.js";
import { User } from "../../users/user.model.js";

function parseDate(dateString) {
  if (!dateString) return null;
  try {
    const cleanDateString = dateString.replace(/(\d+)(st|nd|rd|th)/i, "$1");
    return new Date(cleanDateString);
  } catch (error) {
    console.error("Error parsing date:", error.message);
    return null;
  }
}

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

export const getSubCnrDetails = async (req, res) => {
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
    const curruser = await User.findById(isVerify.id);
    const filterQuery = {
      "userId.jointUser.email": curruser.email,
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
    const updatedData = await Promise.all(
      data.map(async (item) => {
        const itemObject = item?.toObject() || {};

        const userIdObj = itemObject.userId?.find((u) =>
          u?.jointUser?.some((j) => j?.email === curruser?.email)
        );

        if (userIdObj?.userId) {
          const user = (await User.findById(userIdObj.userId).lean()) || {};
          itemObject.mainUserId = userIdObj.userId;
          itemObject.mainUserName = user.name || "";
        }

        return itemObject;
      })
    );
    let sortedData = updatedData;
    if (nextHearing === "1" || nextHearing === "-1") {
      sortedData = updatedData.sort((a, b) => {
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

export const getDisposedSubCnrDetails = async (req, res) => {
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
    const curruser = await User.findById(isVerify.id);
    const filterQuery = {
      "userId.jointUser.email": curruser.email,
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
    const updatedData = await Promise.all(
      data.map(async (item) => {
        const itemObject = item?.toObject() || {};

        const userIdObj = itemObject.userId?.find((u) =>
          u?.jointUser?.some((j) => j?.email === curruser?.email)
        );

        if (userIdObj?.userId) {
          const user = (await User.findById(userIdObj.userId).lean()) || {};
          itemObject.mainUserId = userIdObj.userId;
          itemObject.mainUserName = user.name || "";
        }

        return itemObject;
      })
    );
    let sortedData = updatedData;
    if (nextHearing === "1" || nextHearing === "-1") {
      sortedData = updatedData.sort((a, b) => {
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

export const getSingleSubCnr = async (req, res) => {
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
