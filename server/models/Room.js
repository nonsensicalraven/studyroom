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
  customInput: {
    type: String,
    required: function() {
      return this.mode === 'arena';
    }
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'none'],
    default: 'none'
  },
  timerState: {
    type: Number, 
    default: 1500 
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
    expires: 86400 
  }
});

module.exports = mongoose.model('Room', RoomSchema);