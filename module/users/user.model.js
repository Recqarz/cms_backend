import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["advocate", "client", "company", "bank", "individual","subuser"],
    default: "client",
  },
  isPrimeUser: {
    type: Boolean,
    default: false,
  },
  premiumStartDate: {
    type: String,
    default: "",
  },
  premiumEndDate: {
    type: String,
    default: "",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  state: {
    type: String,
    required: true,
  },
  district: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  pinCode: {
    type: String,
    required: true,
  },
  profilePic: {
    type: String,
    default: "",
  },
  companyName: {
    type: String,
    default: "",
  },
  companyAddress: {
    type: String,
    default: "",
  },
  bankName: {
    type: String,
    default: "",
  },
  bankAddress: {
    type: String,
    default: "",
  },
  userDegisnation: {
    type: String,
    default: "",
  },
  subUser: {
    type: [],
    default: [],
  },
  advocate: {
    type: [String],
    default: [],
  },
  client: {
    type: [String],
    default: [],
  },
  moblieSms: {
    type: Boolean,
    default: false,
  },
  emailSms: {
    type: Boolean,
    default: false,
  },
  whatsAppSms: {
    type: Boolean,
    default: false,
  },
  oneDayBeforenotification: {
    type: Boolean,
    default: false,
  },
  twoDayBeforenotification: {
    type: Boolean,
    default: false,
  },
  threeDayBeforenotification: {
    type: Boolean,
    default: false,
  },
  fourDayBeforenotification: {
    type: Boolean,
    default: false,
  },
});

export const User = mongoose.model("User", userSchema);
