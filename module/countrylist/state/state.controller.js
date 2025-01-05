import { State } from "./state.model.js";
import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";

export const addState = async (req, res) => {
  try {
    const { state, district } = req.body;
    let newState = await State.create({
      state: state,
      district: district,
    });
    if (!newState) {
      return res
        .status(400)
        .json({ success: false, message: "Failed to create new state" });
    }
    return res
      .status(201)
      .json({ success: true, message: "State created successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const allState = async (req, res) => {
  const { token } = req.headers;
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided." });
  }
  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET_KEY);
    if (!decoded) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid token." });
    }
    const data = await State.find();
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "No state found" });
    }
    return res
      .status(200)
      .json({ success: true, data, message: "State found successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
