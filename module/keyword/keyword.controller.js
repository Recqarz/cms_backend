import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { Keyword } from "./keyword.model.js";
import { NewKeywordCnr } from "./scrapModels/newCase.model.js";
import { Location } from "../premium/premium.model.js";

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

export const getNewKeywordCnrforCountry = async (req, res) => {
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
    let location = await Location.find({
      userId: decoded.id,
      isCountryPremium: true,
    });
    if (!location) {
      return res
        .status(404)
        .json({ success: false, message: "No location found for this user." });
    }
    let keywords = location.map((ele) => {
      return ele.keyword;
    });
    const regexKeywords = keywords.map((kw) => new RegExp(kw, "i"));
    const newKeywordCnr = await NewKeywordCnr.find({
      searchTerm: { $in: regexKeywords },
    });
    newKeywordCnr.sort((a, b) => {
      const [dayA, monthA, yearA] = a.registrationDate.split('-').map(Number);
      const [dayB, monthB, yearB] = b.registrationDate.split('-').map(Number);
    
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
    
      return dateB - dateA; // Newest first
    });
    return res.status(200).json({
      success: true,
      data: newKeywordCnr,
      message: "New Keyword found",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getNewKeywordCnrforState = async (req, res) => {
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
    let location = await Location.find({
      userId: decoded.id,
      isStatePremium: true,
    });
    if (!location) {
      return res
        .status(404)
        .json({ success: false, message: "No location found for this user." });
    }
    let keywords = location.map((ele) => {
      return ele.keyword;
    });
    let states = location.map((ele) => {
      return ele.state;
    });
    const regexKeywords = keywords.map((kw) => new RegExp(kw, "i"));
    const regexState = states.map((st) => new RegExp(st, "i"));
    const newKeywordCnr = await NewKeywordCnr.find({
      searchTerm: { $in: regexKeywords },
      state: { $in: regexState },
    });
    newKeywordCnr.sort((a, b) => {
      const [dayA, monthA, yearA] = a.registrationDate.split('-').map(Number);
      const [dayB, monthB, yearB] = b.registrationDate.split('-').map(Number);
    
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
    
      return dateB - dateA; // Newest first
    });
    return res.status(200).json({
      success: true,
      data: newKeywordCnr,
      message: "New Keyword found",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getNewKeywordCnrforDistrict = async (req, res) => {
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
    let location = await Location.find({
      userId: decoded.id,
      isDistrictPremium: true,
    });
    if (!location) {
      return res
        .status(404)
        .json({ success: false, message: "No location found for this user." });
    }
    let keywords = location.map((ele) => {
      return ele.keyword;
    });
    let districts = location.map((ele) => {
      return ele.district;
    });
    const regexKeywords = keywords.map((kw) => new RegExp(kw, "i"));
    const regexDistricts = districts.map((dt) => new RegExp(dt, "i"));
    const newKeywordCnr = await NewKeywordCnr.find({
      searchTerm: { $in: regexKeywords },
      district: { $in: regexDistricts },
    });
    newKeywordCnr.sort((a, b) => {
      const [dayA, monthA, yearA] = a.registrationDate.split('-').map(Number);
      const [dayB, monthB, yearB] = b.registrationDate.split('-').map(Number);
    
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
    
      return dateB - dateA; // Newest first
    });
    return res.status(200).json({
      success: true,
      data: newKeywordCnr,
      message: "New Keyword found",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
