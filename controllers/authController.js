const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { userModel, roletypes } = require("../models/user.Model");
const { sendEmail } = require("../utils/email");
const { successResponse, errorResponse } = require('../utils/helpers');


exports.signup = async (req, res) => {
  try {
    const { username, email, password, confirmPassword, phone, role } = req.body;

    // 1. Basic validation
    if (!username || !email || !password || !confirmPassword || !phone) {
      return res.status(400).json(errorResponse('All fields are required.', 400));
    }

    // 2. Confirm password match
    if (password !== confirmPassword) {
      return res.status(400).json(errorResponse('Passwords do not match.', 400));
    }

    // 3. Check if email already exists
    const existingEmail = await userModel.findOne({ email });
    if (existingEmail) {
      return res.status(409).json(errorResponse('Email already in use.', 409));
    }

    // 4. Check if username already exists
    const existingUsername = await userModel.findOne({ username });
    if (existingUsername) {
      return res.status(409).json(errorResponse('Username already taken. Please choose a different one.', 409));
    }

    // 5. Validate role or set default
    const validRoles = Object.values(roletypes); // ['buyer', 'broker', 'admin']
    const userRole = role && validRoles.includes(role) ? role : roletypes.buyer;

    // 6. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Create new user
    const newUser = new userModel({
      username,
      email,
      password: hashedPassword,
      phone,
      role: userRole
    });

    await newUser.save();

    return res.status(201).json(successResponse({ message: 'User created successfully.' }));
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json(errorResponse('Server error while creating user.'));
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json(errorResponse('Email and password are required.', 400));
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json(errorResponse('Invalid credentials.', 401));
    }

    // ✋ Role mismatch check
    if (expectedRole && user.role !== expectedRole) {
      return res.status(403).json(errorResponse(`Access denied for role: ${user.role}`, 403));
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1d' }
    );

    return res.status(200).json(successResponse({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    }));
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json(errorResponse('Server error during login.'));
  }
};

exports.validateUserAndSendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email is provided
    if (!email) {
      return res.status(400).json(errorResponse('Email is required.', 400));
    }

    // Check if user exists
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    // Save OTP to user document
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP via email
    const subject = 'Your Verification Code';
    const text = `Your verification code is: ${otp}. This code will expire in 10 minutes.`;
    
    try {
      console.log('Attempting to send OTP email to:', email);
      await sendEmail(email, subject, text);
      console.log('OTP email sent successfully to:', email);
      
      return res.status(200).json(successResponse({
        message: 'Verification code sent successfully.',
        email: email
      }));
    } catch (error) {
      console.error('Failed to send email:', {
        error: error.message,
        stack: error.stack,
        email: email,
        time: new Date().toISOString()
      });
      
      // More specific error messages based on error type
      let errorMessage = 'Failed to send verification code. Please try again.';
      
      if (error.message.includes('Invalid login')) {
        errorMessage = 'Invalid email credentials. Please check your email configuration.';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'Could not connect to email server. Please check your internet connection.';
      } else if (error.message.includes('EAUTH')) {
        errorMessage = 'Email authentication failed. Please check your email credentials.';
      }
      
      return res.status(500).json(errorResponse(
        errorMessage,
        process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
      ));
    }
  } catch (error) {
    console.error('Error in validateUserAndSendOtp:', error);
    return res.status(500).json(errorResponse('Server error while processing OTP request.'));
  }
};

exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmNewPassword } = req.body;

    // Validate all required fields
    if (!email || !otp || !newPassword || !confirmNewPassword) {
      return res.status(400).json(errorResponse('All fields (email, otp, newPassword, confirmNewPassword) are required.', 400));
    }

    // Check if passwords match
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json(errorResponse('New password and confirm password do not match.', 400));
    }

    // Find user by email
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Check if OTP exists and is not expired
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found for this user. Please request a new one.'
      });
    }

    // Check if OTP has expired
    if (user.otpExpiry < new Date()) {
      // Clear the expired OTP
      user.otp = null;
      user.otpExpiry = null;
      await user.save();
      
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Verify OTP
    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user's password and clear OTP fields
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;
    
    await user.save();

    return res.status(200).json(successResponse({
      message: 'Password has been reset successfully.'
    }));

  } catch (error) {
    console.error('Error in resetPasswordWithOtp:', error);
    return res.status(500).json(errorResponse(
      'An error occurred while resetting the password.',
      process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    ));
  }
};

exports.validateOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json(errorResponse('Email and OTP are required.', 400));
    }

    // Find user by email
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Check if OTP exists and is not expired
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found for this user. Please request a new one.'
      });
    }

    // Check if OTP has expired
    if (user.otpExpiry < new Date()) {
      // Clear the expired OTP
      user.otp = null;
      user.otpExpiry = null;
      await user.save();
      
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Check if OTP matches
    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    // OTP is valid, clear it from the user document

    return res.status(200).json(successResponse({
      message: 'OTP validated successfully.'
    }));

  } catch (error) {
    console.error('Error in validateOtp:', error);
    return res.status(500).json(errorResponse('Server error while validating OTP.'));
  }
};


