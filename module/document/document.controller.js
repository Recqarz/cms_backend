import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import fs from "fs";
import { Document } from "./document.model.js";
import { uploadFileToS3 } from "./awsupload/awsupload.js";
import { CnrDetail } from "../cases/case.model.js";
import { User } from "../users/user.model.js";

export const addDocument = async (req, res) => {
  try {
    const { cnrNumber } = req.body;
    const { token } = req.headers;
    if (!token) {
      req.files.forEach((file) => fs.unlinkSync(file.path));
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
      req.files.forEach((file) => fs.unlinkSync(file.path));
      return res.status(401).json({ message: "Unauthorized", success: false });
    }
    const user = await User.findById(decodedToken.id);
    const attachments = [];
    const fileName = req.body.fileNames;
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const filePath = file.path;
      const name = Array.isArray(fileName)
        ? fileName[i]
        : fileName
        ? fileName
        : file.originalname;

      try {
        const s3Response = await uploadFileToS3(filePath, fileName);
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
      const cleanedLine = firstLine.replace(/^\d+\)\s*/, "").trim();
      return cleanedLine;
    }
    const cnrDetails = await CnrDetail.findOne({
      cnrNumber: cnrNumber,
    });
    const cleanedrespondent =
      cleanFirstLine(cnrDetails?.respondentAndAdvocate[0][0]) || "";
    const cleanedpetitioner =
      cleanFirstLine(cnrDetails?.petitionerAndAdvocate[0][0]) || "";
    const newDocument = await Document.create({
      cnrNumber,
      documents: attachments,
      userId: decodedToken.id,
      noOfDocument: attachments.length,
      respondent: cleanedrespondent,
      petitioner: cleanedpetitioner,
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

export const getDocument = async (req, res) => {
  const { token } = req.headers;
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
    const document = await Document.find({ userId: decodedToken.id });
    if (!document) {
      return res
        .status(404)
        .json({ message: "No document found", success: false });
    }
    return res.json({
      message: "Document retrieved successfully",
      success: true,
      data: document,
    });
  } catch (error) {
    console.error("Error retrieving document:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", success: false });
  }
};