import mongoose from "mongoose";

const cnrSchema = new mongoose.Schema({
  cnrNumber: {
    type: String,
    required: true,
  },
  userId: {
    type: [String],
    default: [],
  },
  acts: {
    type: [],
    default: [],
  },
  subUserId: {
    type: [String],
    default: [],
  },
  caseDetails: {
    type: Object,
    default: {},
  },
  caseHistory: {
    type: [],
    default: [],
  },
  caseStatus: {
    type: String,
    default: "",
  },
  caseTransferDetails: {
    type: [],
    default: [],
  },
  firDetails: {
    type: Object,
    default: {},
  },
  petitionerAndAdvocate: {
    type: [],
    default: [],
  },
  respondentAndAdvocate: {
    type: [],
    default: [],
  },
  intrimOrders: {
    type: [],
    default: [],
  },
  archive: {
    type: [],
    default: [],
  },
});

export const CnrDetail = mongoose.model("CnrDetail", cnrSchema);
