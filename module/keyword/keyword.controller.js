import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { Keyword } from "./keyword.model.js";

export const addKeyword = async (req, res) => {
  try {
    const { token } = req.headers;
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided." });
    }
    const { keyword } = req.body;
    if (!keyword) {
      return res
        .status(400)
        .json({ success: false, message: "Keyword is required." });
    }
    const existingKeyword = await Keyword.findOne({ keyword });
    if (existingKeyword) {
      return res
        .status(409)
        .json({ success: false, message: "Keyword already exists." });
    }
    const newKeyword = new Keyword({ keyword });
    await newKeyword.save();
    return res
      .status(201)
      .json({ success: true, message: "Keyword created successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const allKeyword = async (req, res) => {
  const { token } = req.headers;
  const { searchQuery } = req.query;
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
    const query = {};
    if (searchQuery) {
      query.keyword = new RegExp(searchQuery, "i");
    }
    const data = await Keyword.find(query);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "No state found" });
    }
    return res
      .status(200)
      .json({ success: true, data, message: "Keyword found successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
