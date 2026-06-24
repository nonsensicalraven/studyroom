const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 5000;

// Wrap express app in a raw Node HTTP server so Socket.io can attach to the same port
const server = http.createServer(app);

// Mount Socket.io on the HTTP server and whitelist the Vite dev client origin
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

// In-memory store for all active room timers
// Key: cleanCode (uppercase roomCode string)
// Value: { timeRemaining, currentPhase, mode, intervalId }
// This lives on the server so the timer is the single source of truth for all clients
const activeTimers = {};

// Shared teardown function used by both intentional leave and abrupt disconnect
// Removes user from DB participants array, reassigns host if needed, and clears timer if room empties
const handleLeaveRoomEngine = async (socket, roomCode, userId) => {
  if (!roomCode || !userId) return;

  // Normalize to uppercase to match the key convention used in activeTimers
  const cleanCode = roomCode.toUpperCase();

  try {
    const room = await mongoose.model('Room').findOne({ roomCode: cleanCode });
    if (!room) return;

    // Strip the departing user from the persistent participants list
    room.participants = room.participants.filter(id => id.toString() !== userId);

    if (room.hostId && room.hostId.toString() === userId) {
      if (room.participants.length > 0) {
        // Promote the next participant in line to host automatically
        room.hostId = room.participants[0];
        console.log(`[Lifecycle] Room ${cleanCode}: Host shifted to user ${room.hostId}`);
      } else {
        // Room is now empty so stop the server-side interval to free resources
        console.log(`[Lifecycle] Room ${cleanCode} is empty. Stopping clocks.`);
        if (activeTimers[cleanCode] && activeTimers[cleanCode].intervalId) {
          clearInterval(activeTimers[cleanCode].intervalId);
          delete activeTimers[cleanCode];
        }
      }
    }

    await room.save();

    // Broadcast the departure to remaining room members so their sidebars refresh
    io.to(cleanCode).emit('user_left_broadcast', {
      msg: `A student has departed the workspace.`,
      newHostId: room.hostId
    });

    socket.leave(cleanCode);

  } catch (err) {
    console.error("Error running Room Exit lifecycle handler:", err);
  }
};

io.on('connection', (socket) => {
  console.log(`Real-Time Wire Active! User connected with ID: ${socket.id}`);

  // Store cleanCode and userId on the socket object itself so the disconnect handler
  // can access them without needing the client to re-send the payload
  socket.on('join_room', async (payload) => {
    const rawCode = typeof payload === 'object' ? payload.roomCode : payload;
    const userId = typeof payload === 'object' ? payload.userId : null;

    // Always normalize to uppercase so all room operations use the same key
    const cleanCode = rawCode.toUpperCase();

    socket.roomCode = cleanCode;
    socket.userId = userId;

    socket.join(cleanCode);
    console.log(`User [${userId || 'Guest'}] entered stream room channel: ${cleanCode}`);

    // Persist the user into the DB participants array if not already there
    if (userId) {
      try {
        const room = await mongoose.model('Room').findOne({ roomCode: cleanCode });
        if (room && !room.participants.includes(userId)) {
          room.participants.push(userId);
          await room.save();
        }
      } catch (err) {
        console.error("Failed to append active socket user to DB:", err);
      }
    }

    // Notify the rest of the room that someone new arrived
    socket.to(cleanCode).emit('user_joined_broadcast', { msg: 'A new user has entered the workspace!' });

    // If a timer is already running when this user joins, immediately sync them
    // so they see the correct time instead of the default initial value
    if (activeTimers[cleanCode]) {
      socket.emit('timer_update', {
        timeRemaining: activeTimers[cleanCode].timeRemaining,
        currentPhase: activeTimers[cleanCode].currentPhase
      });
    }
  });

  // Host-only event that starts the master server-side countdown
  // The lockdown guard prevents a host from restarting a session that is already ticking
  socket.on('start_session', (payload) => {
    const { roomCode, duration, mode } = payload;

    // Normalize here so every read and write to activeTimers uses the same key
    const cleanCode = roomCode.toUpperCase();

    // Block restart if a session is already ticking down with time remaining
    if (activeTimers[cleanCode] &&
      activeTimers[cleanCode].timeRemaining < duration &&
      activeTimers[cleanCode].timeRemaining > 0
    ) {
      console.log(`[Timer Blocked] Room ${cleanCode} tried to restart an ongoing session.`);
      return;
    }

    // Clear any stale interval before creating a new one to avoid double-ticking
    if (activeTimers[cleanCode] && activeTimers[cleanCode].intervalId) {
      clearInterval(activeTimers[cleanCode].intervalId);
    }

    // All timer state is stored under cleanCode from this point forward
    activeTimers[cleanCode] = {
      timeRemaining: duration,
      currentPhase: 'work',
      mode: mode,
      intervalId: null
    };

    // Tick every second and broadcast the remaining time to every client in the room
    activeTimers[cleanCode].intervalId = setInterval(() => {
      if (activeTimers[cleanCode].timeRemaining > 0) {
        activeTimers[cleanCode].timeRemaining--;

        io.to(cleanCode).emit('timer_update', {
          timeRemaining: activeTimers[cleanCode].timeRemaining,
          currentPhase: activeTimers[cleanCode].currentPhase
        });
      } else {
        // Timer hit zero: decide which phase just ended
        if (activeTimers[cleanCode].currentPhase === 'work') {
          // Work phase ended: flip to break and set the correct break duration
          activeTimers[cleanCode].currentPhase = 'break';
          // Focus mode gets a 10-minute break (600s), Arena mode gets 5 minutes (300s)
          activeTimers[cleanCode].timeRemaining = activeTimers[cleanCode].mode === 'focus' ? 600 : 300;

          io.to(cleanCode).emit('phase_changed', {
            currentPhase: 'break',
            timeRemaining: activeTimers[cleanCode].timeRemaining
          });

        } else {
          // Break phase ended: stop the interval entirely and emit session_ended
          // The host must manually start the next session, giving the room time to reset
          clearInterval(activeTimers[cleanCode].intervalId);
          delete activeTimers[cleanCode];

          io.to(cleanCode).emit('session_ended', {
            message: 'Break over. Host can start the next session when ready.'
          });
        }
      }
    }, 1000);
  });

  // Fired when a user clicks the Leave button intentionally
  socket.on('leave_room', async (payload) => {
    console.log(`[Intentional Exit] User ${payload.userId} leaving room ${payload.roomCode}`);
    await handleLeaveRoomEngine(socket, payload.roomCode, payload.userId);
  });

  // Fired when the browser tab closes or the network drops without a clean leave event
  socket.on('disconnect', async () => {
    console.log(`[Connection Crash] Socket closed: ${socket.id}`);
    if (socket.roomCode && socket.userId) {
      await handleLeaveRoomEngine(socket, socket.roomCode, socket.userId);
    }
  });

  // Receives a user's private scratchpad when the work phase ends in Arena mode
  // Immediately broadcasts it to the whole room so everyone can see all submissions at once
  socket.on('submit_scratchpad', (payload) => {
    const { roomCode, userId, username, content } = payload;
    const cleanCode = roomCode.toUpperCase();

    console.log(`[Scratchpad Submitted] User ${username} in Room ${cleanCode}`);

    io.to(cleanCode).emit('scratchpad_revealed_broadcast', {
      userId,
      username,
      content
    });
  });

  // Receives a live goal progress update from a Focus mode user
  // Broadcasts to the whole room so sidebar badges update in real time for everyone
  // This fires on every checkbox toggle during the work phase, not just at phase end
  socket.on('share_goal_progress', (payload) => {
    const { roomCode, userId, completedCount } = payload;
    io.to(roomCode.toUpperCase()).emit('goal_progress_broadcast', {
      userId,
      completedCount
    });
  });

  // Simple relay for break-time discussion messages
  // Server does no persistence here: messages are ephemeral and live only in client state
  socket.on('send_lounge_message', (payload) => {
    const { roomCode, username, text } = payload;
    io.to(roomCode.toUpperCase()).emit('receive_lounge_message', {
      username,
      text,
      id: Date.now().toString()
    });
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});