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
});

export const ExternalUser = mongoose.model("ExternalUser", ExternalUserSchema);
