const { userModel, roletypes } = require("../models/user.Model");
const bcrypt = require('bcrypt');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find().select('-password -otp -otpExpiry');
    console.log(users);
    return res.status(200).json(successResponse(users));
  } catch (error) {
    console.error('Get all users error:', error);
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
    const { username, email, phone, password, newPassword, role } = req.body;
    const userId = req.params.id;

    // Find the user
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json(errorResponse('User not found.', 404));
    }

    // Check if the requester is the user themselves or an admin
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json(errorResponse('Not authorized to update this user.', 403));
    }

    // Prevent non-admins from changing roles
    if (role && req.user.role !== 'admin') {
      return res.status(403).json(errorResponse('Only admins can change user roles.', 403));
    }

    // Update user fields
    if (username) user.username = username;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role && req.user.role === 'admin') user.role = role;

    // Handle password change if requested
    if (password && newPassword) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json(errorResponse('Current password is incorrect.', 400));
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

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

    // Prevent users from deleting themselves
    if (req.user.userId === userId) {
      return res.status(400).json(errorResponse('You cannot delete your own account this way.', 400));
    }

    // Only allow admins to delete users
    if (req.user.role !== 'admin') {
      return res.status(403).json(errorResponse('Only admins can delete users.', 403));
    }

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

// Add property to favorites
exports.addToFavorites = async (req, res) => {
  try {
    const { propertyId } = req.body;
    const userId = req.user.userId;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json(errorResponse('User not found.', 404));
    }

    // Check if already in favorites
    const alreadyFavorited = user.favourites.some(fav => fav.propertyId.toString() === propertyId);
    if (alreadyFavorited) {
      return res.status(400).json(errorResponse('Property already in favorites.', 400));
    }

    user.favourites.push({ propertyId });
    await user.save();

    return res.status(200).json(successResponse({
      message: 'Property added to favorites.'
    }));
  } catch (error) {
    console.error('Add to favorites error:', error);
    return res.status(500).json(errorResponse('Server error while adding to favorites.'));
  }
};

// Remove property from favorites
exports.removeFromFavorites = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user.userId;

    const user = await userModel.findByIdAndUpdate(
      userId,
      { $pull: { favourites: { propertyId } } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json(errorResponse('User not found.', 404));
    }

    return res.status(200).json(successResponse({
      message: 'Property removed from favorites.'
    }));
  } catch (error) {
    console.error('Remove from favorites error:', error);
    return res.status(500).json(errorResponse('Server error while removing from favorites.'));
  }
};

// Get user's favorites
exports.getUserFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await userModel.findById(userId).populate('favourites.propertyId');
    
    if (!user) {
      return res.status(404).json(errorResponse('User not found.', 404));
    }

    return res.status(200).json(successResponse(user.favourites));
  } catch (error) {
    console.error('Get favorites error:', error);
    return res.status(500).json(errorResponse('Server error while fetching favorites.'));
  }
};
