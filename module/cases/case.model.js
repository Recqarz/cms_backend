import mongoose from "mongoose";

const cnrSchema = new mongoose.Schema({
  cnrNumber: {
    type: String,
    required: true,
  },
  userId: {
    type: [],
    default: [],
  },
  acts: {
    type: [],
    default: [],
  },
  subUserId: {
    type: [],
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
    type: [],
    default: [],
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
  status: {
    type: String,
    default: "",
  },
  lastUpdated:{
    type:String,
    default:"",
  }
},{timestamps:true});

export const CnrDetail = mongoose.model("CnrDetail", cnrSchema);
