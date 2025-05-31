const express = require('express');
const router = express.Router();
const userController = require("../controllers/userController.js");

// Admin only routes
router.get("/", userController.getAllUsers);

// User routes
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);


module.exports = router;
