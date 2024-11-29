const expressAsyncHandler = require("express-async-handler");
const CnrFile = require("../models/cnrFile");
const User = require("../models/userModel");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const xlsx = require('xlsx');

// Max file size limit (e.g., 5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

// Setup multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/files";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Multer upload setup with file size limit and file type validation
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE, // Limit file size to 5MB
  },
  fileFilter: (req, file, cb) => {
    const fileTypes = /xlsx/; // Allow only .xlsx files
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; // Check MIME type for XLSX

    if (extname && mimeType) {
      return cb(null, true); // Accept file if valid
    } else {
      return cb(new Error("Only XLSX files are allowed."), false); // Reject invalid files
    }
  },
}).single("file");

// Controller to handle file upload
const uploadFile = expressAsyncHandler(async (req, res) => {
  const { userID } = req.body;

  if (!userID || !req.file) {
    return res.status(400).json({ success: false, message: "UserID and file are required." });
  }

  // Check if user exists
  const user = await User.findById(userID);
  if (!user) {
    return res.status(400).json({ success: false, message: "User not found." });
  }

  // Read the uploaded .xlsx file
  const filePath = req.file.path;
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Assuming the file has at least one sheet
    const sheet = workbook.Sheets[sheetName];

    // Convert sheet data to JSON
    const sheetData = xlsx.utils.sheet_to_json(sheet);

    // Check if cnr_number header exists in every row
    const missingHeader = sheetData.some(row => !row.hasOwnProperty('cnr_number'));

    if (missingHeader) {
      return res.status(400).json({ success: false, message: "One or more rows do not contain 'cnr_number' header." });
    }

    // Create a new file record in the database
    const newFile = new CnrFile({
      filename: req.file.filename,
      userID,
      filePath: req.file.path,
    });

    // Save file record to DB
    await newFile.save();
    res.status(201).json({ success: true, message: "File uploaded successfully.", file: newFile });
  } catch (error) {
    console.error("Error processing the file:", error);
    res.status(500).json({ success: false, message: "Failed to upload file." });
  }
});

// Export the upload function and multer instance
module.exports = { upload, uploadFile };
