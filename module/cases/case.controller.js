import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { CnrDetail } from "./case.model.js";
import { UnsavedCnr } from "./unSavedCnr/unSavedCnr.js";
import fs from "fs";
import xlsx from "xlsx";
import { ExternalUser } from "../externalUser/externaluser.model.js";
import { User } from "../users/user.model.js";

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

const buildFilterQuery = (userId, filterOption, filterText) => {
  const filterQuery = {
    "userId.userId": userId,
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
    const filterQuery = buildFilterQuery(isVerify.id, filterOption, filterText);
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
    for (let i = 0; i < paginatedData.length; i++) {
      const userArray = paginatedData[i].userId;
      const customer = userArray
        .filter((user) => user.userId === isVerify.id)
        .flatMap((user) => user.customer || []);
      paginatedData[i].customer = customer;
    }
    return res.status(200).json({
      success: true,
      data: paginatedData,
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
    const filterQuery = buildFilterQuery(isVerify.id, filterOption, filterText);
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
    for (let i = 0; i < paginatedData.length; i++) {
      const userArray = paginatedData[i].userId;
      const customer = userArray
        .filter((user) => user.userId === isVerify.id)
        .flatMap((user) => user.customer || []);
      paginatedData[i].customer = customer;
    }
    return res.status(200).json({
      success: true,
      data: paginatedData,
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
  let { cnrNumber, externalUserName, externalUserId, jointUser, customer } =
    req.body;
  jointUser = jointUser
    .filter((ele) => ele.email && ele.mobile)
    .map((ele) => ({
      name: ele?.name || "",
      email: ele?.email,
      mobile: ele?.mobile,
      dayBeforeNotification: Math.min(
        parseInt(ele?.dayBeforeNotification) || 4,
        4
      ),
    }));

  customer = customer
    .filter((ele) => (ele.email || ele.mobile) && ele.loandId)
    .map((ele) => ({
      name: ele?.name || "",
      email: ele?.email || "",
      mobile: ele?.mobile || "",
      loanId: ele?.loanId,
      address: ele?.address || "",
    }));
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
        userId: [
          { userId, externalUserName, externalUserId, jointUser, customer },
        ],
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
      const currentUser = await User.findById(userId);
      const subUserCnrExists = existingCnr.userId.some((userObj) =>
        userObj.jointUser.some((user) => user.email === currentUser.email)
      );
      if (subUserCnrExists) {
        console.log(subUserCnrExists);
        return res.status(409).json({
          success: false,
          message: "Already assigned to as sub user.",
        });
      }
      existingCnr.userId.push({
        userId,
        externalUserName,
        externalUserId,
        jointUser,
        customer,
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
            customer,
          });
          await unsavedCnrs.save();
        }
      } else {
        const newCnr = new UnsavedCnr({
          cnrNumber,
          userId: [
            { userId, externalUserName, externalUserId, jointUser, customer },
          ],
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
        customer,
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
      userId: [
        { userId, externalUserName, externalUserId, jointUser, customer },
      ],
      status: "priority",
    });
    // create the joint userId and send the email to the joint user

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
      const cnrNumber = cnrData[i]?.["CNR NO."]?.trim();
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

        if (email && mobile && name) {
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

      const customer = [];

      for (let k = 1; k <= 4; k++) {
        const customerData = cnrData[k] || {}; 
        const name = customerData[`customer${k}name`] || "";
        const email = customerData[`customer${k}email`] || "";
        const mobile = customerData[`customer${k}mobile`] || "";
        const loanId = customerData[`customer${k}loanid`] || "";
        const address = customerData[`customer${k}address`] || "";
        if ((email || mobile) && loanId) {
          customer.push({
            name: String(name),
            email: String(email),
            mobile: String(mobile),
            loanId: String(loanId),
            address: String(address),
          });
        }
      }
      if (cnrNumber.length !== 16) {
        const newCnr = new UnsavedCnr({
          cnrNumber,
          userId: [
            { userId, externalUserName, externalUserId, jointUser, customer },
          ],
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
        const currentUser = await User.findById(userId);
        const subUserCnrExists = cnrDetail.userId.some((userObj) =>
          userObj.jointUser.some((user) => user.email === currentUser.email)
        );
        if (subUserCnrExists) {
          continue;
        }
        let obj = {
          userId: userId,
          externalUserName: externalUserName,
          externalUserId: externalUserId,
          jointUser,
          customer,
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
              customer,
            });
            await unsavedCnrs.save();
          }
        } else {
          const newCnr = new UnsavedCnr({
            cnrNumber,
            userId: [
              { userId, externalUserName, externalUserId, jointUser, customer },
            ],
            status: "processed",
          });
          await newCnr.save();
        }
        const nnuser = await ExternalUser.findById(externalUserId);
        nnuser.noOfAssigncases = nnuser.noOfAssigncases + 1;
        await nnuser.save();
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
            customer,
          });
          newCnrDetail.status = "pending";
          await newCnrDetail.save();
          const nnuser = await ExternalUser.findById(externalUserId);
          nnuser.noOfAssigncases = nnuser.noOfAssigncases + 1;
          await nnuser.save();
        } else {
          const newCnr = new UnsavedCnr({
            cnrNumber,
            userId: [
              { userId, externalUserName, externalUserId, jointUser, customer },
            ],
            status: "pending",
          });
          await newCnr.save();
          const nnuser = await ExternalUser.findById(externalUserId);
          nnuser.noOfAssigncases = nnuser.noOfAssigncases + 1;
          await nnuser.save();
        }
      }
    }
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
  const { token } = req.headers;
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Token is missing." });
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
    const cnrDetail = await CnrDetail.findOne({ cnrNumber: cnrNumber });
    if (!cnrDetail) {
      return res
        .status(404)
        .json({ success: false, message: "No Cnr details found." });
    }
    const jointUsers = cnrDetail.userId
      .filter((user) => user.userId === userId)
      .flatMap((user) => user.jointUser || []);
    const customer = cnrDetail.userId
      .filter((user) => user.userId === userId)
      .flatMap((user) => user.customer || []);
    return res
      .status(200)
      .json({ success: true, data: cnrDetail, jointUsers, customer });
  } catch (error) {
    console.error("Error getting single Cnr:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
