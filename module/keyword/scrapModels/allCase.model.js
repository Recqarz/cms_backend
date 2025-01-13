import mongoose from "mongoose";
 
const allCaseSchema = new mongoose.Schema(
  {
    cnrNumber: {
      type: String,
      required:true,
      unique:true
    },
  },
  { timestamps: true }
);
 
export const AllKeywordCnr = mongoose.model("AllKeywordCnr", allCaseSchema);