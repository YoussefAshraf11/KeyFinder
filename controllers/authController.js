const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const {userModel,roletypes} = require("../models/user.Model");
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


