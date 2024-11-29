const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, signup, login ,validateToken} = require('../controllers/authController');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/signup', signup);
router.post('/login', login);
router.get('/validate', validateToken);


module.exports = router;
