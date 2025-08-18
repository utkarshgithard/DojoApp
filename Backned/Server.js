import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { verifySocketToken } from './middleware/authMiddleware.js';
import { User } from './models/User.js';

// Routes
import userRouter from './routes/authRoutes.js';
import subjectRouter from './routes/subjectRoutes.js';
import scheduleRouter from './routes/scheduleRoutes.js';
import attendanceRouter from './routes/attendanceRoutes.js';
import studySessionRouter from './routes/studySessionRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', userRouter);
app.use('/api/subject', subjectRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/study-session', studySessionRouter);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Create HTTP server for both Express + Socket.io
const server = createServer(app);

// Init Socket.io
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Store active sessions and their participants
const activeSessions = new Map();

io.on('connection', async (socket) => {
  try {
    // Verify token from handshake
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const userId = verifySocketToken(token);
    console.log("------consoling from server.js--------")
    console.log(userId)
    if (!userId) return socket.disconnect(true);

    // Fetch user from DB
    const user = await User.findById(userId).select('-password');
    if (!user) return socket.disconnect(true);
    console.log(user)
    socket.user = user;
    socket.join(user._id.toString()); // join private room

    console.log(`�� User connected: ${user.name}`);

    // Send invite
    socket.on('sendInvite', (inviteData) => {
      console.log("Hi")
      const { toUserId, sessionDetails } = inviteData;
      io.to(toUserId).emit('receiveInvite', {
        from: user._id,
        name: user.name,
        sessionDetails
      });
    });

    // Accept invite - Create session room and join both users
    socket.on('acceptInvite', async ({ fromUserId, sessionDetails }) => {
      try {
        const sessionId = sessionDetails._id;
        const sessionRoom = `session_${sessionId}`;

        // 1. Fetch session from DB
        const session = await mongoose.model("StudySession").findById(sessionId);
        if (!session) {
          console.error("❌ Session not found in DB");
          return;
        }

        // 2. Update participant status
        session.participants = session.participants.map(p =>
          String(p.user) === String(user._id)
            ? { ...p.toObject(), status: "accepted", respondedAt: new Date() }
            : p
        );

        // 3. Mark session as scheduled now
        session.status = "scheduled";
        await session.save();

        // 4. Save in-memory active session
        activeSessions.set(sessionId, {
          participants: [userId, fromUserId],
          sessionDetails: session,
          messages: []
        });

        // 5. Join both users to room
        socket.join(sessionRoom);
        io.to(fromUserId).emit('joinSessionRoom', { sessionId, roomId: sessionRoom });

        // 6. Notify inviter
        io.to(fromUserId).emit('inviteAccepted', {
          by: user._id,
          name: user.name,
          sessionDetails: session,
          sessionId,
          roomId: sessionRoom
        });

        // 7. Emit sessionStarted to both
        io.to(sessionRoom).emit('sessionStarted', {
          sessionId,
          participants: [userId, fromUserId],
          sessionDetails: session
        });

        console.log(`✅ Session scheduled: ${sessionId} by ${user.name}`);
      } catch (error) {
        console.error('❌ Error accepting invite:', error);
      }
    });

    // Decline invite
    socket.on('declineInvite', ({ fromUserId }) => {
      io.to(fromUserId).emit('inviteDeclined', {
        by: user._id,
        name: user.name
      });
    });

    // Join existing session room
    socket.on('joinSessionRoom', ({ sessionId, roomId }) => {
      if (activeSessions.has(sessionId)) {
        socket.join(roomId);
        console.log(`🔗 User ${user.name} joined session room: ${roomId}`);
      }
    });

    // Send chat message
    socket.on('sendChatMessage', ({ sessionId, message }) => {
      if (activeSessions.has(sessionId)) {
        const session = activeSessions.get(sessionId);
        const sessionRoom = `session_${sessionId}`;

        if (session.participants.includes(userId)) {
          const chatMessage = {
            sessionId: sessionId,
            userId: userId,
            userName: user.name,
            message: message,
            timestamp: new Date().toISOString()
          };

          // Store message
          session.messages.push(chatMessage);

          // Broadcast to all users in the session room
          io.to(sessionRoom).emit('newChatMessage', chatMessage);
          console.log(`💬 Message sent in session ${sessionId} by ${user.name}`);
        }
      }
    });

    // Get session messages
    socket.on('getSessionMessages', ({ sessionId }) => {
      if (activeSessions.has(sessionId)) {
        const session = activeSessions.get(sessionId);
        if (session.participants.includes(userId)) {
          socket.emit('sessionMessages', {
            sessionId: sessionId,
            messages: session.messages
          });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${user.name}`);
    });

  } catch (err) {
    console.error('Socket connection error:', err);
    socket.disconnect(true);
  }
});

// Make Socket.IO instance available to Express app
app.set('io', io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

export { io };

import './utils/sessionStatusUpdater.js'