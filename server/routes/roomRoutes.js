const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const crypto = require('crypto');

// @route   POST /api/rooms/create
// @desc    Create a new study room
router.post('/create', async (req, res) => {
  try {
    const { name, mode, hostId, customInput, difficulty } = req.body;

    // Generate a unique 6-character room code
    const roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const newRoom = new Room({
      roomCode,
      name,
      mode,
      hostId,
      customInput,
      difficulty,
      participants: [hostId], // Host is the first participant
      timerState: mode === 'focus' ? 3000 : 1200, // 50 mins vs 20 mins
      phase: 'work'
    });

    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (err) {
    console.error(err);
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