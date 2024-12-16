import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

const URI = process.env.MONGO_URI;

export const connection = mongoose.connect(URI);
