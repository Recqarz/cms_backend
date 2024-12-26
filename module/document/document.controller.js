import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import fs from "fs";
import { Document } from "./document.model.js";
import { uploadFileToS3 } from "./awsupload/awsupload.js";

export const addDocument = async (req, res) => {
  try {
    const { cnrNumber } = req.body;
    const { token } = req.headers;
    if (!token) {
      fs.unlinkSync(req.file.path);
      return res.status(401).json({ message: "Unauthorized", success: false });
    }
    if (!cnrNumber) {
      return res
        .status(400)
        .json({ message: "CNR number is required", success: false });
    }
    if (!req.file) {
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
      fs.unlinkSync(req.file.path);
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    const s3Response = await uploadFileToS3(filePath, fileName);

    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting file:", err);
    });
    const newDocument = await Document.create({
      cnrNumber,
      docLink: s3Response.Location,
      userId: decodedToken.id,
    });
    return res.json({
      message: "Document uploaded successfully",
      success: true,
      document: newDocument,
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    fs.unlinkSync(req.file.path);
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
