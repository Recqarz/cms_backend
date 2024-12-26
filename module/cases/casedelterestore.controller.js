import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { CnrDetail } from "./case.model.js";
import { ExternalUser } from "../externalUser/externaluser.model.js";

export const delteSingleCnr = async (req, res) => {
  const { cnrNumber } = req.params;
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  try {
    const decodedToken = jwt.verify(
      token.split(" ")[1],
      process.env.JWT_SECRET_KEY
    );
    if (!decodedToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const userId = decodedToken.id;
    const cnrDetails = await CnrDetail.findOne({ cnrNumber: cnrNumber });
    if (!cnrDetails) {
      return res
        .status(404)
        .json({ success: false, message: "CNR Number not found" });
    }
    const userIndex = cnrDetails.userId.findIndex(
      (user) => user.userId === userId
    );
    if (userIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "User ID not found in this CNR" });
    }
    const [removedUser] = cnrDetails.userId.splice(userIndex, 1);
    removedUser.expireTime = Date.now()+ (1000*60*60*24*30);
    cnrDetails.archive.push(removedUser);
    await cnrDetails.save();
    return res
      .status(200)
      .json({ success: true, message: "CNR successfully archived" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const restoreSingleCnr = async (req, res) => {
  const { cnrNumber } = req.params;
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  try {
    const decodedToken = jwt.verify(
      token.split(" ")[1],
      process.env.JWT_SECRET_KEY
    );
    if (!decodedToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const userId = decodedToken.id;
    const cnrDetails = await CnrDetail.findOne({ cnrNumber: cnrNumber });
    if (!cnrDetails) {
      return res
        .status(404)
        .json({ success: false, message: "CNR Number not found" });
    }
    const archivedUserIndex = cnrDetails.archive.findIndex(
      (user) => user.userId === userId
    );
    if (archivedUserIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "User ID not found in archived CNR" });
    }
    const [restoredUser] = cnrDetails.archive.splice(archivedUserIndex, 1);
    delete restoredUser.expireTime;
    cnrDetails.userId.push(restoredUser);
    await cnrDetails.save();
    return res
      .status(200)
      .json({ success: true, message: "CNR successfully restored" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getAllArchivedCnrs = async (req, res) => {
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  try {
    const decodedToken = jwt.verify(
      token.split(" ")[1],
      process.env.JWT_SECRET_KEY
    );
    if (!decodedToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const userId = decodedToken.id;

    const cnrDetails = await CnrDetail.find({ "archive.userId": userId });

    if (!cnrDetails || cnrDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No archived CNRs found for this user",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Archived CNRs retrieved successfully",
      cnrDetails,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const permanentlyDeleteCnr = async (req, res) => {
  const { cnrNumber } = req.params;
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  try {
    const decodedToken = jwt.verify(
      token.split(" ")[1],
      process.env.JWT_SECRET_KEY
    );
    if (!decodedToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const userId = decodedToken.id;
    const cnrDetails = await CnrDetail.findOne({ cnrNumber: cnrNumber });
    if (!cnrDetails) {
      return res
        .status(404)
        .json({ success: false, message: "CNR Number not found" });
    }

    const archivedUserIndex = cnrDetails.archive.findIndex(
      (user) => user.userId === userId
    );
    const archivedUser = cnrDetails.archive.filter(
      (user) => user.userId === userId
    );
    const externaluser = await ExternalUser.findById(
      archivedUser[0].externalUserId
    );
    if (!externaluser) {
      return res
        .status(404)
        .json({ success: false, message: "External User not found" });
    }
    externaluser.noOfAssigncases -= 1;
    await externaluser.save();
    if (archivedUserIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "User ID not found in archived CNR" });
    }

    cnrDetails.archive.splice(archivedUserIndex, 1);

    await cnrDetails.save();
    return res.status(200).json({
      success: true,
      message: "CNR successfully permanently deleted from archive",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
