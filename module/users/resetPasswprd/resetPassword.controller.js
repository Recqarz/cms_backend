import { otpGenerator } from "../../../otpGenerator/otpGenerator.js";
import { sendOtptoEmail } from "../otpservice/email.service.js";
import { sendSmsToRecipient } from "../otpservice/sms.service.js";
import { User } from "../user.model.js";
import argon2 from "argon2";

const tempResetUser = [];

export const tempResetPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found." });
    }
    const mobileOtp = otpGenerator();
    const emailOtp = otpGenerator();
    const text = `Your OTP for Sandhee Platform is ${mobileOtp.otp}. It is valid for 5 minutes. Please do not share it with anyone. Team SANDHEE (RecQARZ)`;
    sendSmsToRecipient(user.mobile, text);
    sendOtptoEmail(user, emailOtp.otp);
    const existingUserIndex = tempResetUser.findIndex((u) => u.email === email);
    if (existingUserIndex !== -1) {
      tempResetUser[existingUserIndex].mobileOtp = mobileOtp;
      tempResetUser[existingUserIndex].emailOtp = emailOtp;
    } else {
      const nuser = { ...user.toObject(), mobileOtp, emailOtp };
      tempResetUser.push(nuser);
    }
    return res
      .status(200)
      .json({ success: true, message: "OTP sent successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

export const resetPassword = async (req, res) => {
  const { email, password, confirmPassword, emailOtp, mobileOtp } = req.body;
  if (!email || !password || !confirmPassword || !emailOtp || !mobileOtp) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
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
  const tempUser = tempResetUser.filter((u) => u.email === email);
  try {
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
    } else {
      return res
        .status(400)
        .json({ success: false, message: "User not found in temp storage." });
    }
    const hashedPassword = await argon2.hash(password);
    const user = await User.findOneAndUpdate(
      { email: email },
      { password: hashedPassword },
      { new: true }
    );
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found." });
    }
    return res
      .status(200)
      .json({ success: true, message: "Password reset successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

export const cleanUpTempResetStorage = () => {
  tempResetUser.forEach((user, index) => {
    if (
      user.emailOtp.expireTime < Date.now() ||
      user.mobileOtp.expireTime < Date.now()
    ) {
      tempResetUser.splice(index, 1);
    }
  });
};
