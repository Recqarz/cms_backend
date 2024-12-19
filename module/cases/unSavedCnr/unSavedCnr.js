import mongoose from "mongoose";

const unSavedCnrSchema = new mongoose.Schema({
    cnrNumber: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  userId: {
    type: [],
    default: [],
  },
});

export const UnsavedCnr = mongoose.model("UnsavedCnr", unSavedCnrSchema);
