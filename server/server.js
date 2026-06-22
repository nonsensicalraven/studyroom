const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('StudyRoom API is up and running smoothly!');
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', require('./routes/roomRoutes'));

const activeTimers = {};

// REUSABLE WORKSPACE LEAVE CLEANUP ENGINE
const handleLeaveRoomEngine = async (socket, roomCode, userId) => {
  if (!roomCode || !userId) return;

  try {
    const room = await mongoose.model('Room').findOne({ roomCode: roomCode.toUpperCase() });
    if (!room) return;

    // Filter out the moving user from the collection array
    room.participants = room.participants.filter(id => id.toString() !== userId);

    // Host Migration processing rules
    if (room.hostId && room.hostId.toString() === userId) {
      if (room.participants.length > 0) {
        room.hostId = room.participants[0];
        console.log(`[Lifecycle] Room ${roomCode}: Host shifted to user ${room.hostId}`);
      } else {
        console.log(`[Lifecycle] Room ${roomCode} is empty. Stopping clocks.`);
        if (activeTimers[roomCode] && activeTimers[roomCode].intervalId) {
          clearInterval(activeTimers[roomCode].intervalId);
          delete activeTimers[roomCode];
        }
      }
    }

    await room.save();

    // Broadcast update across the room channel
    io.to(roomCode.toUpperCase()).emit('user_left_broadcast', {
      msg: `A student has departed the workspace.`,
      newHostId: room.hostId
    });

    // Make the socket leave the stream entirely so it stops hearing the clock ticks
    socket.leave(roomCode.toUpperCase());

  } catch (err) {
    console.error("Error running Room Exit lifecycle handler:", err);
  }
};

io.on('connection', (socket) => {
  console.log(`Real-Time Wire Active! User connected with ID: ${socket.id}`);

  socket.on('join_room', async (payload) => {
    const roomCode = typeof payload === 'object' ? payload.roomCode : payload;
    const userId = typeof payload === 'object' ? payload.userId : null;

    socket.roomCode = roomCode;
    socket.userId = userId;

    socket.join(roomCode);
    console.log(`User [${userId || 'Guest'}] entered stream room channel: ${roomCode}`);

    // Synchronize WebSocket arrival back into MongoDB
    if (userId) {
      try {
        const room = await mongoose.model('Room').findOne({ roomCode: socket.roomCode });
        if (room && !room.participants.includes(userId)) {
          room.participants.push(userId);
          await room.save();
        }
      } catch (err) {
        console.error("Failed to append active socket user to DB:", err);
      }
    }

    socket.to(socket.roomCode).emit('user_joined_broadcast', { msg: 'A new user has entered the workspace!' });


    // Instantly catch up user with the ticking room clock
    if (activeTimers[roomCode]) {
      socket.emit('timer_update', {
        timeRemaining: activeTimers[roomCode].timeRemaining,
        currentPhase: activeTimers[roomCode].currentPhase
      });
    }
  });

  socket.on('start_session', (payload) => {
    const { roomCode, duration, mode } = payload;
    const cleanCode = roomCode.toUpperCase();




    //if times is laready ticking down, reject start requests
    if (activeTimers[cleanCode] &&
      activeTimers[cleanCode].timeRemaining < duration &&
      activeTimers[cleanCode].timeRemaining > 0
    ) {
      console.log(`[Timer Blocked] Room ${cleanCode} tried to restart an ongoing session.`);
      return;
    }
    if (activeTimers[roomCode] && activeTimers[roomCode].intervalId) {
      clearInterval(activeTimers[roomCode].intervalId);
    }

    activeTimers[roomCode] = {
      timeRemaining: duration,
      currentPhase: 'work',
      mode: mode,
      intervalId: null
    };

    activeTimers[roomCode].intervalId = setInterval(() => {
      if (activeTimers[roomCode].timeRemaining > 0) {
        activeTimers[roomCode].timeRemaining--;

        io.to(roomCode).emit('timer_update', {
          timeRemaining: activeTimers[roomCode].timeRemaining,
          currentPhase: activeTimers[roomCode].currentPhase
        });
      } else {
        clearInterval(activeTimers[roomCode].intervalId);
        activeTimers[roomCode].currentPhase = 'break';
        activeTimers[roomCode].timeRemaining = activeTimers[roomCode].mode === 'focus' ? 600 : 300;

        io.to(roomCode).emit('phase_changed', {
          currentPhase: 'break',
          timeRemaining: activeTimers[roomCode].timeRemaining
        });
      }
    }, 1000);
  });

  // EVENT A: User intentionally leaves or changes the room via UI controls
  socket.on('leave_room', async (payload) => {
    console.log(`[Intentional Exit] User ${payload.userId} leaving room ${payload.roomCode}`);
    await handleLeaveRoomEngine(socket, payload.roomCode, payload.userId);
  });

  // EVENT B: User crashes, shuts browser, or closes device tab
  socket.on('disconnect', async () => {
    console.log(`[Connection Crash] Socket closed: ${socket.id}`);
    if (socket.roomCode && socket.userId) {
      await handleLeaveRoomEngine(socket, socket.roomCode, socket.userId);
    }
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(' MongoDB Connected Successfully!'))
  .catch((err) => console.error(' MongoDB Connection Error:', err));

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});