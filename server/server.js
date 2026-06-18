const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');
require('dotenv').config(); 

// 1. IMPORT NATIVE NODE HTTP MODULE & SOCKET.IO
const http = require('http'); 
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 5000; 

// 2. WRAP EXPRESS INSIDE A RAW HTTP SERVER
const server = http.createServer(app);

// 3. INITIALIZE SOCKET.IO ON TOP OF OUR SERVER
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Allows Vite React frontend to connect securely
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors()); 
app.use(express.json()); 

// Test Route
app.get('/', (req, res) => {
  res.send('StudyRoom API is up and running smoothly!');
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', require('./routes/roomRoutes'));

// 4. THE LIVE SOCKET.IO NERVE CENTER (The Connection Listener)
io.on('connection', (socket) => {
  // This function automatically fires the exact millisecond a user opens your app
  console.log(`Real-Time Wire Active! User connected with ID: ${socket.id}`);

  //Listen for when a frontend client joins a specific room channel
  socket.on('join_room', (roomCode) => {
    socket.join(roomCode); // Shoves this user into that private room stream
    console.log(`🚪 Passport ${socket.id} locked into private room channel: ${roomCode}`);
  });

  // This function fires when a user closes the tab or loses internet connection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(' MongoDB Connected Successfully!'))
  .catch((err) => console.error(' MongoDB Connection Error:', err));

// 5. CRITICAL GEAR SHIFT: Change app.listen to server.listen!
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});