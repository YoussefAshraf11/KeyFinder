const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const {userModel,roletypes} = require("../models/user.Model");
const { sendEmail } = require("../utils/email");


exports.signup = async (req, res) => {
  try {
    const { username, email, password, confirmPassword, phone, role } = req.body;

    // 1. Basic validation
    if (!username || !email || !password || !confirmPassword || !phone) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // 2. Confirm password match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    // 3. Check if email already exists
    const existingEmail = await userModel.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    // 4. Check if username already exists
    const existingUsername = await userModel.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ message: 'Username already taken. Please choose a different one.' });
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

    res.status(201).json({ message: 'User created successfully.' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // ✋ Role mismatch check
    if (expectedRole && user.role !== expectedRole) {
      return res.status(403).json({ message: `Access denied for role: ${user.role}` });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.validateUserAndSendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email is provided
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
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
      
      res.status(200).json({ 
        success: true,
        message: 'Verification code sent successfully.',
        email: email
      });
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
      
      res.status(500).json({ 
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } catch (error) {
    console.error('Error in validateUserAndSendOtp:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmNewPassword } = req.body;

    // Validate all required fields
    if (!email || !otp || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields (email, otp, newPassword, confirmNewPassword) are required.'
      });
    }

    // Check if passwords match
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match.'
      });
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

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully.'
    });

  } catch (error) {
    console.error('Error in resetPasswordWithOtp:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while resetting the password.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.validateOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required.'
      });
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

    return res.status(200).json({
      success: true,
      message: 'OTP validated successfully.'
    });

  } catch (error) {
    console.error('Error in validateOtp:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while validating OTP.'
    });
  }
};


