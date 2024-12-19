import mongoose from "mongoose";

const ExternalUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  noOfAssigncases:{
    type: Number,
    default: 0,
  }
});

export const ExternalUser = mongoose.model("ExternalUser", ExternalUserSchema);
