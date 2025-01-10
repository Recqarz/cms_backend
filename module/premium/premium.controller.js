import dotenv from "dotenv";
import { Location } from "./premium.model.js";
dotenv.config();
import jwt from "jsonwebtoken";

export const getAllLocations = async (req, res) => {
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token is not found",
    });
  }
  try {
    const jwtId = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET_KEY);
    if (!jwtId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid token",
      });
    }
    const locations = await Location.find({userId: jwtId.id});
    return res
      .status(200)
      .json({
        data: locations,
        success: true,
        message: "Keyword retrieved successfully",
      });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch locations" });
  }
};

export const createLocation = async (req, res) => {
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token is not found",
    });
  }
  let {
    state,
    district,
    courtType,
    keyword,
    isDistrictPremium,
    isCountryPremium,
    isStatePremium,
    isCourtPremium,
  } = req.body;
  let data = {};
  if (state) {
    data.state = state;
  }
  if (district) {
    data.district = district;
  }
  if (courtType) {
    data.courtType = courtType;
  }
  if (keyword) {
    data.keyword = keyword;
  }
  if (isDistrictPremium) {
    data.isDistrictPremium = isDistrictPremium;
  }
  if (isCountryPremium) {
    data.isCountryPremium = isCountryPremium;
  }
  if (isStatePremium) {
    data.isStatePremium = isStatePremium;
  }
  if (isCourtPremium) {
    data.isCourtPremium = isCourtPremium;
  }
  try {
    const jwtId = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET_KEY);
    if (!jwtId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid token",
      });
    }
    data.userId = jwtId.id;
    const newLocation = await Location.create(data);
    return res.status(201).json({ success: false, newLocation });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ error: "Failed to create location", success: false });
  }
};

export const deleteLocation = async (req, res) => {
  const { token } = req.headers;
  const { id } = req.params;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token is not found",
    });
  }
  try {
    const jwtId = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET_KEY);
    if (!jwtId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid token",
      });
    }
    const deletedLocation = await Location.findByIdAndDelete(id);
    if (!deletedLocation) {
      return res.status(404).json({ error: "Location not found" });
    }
    res.status(200).json({ message: "Location deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete location" });
  }
};
