const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Logic for registering a brand new user
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. Check if the user already exists in the Mumbai vault
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // 2. Prepare the new user profile using our blueprint template
    user = new User({
      username,
      email,
      password
    });

    // 3. Shred and Encrypt the password before storing it
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 4. Drop the locked profile into the permanent vault
    await user.save();

    // 5. Print a secure digital wristband (JWT) for them
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '30d' }
    );

    // 6. Hand the wristband and basic user info back to the browser
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } 
  catch (error) {
    console.error(error);

    // Catch duplicate field errors from MongoDB (e.g., username index clash)
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username or email is already taken. Please try another one.' 
      });
    }

    // If Mongoose validation fails, capture the custom message in our Schema
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: message[0] });
    }

    res.status(500).json({ success: false, message: "Server error occurred" });
  }
};

// Logic for logging in an existing user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Look up the user by their email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 2. Compare the incoming plain-text password with the hash in MongoDB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 3. If credentials match, mint a brand new digital wristband (JWT)
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '30d' }
    );

    // 4. Hand the token back to the browser
    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error occurred" });
  }
};
