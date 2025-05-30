const express = require('express');
const router = express.Router();
const userController = require("../controllers/userController.js");
// const { authenticateToken } = require("../middleware/authMiddleware.js");

// Apply authentication middleware to all routes
// router.use(authenticateToken);

// Admin only routes
router.get("/", userController.getAllUsers);

// User routes
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

// Favorites routes
router.post("/favorites", userController.addToFavorites);
router.delete("/favorites/:propertyId", userController.removeFromFavorites);
router.get("/favorites/mine", userController.getUserFavorites);

module.exports = router;
