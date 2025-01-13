import mongoose from "mongoose";

const newCaseSchema = new mongoose.Schema(
  {
    searchTerm: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    courtComplex: {
      type: String,
      required: true,
    },
    courtEstablishment: {
      type: String,
      default: "",
    },
    cnrNumber: {
      type: String,
      required: true,
      unique: true,
    },
    registrationDate: {
      type: String,
      required: true,
    },
    petitioner: {
      type: String,
      default: "",
    },
    respondent: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export const NewKeywordCnr = mongoose.model("NewKeywordCnr", newCaseSchema);
