const express = require('express');
const router = express.Router();
const { registerUser } = require('../controllers/authController');

// This pipe handles: POST requests to /register -> forwards them to registerUser
router.post('/register', registerUser);

module.exports = router;