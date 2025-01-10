import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({
  userId: {
    type: String,
    require: true,
  },
  country: {
    type: String,
    default: "India",
    required: true,
  },
  state: {
    type: String,
    default: "",
  },
  district: {
    type: String,
    default: "",
  },
  courtType: {
    type: String,
    default: "districtCourt",
    enum: ["districtCourt", "supremeCourt"],
  },
  courtName: {
    type: String,
    default: "",
  },
  keyword: {
    type: String,
    required: true,
  },
  isCountryPremium: {
    type: Boolean,
    default: false,
  },
  isStatePremium: {
    type: Boolean,
    default: false,
  },
  isDistrictPremium: {
    type: Boolean,
    default: false,
  },
  isCourtPremium: {
    type: Boolean,
    default: false,
  },
});

export const Location = mongoose.model("Location", locationSchema);
