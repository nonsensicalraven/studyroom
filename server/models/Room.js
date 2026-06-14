const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    enum: ['focus', 'arena'],
    required: true
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  // This is the specific LeetCode link OR the Subject Title
  customInput: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'none'],
    default: 'none'
  },
  timerState: {
    type: Number, // Seconds remaining
    default: 1500 // Default 25 mins (Focus) or 1200 (Arena)
  },
  phase: {
    type: String,
    enum: ['work', 'reveal', 'break'],
    default: 'work'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Automatically delete room after 24 hours (cleanup)
  }
});

module.exports = mongoose.model('Room', RoomSchema);