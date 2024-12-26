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
  docLink:{
    type: String,
    default: "",
  },
  date:{
    type: Date,
    default: new Date(),
  }
})

export const Document = mongoose.model("Document", docSchema);
