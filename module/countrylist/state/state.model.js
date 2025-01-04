import mongoose from "mongoose";

const stateSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      unique: true,
    },
    district: {
      type: [],
    },
  },
  { timestamps: true }
);

export const State = mongoose.model("State", stateSchema);
