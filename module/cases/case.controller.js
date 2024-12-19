import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { CnrDetail } from "./case.model.js";
import { UnsavedCnr } from "./unSavedCnr/unSavedCnr.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import xlsx from "xlsx";
import { ExternalUser } from "../externalUser/externaluser.model.js";

export const getCnrDetails = async (req, res) => {
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }
  const { pageNo = 1, pageLimit = 10 } = req.query;
  try {
    const isVerify = jwt.verify(
      token?.split(" ")[1],
      process.env.JWT_SECRET_KEY
    );
    if (!isVerify) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    const count = await CnrDetail.countDocuments({
      userId: { $in: [isVerify.id] },
    });
    let pageSize = Math.floor(count / pageLimit);
    const cnr = await CnrDetail.find({
      userId: { $elemMatch: { userId: isVerify.id } },
    })
      .skip((pageNo - 1) * pageLimit)
      .limit(pageLimit);

    if (!cnr) {
      return res
        .status(404)
        .json({ success: false, message: "No Cnr details found." });
    }
    return res.status(200).json({
      success: true,
      data: cnr,
      message: "Cnr details found.",
      pageSize,
    });
  } catch (error) {
    console.error("Error getting Cnr details:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

export const AddNewSingleCnr = async (req, res) => {
  const { cnrNumber, userId, externalUserName, externalUserId } = req.body;
  if (!cnrNumber || !userId || !externalUserName || !externalUserId) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields." });
  }
  try {
    const cnrDetail = await cnrDetail.findOne({ cnrNumber: cnrNumber });
    if (cnrDetail) {
      let obj = {
        userId: userId,
        externalUserName: externalUserName,
        externalUserId: externalUserId,
      };
      cnrDetail.userId.push(obj);
      await cnrDetail.save();
      const nnuser = await ExternalUser.findById(externalUserId);
      nnuser.noOfAssigncases = nnuser.noOfAssigncases + 1;
      await nnuser.save();
      return res
        .status(201)
        .json({ success: true, message: "Cnr details added successfully." });
    } else {
      const newCnrDetail = await UnsavedCnr.findOne({ cnrNumber: cnrNumber });
      if (newCnrDetail) {
        newCnrDetail.userId.push({ userId, externalUserName, externalUserId });
        newCnrDetail.status = "priority";
        await newCnrDetail.save();
        return res.status(201).json({
          success: true,
          message: "Cnr details will avaliable shortly.",
        });
      } else {
        const newCnr = new CnrDetail({
          cnrNumber,
          userId: [{ userId, externalUserName, externalUserId }],
          status: "priority",
        });
        await newCnr.save();
        return res.status(201).json({
          success: true,
          message: "Cnr details will avaliable shortly.",
        });
      }
    }
  } catch (error) {
    console.error("Error adding new Cnr details:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

export const AddNewBulkCnr = async (req, res) => {
  const { userId, externalUserName, externalUserId } = req.body;
  if (!req.file) {
    fs.unlinkSync(req.file.path);
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded." });
  }
  if (!userId || !externalUserId || !externalUserName) {
    fs.unlinkSync(req.file.path);
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields." });
  }
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const cnrData = xlsx.utils.sheet_to_json(sheet);

    if (cnrData.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Excel file is empty" });
    }
    for (let i = 0; i < cnrData.length; i++) {
      const cnrNumber = cnrData[i]?.cnrNumber;
      const cnrDetail = await cnrDetail.findOne({ cnrNumber: cnrNumber });
      if (cnrDetail) {
        let obj = {
          userId: userId,
          externalUserName: externalUserName,
          externalUserId: externalUserId,
        };
        cnrDetail.userId.push(obj);
        await cnrDetail.save();
      } else {
        const newCnrDetail = await UnsavedCnr.findOne({ cnrNumber: cnrNumber });
        if (newCnrDetail) {
          newCnrDetail.userId.push({
            userId,
            externalUserName,
            externalUserId,
          });
          newCnrDetail.status = "pending";
          await newCnrDetail.save();
        } else {
          const newCnr = new CnrDetail({
            cnrNumber,
            userId: [{ userId, externalUserName, externalUserId }],
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
      .json({ success: true, message: "Cnr details is being processing." });
  } catch (error) {
    console.error("Error adding new Cnr details:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
