import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { Document } from "../document.model.js";
import { User } from "../../users/user.model.js";

export const getSubDocument = async (req, res) => {
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized", success: false });
  }
  try {
    const decodedToken = jwt.verify(
      token.split(" ")[1],
      process.env.JWT_SECRET_KEY
    );
    if (!decodedToken) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }
    const curruser = await User.findById(decodedToken.id)
    const document = await Document.find({ "jointUser.email": curruser.email });
    if (!document) {
      return res
        .status(404)
        .json({ message: "No document found", success: false });
    }
    return res.json({
      message: "Document retrieved successfully",
      success: true,
      data: document,
    });
  } catch (error) {
    console.error("Error retrieving document:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", success: false });
  }
};