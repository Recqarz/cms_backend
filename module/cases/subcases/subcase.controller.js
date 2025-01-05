import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { CnrDetail } from "../case.model.js";
import { User } from "../../users/user.model.js";

const parseDate = (dateString) => {
  if (!dateString) return null;
  try {
    const cleanDateString = dateString
      .replace(/(\d+)(st|nd|rd|th)/i, "$1")
      .trim();
    const parsedDate = new Date(cleanDateString);
    if (isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  } catch (error) {
    console.error("Error parsing date:", error.message);
    return null;
  }
};

function cleanPetitionerName(petitionerString) {
  if (!petitionerString) return null;

  try {
    const nameMatch = petitionerString.match(/^\d+\)\s*([^-]+)/);
    if (nameMatch) {
      return nameMatch[1].trim();
    }
    return petitionerString.trim();
  } catch (error) {
    console.error("Error cleaning petitioner name:", error.message);
    return null;
  }
}

const validatePaginationParams = (pageNo, pageLimit) => {
  const parsedPageNo = parseInt(pageNo, 10);
  const parsedPageLimit = parseInt(pageLimit, 10);
  if (isNaN(parsedPageNo) || parsedPageNo < 1) {
    throw new Error("Invalid page number");
  }
  if (isNaN(parsedPageLimit) || parsedPageLimit < 1) {
    throw new Error("Invalid page limit");
  }
  return { parsedPageNo, parsedPageLimit };
};

const applySorting = (data, sortParams) => {
  const { nextHearing, petitioner, respondent } = sortParams;
  let sortedData = [...data];
  try {
    if (nextHearing === "1" || nextHearing === "-1") {
      sortedData = sortedData.sort((a, b) => {
        const dateA = parseDate(a.caseStatus?.[1]?.[1]);
        const dateB = parseDate(b.caseStatus?.[1]?.[1]);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
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
        if (!petitionerA && !petitionerB) return 0;
        if (!petitionerA) return 1;
        if (!petitionerB) return -1;
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
        if (!respondentA && !respondentB) return 0;
        if (!respondentA) return 1;
        if (!respondentB) return -1;
        return respondent === "1"
          ? respondentA.localeCompare(respondentB)
          : respondentB.localeCompare(respondentA);
      });
    }

    return sortedData;
  } catch (error) {
    console.error("Error during sorting:", error.message);
    return data;
  }
};

const buildFilterQuery = (email, filterOption, filterText) => {
  const filterQuery = {
    "userId.jointUser.email": email,
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
      [field]: {
        $regex: new RegExp(
          filterText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"),
          "i"
        ),
      },
    }));
  }
  return filterQuery;
};
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

  try {
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required.",
      });
    }
    let isVerify;
    try {
      isVerify = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET_KEY);
    } catch (error) {
      console.error("JWT verification error:", error.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }
    let parsedPageNo, parsedPageLimit;
    try {
      const validated = validatePaginationParams(pageNo, pageLimit);
      parsedPageNo = validated.parsedPageNo;
      parsedPageLimit = validated.parsedPageLimit;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    const curruser = await User.findById(isVerify.id);
    const filterQuery = buildFilterQuery(
      curruser.email,
      filterOption,
      filterText
    );
    const data = await CnrDetail.find(filterQuery).lean().exec();

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No CNR details found for the given criteria.",
      });
    }
    const sortedData = applySorting(data, {
      nextHearing,
      petitioner,
      respondent,
    });
    const startIndex = (parsedPageNo - 1) * parsedPageLimit;
    const endIndex = startIndex + parsedPageLimit;
    const paginatedData = sortedData.slice(startIndex, endIndex);
    const updatedData = await Promise.all(
      paginatedData.map(async (item) => {
        const itemObject = item;

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
    return res.status(200).json({
      success: true,
      data: updatedData,
      message: "CNR details retrieved successfully.",
      pageSize: Math.ceil(sortedData.length / parsedPageLimit),
    });
  } catch (error) {
    console.error("Error in getCnrDetails:", error.stack);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred. Please try again later.",
    });
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

  try {
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required.",
      });
    }
    let isVerify;
    try {
      isVerify = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET_KEY);
    } catch (error) {
      console.error("JWT verification error:", error.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }
    let parsedPageNo, parsedPageLimit;
    try {
      const validated = validatePaginationParams(pageNo, pageLimit);
      parsedPageNo = validated.parsedPageNo;
      parsedPageLimit = validated.parsedPageLimit;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    const curruser = await User.findById(isVerify.id);
    const filterQuery = buildFilterQuery(
      curruser.email,
      filterOption,
      filterText
    );
    const data = await CnrDetail.find(filterQuery).lean().exec();

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No CNR details found for the given criteria.",
      });
    }
    const sortedData = applySorting(data, {
      nextHearing,
      petitioner,
      respondent,
    });
    const startIndex = (parsedPageNo - 1) * parsedPageLimit;
    const endIndex = startIndex + parsedPageLimit;
    const paginatedData = sortedData.slice(startIndex, endIndex);
    const updatedData = await Promise.all(
      paginatedData.map(async (item) => {
        const itemObject = item;

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
    return res.status(200).json({
      success: true,
      data: updatedData,
      message: "CNR details retrieved successfully.",
      pageSize: Math.ceil(sortedData.length / parsedPageLimit),
    });
  } catch (error) {
    console.error("Error in getCnrDetails:", error.stack);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred. Please try again later.",
    });
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
