const express = require("express");
const { upload, uploadFile } = require("../controllers/fileController");

const router = express.Router();

// Route to handle file upload
router.post("/upload", upload, uploadFile);

module.exports = router;
