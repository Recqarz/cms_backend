import mongoose from "mongoose";

const docSchema = new mongoose.Schema({
  cnrNumber: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    default: "",
  },
  noOfDocument: {
    type: Number,
    default: 1,
  },
  date: {
    type: Date,
    default: new Date(),
  },
  respondent: {
    type: String,
    default: "",
  },
  petitioner: {
    type: String,
    default: "",
  },
  documents: {
    type: [],
    default: [],
  },
});

export const Document = mongoose.model("Document", docSchema);
