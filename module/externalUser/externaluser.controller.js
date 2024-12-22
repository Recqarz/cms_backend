import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { ExternalUser } from "./externaluser.model.js";

export const addExternaluser = async (req, res) => {
  const { name } = req.body;
  const { token } = req.headers;
  try {
    const isverify = jwt.verify(
      token.split(" ")[1],
      process.env.JWT_SECRET_KEY
    );
    if (!isverify) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    const externalUser = new ExternalUser({
      name,
      userId: isverify.id,
    });
    await externalUser.save();
    res.json({ success: true, message: "External User added successfully." });
  } catch (error) {
    console.error("Error adding external User:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

export const getExternalUser = async (req, res) => {
  const { token } = req.headers;
  try {
    const isverify = jwt.verify(
      token.split(" ")[1],
      process.env.JWT_SECRET_KEY
    );
    if (!isverify) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    const externalUser = await ExternalUser.find({ userId: isverify.id });
    if (!externalUser) {
      return res
        .status(404)
        .json({ success: false, message: "No external external user found." });
    }
    return res.status(200).json({ success: true, data: externalUser });
  } catch (error) {
    console.error("Error getting external external user:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
