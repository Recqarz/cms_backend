import { Task } from "./todo.model.js";
import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { CnrDetail } from "../cases/case.model.js";
import { uploadFileToS3 } from "../document/awsupload/awsupload.js";
import fs from "fs";
import { User } from "../users/user.model.js";

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
    const lowTasks = await Task.find({
      userId,
      priority: "low",
      status: { $ne: "expired" },
    });
    const mediumTasks = await Task.find({
      userId,
      priority: "medium",
      status: { $ne: "expired" },
    });
    const highTasks = await Task.find({
      userId,
      priority: "high",
      status: { $ne: "expired" },
    });
    return res.json({
      success: true,
      lowTasks,
      mediumTasks,
      highTasks,
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

export const getRequestedTodos = async (req, res) => {
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
    const tasks = await Task.find({
      userId,
      action: "requsted",
    });
    return res.json({
      success: true,
      data: tasks,
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

export const getSubTodos = async (req, res) => {
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
    const user = await User.findById(userId);
    const lowTasks = await Task.find({
      email: { $in: [user.email] },
      priority: "low",
      status: { $ne: "expired" },
    });
    const mediumTasks = await Task.find({
      email: { $in: [user.email] },
      priority: "medium",
      status: { $ne: "expired" },
    });
    const highTasks = await Task.find({
      email: { $in: [user.email] },
      priority: "high",
      status: { $ne: "expired" },
    });
    return res.json({
      success: true,
      lowTasks,
      mediumTasks,
      highTasks,
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

export const getExpireTodos = async (req, res) => {
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
    const lowTasks = await Task.find({
      userId,
      priority: "low",
      status: "expired",
    });
    const mediumTasks = await Task.find({
      userId,
      priority: "medium",
      status: "expired",
    });
    const highTasks = await Task.find({
      userId,
      priority: "high",
      status: "expired",
    });
    return res.json({
      success: true,
      lowTasks,
      mediumTasks,
      highTasks,
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
  let { title, description, dueDate, priority, cnrNumber, email } = req.body;
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
    if (!email) {
      email = [];
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

    const givenDate = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let status = "expired";
    if (givenDate >= today) {
      status = "pending";
    }
    const newTask = new Task({
      title,
      description,
      dueDate,
      status,
      priority,
      userId,
      attachments: attachments,
      cnrNumber,
      subUser: email,
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
  let { title, description, status, dueDate, priority } = req.body;
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
    const givenDate = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (givenDate < today) {
      status = "expired";
    }
    const updatedTask = await Task.findOneAndUpdate(
      { _id: id, userId },
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

export const editSubTodo = async (req, res) => {
  const { id } = req.params;
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No token provided",
    });
  }
  let { remarks } = req.body;
  if (!remarks) {
    return res.status(400).json({
      success: false,
      message: "Remarks are required",
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
    const user = await User.findById(decoded.id);
    let action = "requsted";
    const updatedTask = await Task.findOneAndUpdate(
      { _id: id },
      { action, remarks, responder: user.email },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }
    return res.json({
      success: true,
      data: updatedTask,
      message: "Requested successfully",
    });
  } catch (error) {
    console.error("Error editing task:", error);
    return res.status(500).json({
      success: false,
      message: "Server error: Unable to edit task",
    });
  }
};

export const acceptRequest = async (req, res) => {
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
    let action = "accepted";
    let status = "completed";
    const updatedTask = await Task.findOneAndUpdate(
      { _id: id },
      { action, status },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }
    return res.json({
      success: true,
      data: updatedTask,
      message: "Accepted successfully",
    });
  } catch (error) {
    console.error("Error editing task:", error);
    return res.status(500).json({
      success: false,
      message: "Server error: Unable to edit task",
    });
  }
};

export const editExpireTodo = async (req, res) => {
  const { id } = req.params;
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No token provided",
    });
  }
  let { title, description, status, dueDate, priority } = req.body;
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
    const givenDate = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (givenDate >= today) {
      status = "pending";
    }
    const updatedTask = await Task.findOneAndUpdate(
      { _id: id, userId },
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
