const { userModel, roletypes } = require("../models/user.Model");
const bcrypt = require('bcrypt');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const validRoles = ['buyer', 'broker', 'admin'];
    
    // Build query
    const query = {};
    if (role && validRoles.includes(role)) {
      query.role = role;
    }
    
    const users = await userModel.find(query).select('-password -otp -otpExpiry');
    return res.status(200).json(successResponse(users));
  } catch (error) {
    return res.status(500).json(errorResponse('Server error while fetching users.'));
  }
};

// Get single user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await userModel.findById(req.params.id).select('-password -otp -otpExpiry');
    
    if (!user) {
      return res.status(404).json(errorResponse('User not found.', 404));
    }
    return res.status(200).json(successResponse(user));
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json(errorResponse('Server error while fetching user.'));
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { username, email, phone, role } = req.body;
    const userId = req.params.id;

    // Find the user
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json(errorResponse('User not found.', 404));
    }

    // Update user fields
    if (username) user.username = username;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;

    await user.save();
    
    // Return updated user without sensitive data
    const updatedUser = user.toObject();
    delete updatedUser.password;
    delete updatedUser.otp;
    delete updatedUser.otpExpiry;

    return res.status(200).json(successResponse({
      message: 'User updated successfully.',
      user: updatedUser
    }));
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 11000) {
      return res.status(400).json(errorResponse('Username or email already in use.', 400));
    }
    return res.status(500).json(errorResponse('Server error while updating user.'));
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;



    const user = await userModel.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json(errorResponse('User not found.', 404));
    }

    return res.status(200).json(successResponse({
      message: 'User deleted successfully.'
    }));
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json(errorResponse('Server error while deleting user.'));
  }
};
