import mongoose from "mongoose";

const todoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["pending", "inProgress", "completed","expired"],
      default: "pending",
    },
    dueDate: { type: Date },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
    userId: {
      type: String,
      default: "",
    },
    attachments: {
      type: [],
      default: [],
    },
    cnrNumber: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const Task = mongoose.model("Task", todoSchema);
