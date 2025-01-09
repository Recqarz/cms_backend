import { Router } from "express";
import { getTodos, addTodo, editTodo, deleteTodo, getExpireTodos, editExpireTodo } from "./todo.controller.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";


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

export const todoRoutes = Router();

todoRoutes.get("/get-alltask", getTodos);

todoRoutes.get("/get-expired-todos", getExpireTodos);

todoRoutes.post("/add-task", upload.array("files"), asyncHandler(addTodo));

todoRoutes.put("/edit-task/:id", editTodo);

todoRoutes.put("/edit-expire-task/:id", editExpireTodo);

todoRoutes.delete("/delete-task/:id", deleteTodo);
