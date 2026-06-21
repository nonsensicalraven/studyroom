const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const crypto = require('crypto');
const auth = require('../middleware/auth'); 

// @route   POST /api/rooms/create
// Create a new study room
router.post('/create', auth, async (req, res) => {
  try {
    const { 
      name, 
      mode, 
      customInput,
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

// @route   GET /api/rooms/:roomCode
// Get room state by code
router.get('/:roomCode', auth, async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode.toUpperCase() })
      .populate('hostId', 'username') // This extracts the username from the User collection
      .populate('participants', 'username');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching room' });
  }
});

// @route   POST /api/rooms/join
// Join an existing room via short code
router.post('/join', auth, async (req, res) => {
  try {
    const { roomCode } = req.body;
    const userId = req.user.id; 

    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });

    if (!room) {
      return res.status(404).json({ message: 'Room not found. Check your code!' });
    }

    if (!room.participants.includes(userId)) {
      room.participants.push(userId); 
      await room.save();
    }

    res.json({ message: 'Joined successfully', roomCode: room.roomCode });

  } catch (err) {
    console.error("Join Route Error:", err);
    res.status(500).json({ message: 'Server error while attempting to join room' });
  }
});

module.exports = router;