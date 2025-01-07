import { Task } from "./todo.model.js";
import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { CnrDetail } from "../cases/case.model.js";
import { uploadFileToS3 } from "../document/awsupload/awsupload.js";

export const getTodos = async (req, res) => {
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No token provided",
    });
  }
  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET_KEY);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid token",
      });
    }
    const userId = decoded.id;
    const lowtasks = await Task.find({ userId , priority:"low"});
    const mediumtasks = await Task.find({ userId , priority:"medium"});
    const hightasks = await Task.find({ userId , priority:"high"});
    if (!lowtasks) {
      return res.status(404).json({
        success: false,
        message: "No tasks found for this user",
      });
    }
    return res.json({
      success: true,
      lowTasks: lowtasks,
      mediumTasks: mediumtasks,
      highTasks: hightasks,
      message: "Tasks retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving tasks:", error);
    return res.status(500).json({
      success: false,
      message: "Server error: Unable to retrieve tasks",
    });
  }
};

export const addTodo = async (req, res) => {
  const { title, description, dueDate, priority, cnrNumber } = req.body;
  const { token } = req.headers;
  if (!token) {
    req.files.forEach((file) => fs.unlinkSync(file.path));
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No token provided",
    });
  }
  if (!title || !priority || !dueDate || !description || !cnrNumber) {
    req.files.forEach((file) => fs.unlinkSync(file.path));
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET_KEY);
    if (!decoded) {
      req.files.forEach((file) => fs.unlinkSync(file.path));
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid token",
      });
    }
    const userId = decoded.id;

    const cnrExists = await CnrDetail.find({
      cnrNumber,
      "userId.userId": userId,
    });

    if (cnrExists.length <= 0) {
      req.files.forEach((file) => fs.unlinkSync(file.path));
      return res.status(404).json({
        success: false,
        message: "CNR number not found or does not belong to the current user",
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

    const newTask = new Task({
      title,
      description,
      dueDate,
      priority,
      userId,
      attachments:attachments
    });
    const savedTask = await newTask.save();
    return res.json({
      success: true,
      data: savedTask,
      message: "Task added successfully",
    });
  } catch (error) {
    console.error("Error adding task:", error);
    req.files.forEach((file) => fs.unlinkSync(file.path));
    return res.status(500).json({
      success: false,
      message: "Server error: Unable to add task",
    });
  }
};

export const editTodo = async (req, res) => {
  const { id } = req.params;
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No token provided",
    });
  }
  const { title, description, status, dueDate, priority } = req.body;
  if (!title || !description || !status || !dueDate || !priority) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET_KEY);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid token",
      });
    }
    const userId = decoded.id;
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { title, description, status, dueDate, priority },
      { new: true }
    );
    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found for this user",
      });
    }
    return res.json({
      success: true,
      data: updatedTask,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("Error editing task:", error);
    return res.status(500).json({
      success: false,
      message: "Server error: Unable to edit task",
    });
  }
};

export const deleteTodo = async (req, res) => {
  const { id } = req.params;
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No token provided",
    });
  }
  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET_KEY);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid token",
      });
    }
    const deletedTask = await Task.findByIdAndDelete(id);
    if (!deletedTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found for this user",
      });
    }
    return res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return res.status(500).json({
      success: false,
      message: "Server error: Unable to delete task",
    });
  }
};
