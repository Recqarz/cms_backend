import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { User } from "./user.model.js";
import { sendSmsToRecipient } from "./otpservice/sms.service.js";
import { sendOtptoEmail } from "./otpservice/email.service.js";
import { otpGenerator } from "../../otpGenerator/otpGenerator.js";

const tempStorage = [];
const loginTempUser = [];

export const tempRegister = async (req, res) => {
  const {
    email,
    mobile,
    name,
    password,
    confirmPassword,
    role,
    state,
    district,
    pinCode,
    address,
    ...rest
  } = req.body;
  if (!email || !mobile) {
    return res
      .status(400)
      .json({ success: false, message: "Email and mobile are required." });
  }

  if (password !== confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Passwords do not match." });
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      success: false,
      message:
        "Password should be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    });
  }

  if (
    !name ||
    !password ||
    !confirmPassword ||
    !role ||
    !state ||
    !district ||
    !pinCode ||
    !address
  ) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  const user = await User.findOne({ email: email, mobile: mobile });
  if (user) {
    return res
      .status(400)
      .json({ success: false, message: "User already exists." });
  }
  const mobileOtp = otpGenerator();
  const emailOtp = otpGenerator();
  const text = `Your OTP for Sandhee Platform is ${mobileOtp.otp}. It is valid for 5 minutes. Please do not share it with anyone. Team SANDHEE (RecQARZ)`;
  sendSmsToRecipient(mobile, text);
  let emailuser = {
    otp: emailOtp.otp,
    email: email,
    name: name,
  };
  sendOtptoEmail(emailuser, emailOtp.otp);
  const userIndex = tempStorage.findIndex(
    (item) => item.email === email || item.mobile === mobile
  );

  if (userIndex !== -1) {
    tempStorage[userIndex] = {
      ...tempStorage[userIndex],
      email,
      mobile,
      name,
      password,
      confirmPassword,
      role,
      state,
      district,
      pinCode,
      address,
      ...rest,
    };
    tempStorage[userIndex].mobileOtp = mobileOtp;
    tempStorage[userIndex].emailOtp = emailOtp;
    return res.status(201).json({
      success: true,
      message: "OTP sent successfully",
    });
  } else {
    const newUser = {
      email,
      mobile,
      name,
      password,
      confirmPassword,
      role,
      state,
      district,
      pinCode,
      address,
      ...rest,
    };
    newUser.mobileOtp = mobileOtp;
    newUser.emailOtp = emailOtp;
    tempStorage.push(newUser);
    return res.status(201).json({
      success: true,
      message: "OTP sent successfully.",
    });
  }
};

export const register = async (req, res) => {
  const { email, mobileOtp, emailOtp } = req.body;
  if (!email || !mobileOtp || !emailOtp) {
    return res.status(400).json({
      success: false,
      message: "Email, mobile OTP and email OTP are required.",
    });
  }
  try {
    const user = await User.findOne({ email: email });
    if (user) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists." });
    }
    const tempUser = tempStorage.filter((user) => user.email === email);
    if (tempUser.length > 0) {
      if (
        (tempUser[0].mobileOtp.otp !== mobileOtp ||
          tempUser[0].mobileOtp.expireTime < Date.now()) &&
        (tempUser[0].emailOtp.otp !== emailOtp ||
          tempUser[0].emailOtp.expireTime < Date.now())
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid mobile and email OTP." });
      }
      if (
        tempUser[0].mobileOtp.otp !== mobileOtp ||
        tempUser[0].mobileOtp.expireTime < Date.now()
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid mobile OTP." });
      }
      if (
        tempUser[0].emailOtp.otp !== emailOtp ||
        tempUser[0].emailOtp.expireTime < Date.now()
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid email OTP." });
      }
      const hashedPassword = await argon2.hash(tempUser[0].password);
      const {
        mobileOtp: _,
        emailOtp: emailVerification,
        ...userData
      } = tempUser[0];
      const newUser = new User({
        ...userData,
        password: hashedPassword,
      });
      await newUser.save();
      return res.status(201).json({
        success: true,
        message: "User registered successfully.",
        data: newUser,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "User not found in temp storage." });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

export const tempLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required." });
  }
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found." });
    }
    const isMatch = await argon2.verify(user.password, password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect password." });
    }
    const mobileOtp = otpGenerator();
    const emailOtp = otpGenerator();
    const text = `Your OTP for Sandhee Platform is ${mobileOtp.otp}. It is valid for 5 minutes. Please do not share it with anyone. Team SANDHEE (RecQARZ)`;
    sendSmsToRecipient(user.mobile, text);
    sendOtptoEmail(user, emailOtp.otp);
    const existingUserIndex = loginTempUser.findIndex((u) => u.email === email);
    if (existingUserIndex !== -1) {
      loginTempUser[existingUserIndex].mobileOtp = mobileOtp;
      loginTempUser[existingUserIndex].emailOtp = emailOtp;
    } else {
      const nuser = { ...user.toObject(), mobileOtp, emailOtp };
      loginTempUser.push(nuser);
    }
    return res.status(200).json({
      success: true,
      message: "OTP send successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

export const login = async (req, res) => {
  const { email, mobileOtp, emailOtp } = req.body;
  if (!email || !mobileOtp || !emailOtp) {
    return res.status(400).json({
      success: false,
      message: "Email, mobile OTP and email OTP are required.",
    });
  }
  try {
    const tempUser = loginTempUser.filter((user) => user.email === email);
    if (tempUser.length > 0) {
      if (
        (tempUser[0].mobileOtp.otp !== mobileOtp ||
          tempUser[0].mobileOtp.expireTime < Date.now()) &&
        (tempUser[0].emailOtp.otp !== emailOtp ||
          tempUser[0].emailOtp.expireTime < Date.now())
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid mobile and email OTP." });
      }
      if (
        tempUser[0].mobileOtp.otp !== mobileOtp ||
        tempUser[0].mobileOtp.expireTime < Date.now()
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid mobile OTP." });
      }
      if (
        tempUser[0].emailOtp.otp !== emailOtp ||
        tempUser[0].emailOtp.expireTime < Date.now()
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid email OTP." });
      }
      const user = await User.findOne({ email: email });
      if (!user) {
        return res
          .status(400)
          .json({ success: false, message: "User not found in database." });
      }

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, {
        expiresIn: "1d",
      });
      const tokens = `Bearer ${token}`;
      return res.status(200).json({
        success: true,
        message: "User logged in successfully.",
        token: tokens,
        role: user.role,
        name: user.name,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Please send otp first." });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

export const getUserData = async (req, res) => {
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }
  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET_KEY);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    const user = await User.findById(decoded.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

export const updateUserData = async (req, res) => {
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }
  const {
    fourDayBeforenotification,
    threeDayBeforenotification,
    twoDayBeforenotification,
    oneDayBeforenotification,
    whatsAppSms,
    emailSms,
    moblieSms,
  } = req.body;
  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET_KEY);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    const updateFields = {};
    if (fourDayBeforenotification !== undefined)
      updateFields.fourDayBeforenotification = fourDayBeforenotification;
    if (threeDayBeforenotification !== undefined)
      updateFields.threeDayBeforenotification = threeDayBeforenotification;
    if (twoDayBeforenotification !== undefined)
      updateFields.twoDayBeforenotification = twoDayBeforenotification;
    if (oneDayBeforenotification !== undefined)
      updateFields.oneDayBeforenotification = oneDayBeforenotification;
    if (whatsAppSms !== undefined) updateFields.whatsAppSms = whatsAppSms;
    if (emailSms !== undefined) updateFields.emailSms = emailSms;
    if (moblieSms !== undefined) updateFields.moblieSms = moblieSms;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }
    const user = await User.findByIdAndUpdate(decoded.id, updateFields, {
      new: true,
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    return res.status(200).json({
      success: true,
      message: "User data updated successfully.",
      data: user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

export const cleanUpTempStorage = () => {
  tempStorage.forEach((user, index) => {
    if (
      user.emailOtp.expireTime < Date.now() ||
      user.mobileOtp.expireTime < Date.now()
    ) {
      tempStorage.splice(index, 1);
    }
  });
  loginTempUser.forEach((user, index) => {
    if (
      user.emailOtp.expireTime < Date.now() ||
      user.mobileOtp.expireTime < Date.now()
    ) {
      loginTempUser.splice(index, 1);
    }
  });
};
