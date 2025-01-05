import mongoose from "mongoose";

const keywordSchema = new mongoose.Schema(
  {
    keyword: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

export const Keyword = mongoose.model("Keyword", keywordSchema);
