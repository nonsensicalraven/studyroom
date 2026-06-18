const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const crypto = require('crypto');
const auth = require('../middleware/auth'); 

// @route   POST /api/rooms/create
// @desc    Create a new study room
router.post('/create', auth, async (req, res) => {
  try {
    const { 
      name, 
      mode, 
      customInput ,
      difficulty
    } = req.body;

    const hostId = req.user.id; 
    const roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const newRoom = new Room({
      roomCode,
      name,
      mode,
      hostId,
      customInput, 
      difficulty, 
      participants: [hostId], 
      timerState: mode === 'focus' ? 3000 : 1200, 
      phase: 'work'
    });

    await newRoom.save();
    res.status(201).json({ room: newRoom });
    
  } catch (err) {
    console.error("Backend Error Details:", err);
    res.status(500).json({ message: "Server Error creating room" });
  }
});

// @route   GET /api/rooms/:code
// @desc    Join room by code / Get room state
router.get('/:code', async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.code.toUpperCase() })
      .populate('participants', 'username');

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json(room);
  } catch (err) {
    res.status(500).json({ message: "Server Error fetching room" });
  }
});

module.exports = router;