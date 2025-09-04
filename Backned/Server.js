import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { verifySocketToken } from './middleware/authmiddleware.js';
import { User } from './models/user.js';
import StudySession from './models/StudySession.js';
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
app.get('/',(req,res)=>{
    res.send("Api Working.")
})

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
    origin: 'https://dojoapp-7.onrender.com/'||process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

// Store active sessions and their participants
const activeSessions = new Map();

// Helper: verify member is accepted
async function isAcceptedParticipant(sessionId, userId) {
  const session = await StudySession.findById(sessionId).select("participants status");
  if (!session) return { ok: false, reason: "not_found" };
  const accepted = session.participants.some(p => String(p.user) === String(userId) && p.status === "accepted");
  return { ok: accepted, status: session.status };
}

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

    console.log(`🔗 User connected: ${user.name}`);

    // Send invite
    socket.on('sendInvite', async (inviteData) => {
      console.log("Sending invite from creator:", user.name)
      const { toUserId, sessionDetails } = inviteData;

      try {
        // Ensure the session creator is marked as accepted participant
        const sessionId = sessionDetails._id;
        const session = await StudySession.findById(sessionId);

        if (session) {
          // Check if creator is already in participants, if not add them
          const creatorExists = session.participants.some(p => String(p.user) === String(user._id));

          if (!creatorExists) {
            session.participants.push({
              user: user._id,
              status: 'accepted', // Creator is automatically accepted
              invitedAt: new Date(),
              respondedAt: new Date()
            });
            await session.save();
            console.log(`✅ Added creator ${user.name} as accepted participant`);
          } else {
            // If creator exists but not accepted, make them accepted
            await StudySession.updateOne(
              { _id: sessionId, 'participants.user': user._id },
              {
                $set: {
                  'participants.$.status': 'accepted',
                  'participants.$.respondedAt': new Date()
                }
              }
            );
            console.log(`✅ Updated creator ${user.name} status to accepted`);
          }
        }

        // Send invite to the recipient
        io.to(toUserId).emit('receiveInvite', {
          from: user._id,
          name: user.name,
          sessionDetails
        });

      } catch (error) {
        console.error('❌ Error processing invite:', error);
      }
    });

    // Accept invite - Create session room and mark as scheduled
    socket.on('acceptInvite', async ({ sessionDetails }) => {
      try {
        const sessionId = sessionDetails._id;
        const sessionRoom = `session_${sessionId}`;

        // 1. Fetch session from DB
        const session = await mongoose.model("StudySession").findById(sessionId);
        if (!session) {
          console.error("❌ Session not found in DB");
          return;
        }
        console.log("Backend Logs During Invite Accepted:::::::", session)

        // 2. Update participant status
        session.participants = session.participants.map(p =>
          String(p.user) === String(user._id)
            ? { ...p.toObject(), status: "accepted", respondedAt: new Date() }
            : p
        );

        // 3. Mark session as scheduled (not in_progress yet - that happens when users actually join)
        session.status = "scheduled";
        await session.save();
        console.log("Session marked as scheduled:", session)

        // 4. Notify all participants that session is now scheduled and ready to join
        const participantIds = session.participants.map(p => String(p.user));
        console.log("Notifying participants:", participantIds)

        // 5. Send session ready notification to all participants
        participantIds.forEach(uid => {
          io.to(uid).emit('sessionScheduled', {
            sessionId,
            roomId: sessionRoom,
            sessionDetails: session,
            message: 'Session is scheduled! You can now join.'
          });
        });

        // 6. Notify inviter specifically about acceptance
        io.to(String(session.creator)).emit('inviteAccepted', {
          by: String(user._id),
          name: user.name,
          sessionDetails: session,
          sessionId,
          roomId: sessionRoom
        });

        console.log(`✅ Session scheduled: ${sessionId} by ${user.name}`);
      } catch (error) {
        console.error('❌ Error accepting invite:', error);
      }
    });

    /**
     * NEW: Join Session - This is triggered when user clicks "Join Session" button
     */
    socket.on('joinSession', async ({ sessionId }) => {
      try {
        console.log(`🔗 User ${user.name} attempting to join session ${sessionId}`);

        // 1. Verify user is accepted participant
        const verification = await isAcceptedParticipant(sessionId, user._id);
        if (!verification.ok) {
          return socket.emit('joinError', {
            message: verification.reason === 'not_found' ? 'Session not found' : 'Not authorized to join this session'
          });
        }

        // 2. Check if session is in correct status
        if (verification.status !== 'scheduled' && verification.status !== 'in_progress') {
          return socket.emit('joinError', {
            message: 'Session is not available for joining'
          });
        }

        const sessionRoom = `session_${sessionId}`;

        // 3. Join the socket room
        socket.join(sessionRoom);

        // 4. Update session status to in_progress if it's the first person joining
        const session = await StudySession.findById(sessionId);
        if (session.status === 'scheduled') {
          session.status = 'in_progress';
          session.actualStartTime = new Date();
          await session.save();

          // Notify all participants that session has started
          io.to(sessionRoom).emit('sessionStarted', {
            sessionId,
            sessionDetails: session,
            message: 'Study session is now live!'
          });
        }

        // 5. Track active participants in memory
        if (!activeSessions.has(sessionId)) {
          activeSessions.set(sessionId, {
            participants: new Set(),
            messages: [],
            sessionDetails: session
          });
        }

        const activeSession = activeSessions.get(sessionId);
        activeSession.participants.add(String(user._id));

        // 6. Notify other participants that user has joined
        // 6. Notify other participants that user has joined
        socket.to(sessionRoom).emit('userJoinedSession', {
          sessionId: sessionId,
          userId: String(user._id),
          userName: user.name, // Changed from 'name' to 'userName' to match frontend
          participantCount: activeSession.participants.size,
          sessionDetails: session // Include session details for frontend updates
        });

        // 7. Send confirmation to the joining user
        socket.emit('sessionJoined', {
          sessionId,
          roomId: sessionRoom,
          sessionDetails: session,
          participantCount: activeSession.participants.size,
          message: 'Successfully joined the study session!'
        });

        // 8. Send existing messages to newly joined user
        socket.emit('sessionMessages', {
          sessionId,
          messages: session.messages || []
        });

        console.log(`✅ User ${user.name} successfully joined session ${sessionId}`);

      } catch (error) {
        console.error('❌ Error joining session:', error);
        socket.emit('joinError', { message: 'Failed to join session' });
      }
    });

    /**
     * Leave a session room
     */
    socket.on("leaveSession", async ({ sessionId }) => {
      try {
        const sessionRoom = `session_${sessionId}`;
        socket.leave(sessionRoom);

        // Remove from active participants
        if (activeSessions.has(sessionId)) {
          const activeSession = activeSessions.get(sessionId);
          activeSession.participants.delete(String(user._id));

          // Notify others that user left
          io.to(sessionRoom).emit("userLeftSession", {
            sessionId: sessionId,
            userId: String(user._id),
            userName: user.name, // Changed from 'name' to 'userName' to match frontend
            participantCount: activeSession.participants.size,
            sessionDetails: activeSession.sessionDetails // Include session details
          });

          // If no participants left, clean up
          if (activeSession.participants.size === 0) {
            activeSessions.delete(sessionId);

            // Optionally update session status back to scheduled if all leave
            await StudySession.findByIdAndUpdate(sessionId, {
              status: 'scheduled',
              $unset: { actualStartTime: 1 }
            });
          }
        }

        socket.emit('sessionLeft', { sessionId });
        console.log(`👋 User ${user.name} left session ${sessionId}`);

      } catch (error) {
        console.error('❌ Error leaving session:', error);
      }
    });

    /**
     * Send message (only when in_progress & accepted)
     */
    socket.on("sendChatMessage", async ({ sessionId, text }) => {
      if (!text || !text.trim()) return;

      console.log("<----------SessionId-----------> ")
      console.log(sessionId)

      try {
        // 1. Verify user is accepted participant and session is in progress
        const verification = await isAcceptedParticipant(sessionId, user._id);
        if (!verification.ok) {
          return socket.emit("chatError", { msg: "Not authorized to send messages" });
        }

        const session = await StudySession.findById(sessionId);
        if (!session) return socket.emit("chatError", { msg: "Session not found." });

        if (session.status !== "in_progress") {
          return socket.emit("chatError", { msg: "Chat available only when session is LIVE." });
        }

        const message = {
          user: user._id,
          name: user.name,
          text: text.trim(),
          ts: new Date()
        };
        console.log("Sending message:", message)

        // 2. Persist message and keep only last 500
        await StudySession.updateOne(
          { _id: sessionId },
          { $push: { messages: { $each: [message], $slice: -500 } } }
        );

        // 3. Also store in active session for quick access
        if (activeSessions.has(sessionId)) {
          const activeSession = activeSessions.get(sessionId);
          activeSession.messages.push(message);
          // Keep only last 50 messages in memory
          if (activeSession.messages.length > 50) {
            activeSession.messages = activeSession.messages.slice(-50);
          }
        }

        // 4. Broadcast to all participants in the session room
        io.to(`session_${sessionId}`).emit("newChatMessage", {
          ...message,
          _id: new mongoose.Types.ObjectId() // client key if needed
        });

      } catch (error) {
        console.error('❌ Error sending chat message:', error);
        socket.emit("chatError", { msg: "Failed to send message" });
      }
    });

    /**
     * Typing indicator (broadcast to others)
     */
    socket.on("typing", ({ sessionId, isTyping }) => {
      socket.to(`session_${sessionId}`).emit("userTyping", {
        userId: String(user._id),
        name: user.name,
        isTyping: !!isTyping
      });
    });

    // Decline invite
    socket.on("declineInvite", async ({ fromUserId, sessionId }) => {
      try {
        // update participant status in session
        await StudySession.updateOne(
          { _id: sessionId },
          { $set: { "participants.$[elem].status": "declined", "participants.$[elem].respondedAt": new Date() } },
          { arrayFilters: [{ "elem.user": socket.user._id }] }
        );

        const updatedSession = await StudySession.findById(sessionId).populate("participants.user");

        // notify inviter
        io.to(String(fromUserId)).emit("inviteDeclined", {
          by: socket.user._id,
          name: socket.user.name,
          sessionId,
          sessionDetails: updatedSession,
        });

        // optionally: also tell the declining user that decline was successful
        socket.emit("inviteDeclinedSelf", {
          sessionId,
          status: "declined"
        });
      } catch (err) {
        console.error("❌ Error declining invite:", err);
        socket.emit("error", { msg: "Could not decline invite" });
      }
    });

    // Get session messages
    socket.on('getSessionMessages', async ({ sessionId }) => {
      try {
        const verification = await isAcceptedParticipant(sessionId, user._id);
        if (!verification.ok) {
          return socket.emit('chatError', { msg: 'Not authorized to view messages' });
        }

        const session = await StudySession.findById(sessionId).select('messages');
        if (session) {
          socket.emit('sessionMessages', {
            sessionId: sessionId,
            messages: session.messages || []
          });
        }
      } catch (error) {
        console.error('❌ Error fetching messages:', error);
      }
    });

    // Handle disconnect - clean up active sessions
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${user.name}`);

      // Clean up from all active sessions
      for (const [sessionId, activeSession] of activeSessions.entries()) {
        if (activeSession.participants.has(String(user._id))) {
          activeSession.participants.delete(String(user._id));

          // Notify others in the session
          io.to(`session_${sessionId}`).emit("userLeftSession", {
            userId: String(user._id),
            name: user.name,
            participantCount: activeSession.participants.size,
            reason: 'disconnected'
          });

          // Clean up empty sessions
          if (activeSession.participants.size === 0) {
            activeSessions.delete(sessionId);
          }
        }
      }
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
