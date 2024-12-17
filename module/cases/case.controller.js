import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { CnrDetail } from "./case.model";

const getCnrDetails = async (req, res) => {
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }
  const { pageNo = 1, pageLimit = 10 } = req.query;
  try {
    const isVerify = jwt.verify(
      token?.split(" ")[1],
      process.env.JWT_SECRET_KEY
    );
    if (!isVerify) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    const count = await CnrDetail.countDocuments({
      userId: { $in: [isVerify.id] },
    });
    let pageSize = Math.floor(count / pageLimit);
    const cnr = await CnrDetail.find({ userId: { $in: [isVerify.id] } })
      .skip((pageNo - 1) * pageLimit)
      .limit(pageLimit);
    if (!cnr) {
      return res
        .status(404)
        .json({ success: false, message: "No Cnr details found." });
    }
    return res.status(200).json({
      success: true,
      data: cnr,
      message: "Cnr details found.",
      pageSize,
    });
  } catch (error) {
    console.error("Error getting Cnr details:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
