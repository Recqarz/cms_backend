const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const expressAsyncHandler = require('express-async-handler');

const protect = expressAsyncHandler(async (req, res, next) => {
    const token = req.cookies?.authToken; // Safely access cookies
  
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  });
  

module.exports = { protect };
