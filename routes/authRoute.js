const express = require('express');
const router = express.Router();
const authController = require("../controllers/authController.js");

// Authentication routes
router.post("/signup", authController.signup);
router.post('/login', authController.login);
router.post('/validateUserAndSendOtp', authController.validateUserAndSendOtp);
router.post('/validate-otp', authController.validateOtp);
router.post('/reset-password-otp', authController.resetPasswordWithOtp);

module.exports = router;

//
 