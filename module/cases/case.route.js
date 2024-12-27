import { Router } from "express";
import {
  AddNewBulkCnr,
  AddNewSingleCnr,
  getCnrDetails,
  getDisposedCnrDetails,
  getSingleCnr,
  getUnsavedCnrDetails,
} from "./case.controller.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  delteSingleCnr,
  getAllArchivedCnrs,
  permanentlyDeleteCnr,
  restoreSingleCnr,
} from "./casedelterestore.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

const upload = multer({
  storage: storage,
});

export const cnrRoute = Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

cnrRoute.get("/get-cnr", asyncHandler(getCnrDetails));

cnrRoute.get("/get-disposed-cnr", asyncHandler(getDisposedCnrDetails));

cnrRoute.get("/get-unsaved-cnr", getUnsavedCnrDetails);

cnrRoute.post("/addnew-singlecnr", asyncHandler(AddNewSingleCnr));

cnrRoute.get("/get-singlecnr/:cnrNumber", getSingleCnr);

cnrRoute.post(
  "/addnew-bulkcnr",
  upload.single("excelFile"),
  asyncHandler(AddNewBulkCnr)
);

cnrRoute.delete("/delte-cnr/:cnrNumber", delteSingleCnr);

cnrRoute.put("/restore-cnr/:cnrNumber", restoreSingleCnr);

cnrRoute.get("/get-archive-cnr", getAllArchivedCnrs);

cnrRoute.delete("/permanently-delete-cnr/:cnrNumber", permanentlyDeleteCnr);
