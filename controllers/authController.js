const expressAsyncHandler = require('express-async-handler');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

dotenv.config();

let transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const otpStore = {}; 
const OTP_EXPIRY_TIME = 5 * 60 * 1000; 

const generateOtp = () => Math.floor(100000 + Math.random() * 900000);

const sendOtp = expressAsyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  const otp = generateOtp();
  otpStore[email] = { otp, expiresAt: Date.now() + OTP_EXPIRY_TIME };

  const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: email,
    subject: "Your OTP for Signup",
    text: `Your OTP for signup is: ${otp}. It will expire in 5 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "OTP sent successfully." });
  } catch (error) {
    console.log("Error sending email:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP." });
  }
});

const verifyOtp = expressAsyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and OTP are required." });
  }

  const storedOtp = otpStore[email];

  if (!storedOtp) {
    return res.status(400).json({ success: false, message: "OTP not sent or expired." });
  }

  if (Date.now() > storedOtp.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ success: false, message: "OTP has expired." });
  }

  if (storedOtp.otp === parseInt(otp)) {
    delete otpStore[email];
    res.status(200).json({ success: true, message: "OTP verified successfully." });
  } else {
    res.status(400).json({ success: false, message: "Invalid OTP. Please enter the correct OTP." });
  }
});


const signup = expressAsyncHandler(async (req, res) => {
  const { name, email, password, number, role } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ success: false, message: 'User already exists.' });
  }

  const newUser = await User.create({
    name, 
    email, 
    password, 
    number, 
    role: role || 'User' // Default to 'User' if no role is provided
  });

  if (newUser) {
    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      token: generateToken(newUser._id),
    });
  } else {
    res.status(400).json({ success: false, message: 'Error creating user.' });
  }
});


const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '5m' }); // 2-minute expiration
};


const login = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ success: false, message: 'User not found' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Invalid credentials' });
  }

  const token = generateToken(user._id);

  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 5 * 60 * 1000, // 5 minutes
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
    },
  });
});

const validateToken = expressAsyncHandler(async (req, res) => {
  console.log('Validation request received');  // Debug log
  const token = req.cookies.authToken;
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: { email: user.email, name: user.name, data: user.data },
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

module.exports = { sendOtp, verifyOtp, signup, login,validateToken };
