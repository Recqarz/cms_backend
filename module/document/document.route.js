import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  addDocument,
  addMoreDocument,
  deleteDocument,
  getDocument,
  getDocumentOfSingleCnr,
  getDocumentOfSingleSubCnr,
} from "./document.controller.js";
import { addSubDocument, getSubDocument } from "./subDocument/subdocument.js";

export const documentRoute = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "./uploads");
    if (!fs.existsSync(uploadPath)) {
      try {
        fs.mkdirSync(uploadPath, { recursive: true });
      } catch (err) {
        console.error("Failed to create upload directory:", err);
        return cb(err);
      }
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage });

documentRoute.post(
  "/add-document",
  upload.array("files"),
  asyncHandler(addDocument)
);

documentRoute.post(
  "/add-sub-document",
  upload.array("files"),
  asyncHandler(addSubDocument)
);

documentRoute.post(
  "/add-more-document",
  upload.array("files"),
  asyncHandler(addMoreDocument)
);

documentRoute.get("/get-document", getDocument);

documentRoute.delete("/delete-document", deleteDocument);

documentRoute.get("/get-sub-document", getSubDocument);

documentRoute.get(
  "/get-document-of-single-sub-cnr/:cnrNumber",
  getDocumentOfSingleSubCnr
);

documentRoute.get(
  "/get-document-of-single-cnr/:cnrNumber",
  getDocumentOfSingleCnr
);
