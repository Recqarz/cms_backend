import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { Document } from "../document.model.js";
import { User } from "../../users/user.model.js";
import { CnrDetail } from "../../cases/case.model.js";
import fs from "fs";
import { uploadFileToS3 } from "../awsupload/awsupload.js";

export const getSubDocument = async (req, res) => {
  const { token } = req.headers;
  const { searchCNR, pageLimit = 10, currentPage = 1 } = req.query;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized", success: false });
  }
  try {
    const decodedToken = jwt.verify(
      token.split(" ")[1],
      process.env.JWT_SECRET_KEY
    );
    if (!decodedToken) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }
    const curruser = await User.findById(decodedToken.id);
    const query = { "jointUser.email": curruser.email };
    if (searchCNR) {
      query.cnrNumber = searchCNR;
    }
    const document = await Document.find(query);
    if (!document) {
      return res
        .status(404)
        .json({ message: "No document found", success: false });
    }
    const startIndex =
      (parseInt(currentPage, 10) - 1) * parseInt(pageLimit, 10);
    const endIndex = startIndex + parseInt(pageLimit, 10);
    const paginatedData = document.slice(startIndex, endIndex);
    const pageSize = Math.ceil(document.length / parseInt(pageLimit));
    return res.json({
      message: "Document retrieved successfully",
      success: true,
      data: document,
      pageSize: pageSize,
    });
  } catch (error) {
    console.error("Error retrieving document:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", success: false });
  }
};

export const addSubDocument = async (req, res) => {
  try {
    const { cnrNumber, mainUserId } = req.body;
    const { token } = req.headers;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    if (!cnrNumber) {
      return res
        .status(400)
        .json({ message: "CNR number is required", success: false });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "No file uploaded or invalid file type",
        success: false,
      });
    }
    const decodedToken = jwt.verify(
      token.split(" ")[1],
      process.env.JWT_SECRET_KEY
    );
    if (!decodedToken) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }
    const document = await Document.findOne({
      userId: mainUserId,
      cnrNumber,
    });
    if (document) {
      req.files.forEach((file) => fs.unlinkSync(file.path));
      return res.status(400).json({
        message: "Document already exists for this CNR number",
        success: false,
      });
    }
    const user = await User.findById(decodedToken.id);
    const cnrDetails = await CnrDetail.findOne({ cnrNumber });
    if (!cnrDetails) {
      req.files.forEach((file) => fs.unlinkSync(file.path));
      return res.status(404).json({
        message: "CNR number not found",
        success: false,
      });
    }
    const userCnrExists = cnrDetails.userId.some(
      (user) => user.userId === mainUserId
    );
    if (!userCnrExists) {
      req.files.forEach((file) => fs.unlinkSync(file.path));
      return res.status(403).json({
        message: "User does not have access to this CNR number",
        success: false,
      });
    }

    const attachments = [];
    const fileNames = req.body.fileNames || [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const filePath = file.path;
      const name = Array.isArray(fileNames)
        ? fileNames[i]
        : fileNames || file.originalname;
      try {
        if (file.size > 50 * 1024 * 1024) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            message: "File size exceeds limit of 50MB",
            success: false,
          });
        }
        const s3Response = await uploadFileToS3(filePath, file.originalname);
        attachments.push({
          name: name,
          url: s3Response.Location,
          uploadedBy: user.name,
        });
        fs.unlinkSync(filePath);
      } catch (uploadError) {
        console.error("Error uploading file to S3:", uploadError);
        req.files.forEach((file) => fs.unlinkSync(file.path));
        return res.status(500).json({
          message: "Error uploading file to S3",
          success: false,
        });
      }
    }
    function cleanFirstLine(text) {
      const firstLine = text.split("\n")[0].trim();
      return firstLine.replace(/^\d+\)\s*/, "").trim();
    }
    const cleanedRespondent =
      cleanFirstLine(cnrDetails?.respondentAndAdvocate[0][0]) || "";
    const cleanedPetitioner =
      cleanFirstLine(cnrDetails?.petitionerAndAdvocate[0][0]) || "";
    const jointUsers = cnrDetails.userId
      .filter((user) => user.userId === mainUserId)
      .flatMap((user) => user.jointUser || []);
    const newDocument = await Document.create({
      cnrNumber,
      documents: attachments,
      userId: mainUserId,
      noOfDocument: attachments.length,
      respondent: cleanedRespondent,
      petitioner: cleanedPetitioner,
      jointUser: jointUsers,
    });
    return res.json({
      message: "Documents uploaded successfully",
      success: true,
      document: newDocument,
    });
  } catch (error) {
    console.error("Error uploading documents:", error);
    req.files.forEach((file) => fs.unlinkSync(file.path));
    return res
      .status(500)
      .json({ message: "Internal Server Error", success: false });
  }
};
