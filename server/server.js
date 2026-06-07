const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // This line opens the hidden safe (.env) so the code can read its secrets!

const app = express();
const PORT = process.env.PORT || 5000; //if a custom port assigned in .env, use that or else use PORT 5000

// Middleware (Helper functions that handle incoming data smoothly)
app.use(cors()); // Allows browsers to safely communicate with backend
app.use(express.json()); // Allows server to read JSON data sent by users

// A basic "Test Route" to make sure the server is alive
app.get('/', (req, res) => {
  res.send('StudyRoom API is up and running smoothly');
});

// Connect to the Cloud Vault (MongoDB) using the secret URI from .env file
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(' MongoDB Connected Successfully!'))
  .catch((err) => console.error(' MongoDB Connection Error:', err));

// Tell the server to start listening for visitors
app.listen(PORT, () => {
  console.log(`📡 Server running on http://localhost:${PORT}`);
});