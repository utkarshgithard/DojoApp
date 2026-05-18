import { Server, Socket } from 'socket.io';
import prisma from './lib/prisma.js';
import { verifySocketTokenAsync } from './middleware/authmiddleware.js';

// --- Types & Interfaces ---

interface UserPayload {
  id: string;
  name: string;
  email: string;
}

interface ActiveSession {
  participants: Set<string>;
  sessionId: string;
}

// --- In-memory active session tracking ---
// NOTE: For multi-process / multi-server deployments, replace this Map with
// a Redis-backed store using @socket.io/redis-adapter + Redis Sets.
// e.g. SADD session:{id}:members userId  |  SCARD session:{id}:members
const activeSessions = new Map<string, ActiveSession>();

// --- In-memory chat storage ---
// Key: sessionId, Value: array of message objects
const sessionMessages = new Map<string, any[]>();

// --- Per-user typing timeout handles ---
// Clears "is typing" state if a user disconnects or stops sending typing events
const typingTimers = new Map<string, NodeJS.Timeout>();

// --- Per-socket rate limit counters (chat messages) ---
// Key: socketId, Value: { count, resetAt }
const chatRateLimits = new Map<string, { count: number; resetAt: number }>();

// --- Constants ---
const INVITE_TTL_MS = 15 * 60 * 1000;       // 15 minutes
const TYPING_TIMEOUT_MS = 5_000;             // clear "typing" after 5s silence
const CHAT_RATE_LIMIT = 5;                   // max messages per window
const CHAT_RATE_WINDOW_MS = 1_000;           // per second
const MAX_MESSAGE_LENGTH = 2_000;            // characters
const MAX_MESSAGES_PER_SESSION = 500;

// --- Helper: Check if user is an accepted participant ---
async function getParticipantStatus(sessionId: string, userId: string) {
  if (!sessionId || !userId) return { ok: false, reason: 'missing_params' };

  const session = await prisma.studySession.findUnique({
    where: { id: sessionId },
    include: { participants: true },
  });

  if (!session) return { ok: false, reason: 'not_found' };

  const participant = session.participants.find((p) => p.userId === userId);
  const accepted = participant?.status === 'accepted';

  return {
    ok: accepted,
    status: session.status,
    creatorId: session.creatorId,
    participant,
    session,
  };
}

// --- Helper: Clear typing state for a user in a session ---
function clearTyping(io: Server, userId: string, userName: string, sessionId: string) {
  const key = `${userId}:${sessionId}`;
  const existing = typingTimers.get(key);
  if (existing) clearTimeout(existing);
  typingTimers.delete(key);
  io.to(`session_${sessionId}`).emit('userTyping', { userId, name: userName, isTyping: false });
}

// --- Helper: Check & enforce chat rate limit ---
function isRateLimited(socketId: string): boolean {
  const now = Date.now();
  const limit = chatRateLimits.get(socketId);

  if (!limit || now > limit.resetAt) {
    chatRateLimits.set(socketId, { count: 1, resetAt: now + CHAT_RATE_WINDOW_MS });
    return false;
  }

  if (limit.count >= CHAT_RATE_LIMIT) return true;

  limit.count++;
  return false;
}

// --- Helper: Mark session completed if all participants left ---
async function maybeCompleteSession(io: Server, sessionId: string) {
  const active = activeSessions.get(sessionId);
  if (active && active.participants.size === 0) {
    activeSessions.delete(sessionId);
    sessionMessages.delete(sessionId); // Clear messages when session ends
    try {
      await prisma.studySession.update({
        where: { id: sessionId },
        data: { status: 'completed' },
      });
      io.to(`session_${sessionId}`).emit('sessionEnded', { sessionId });
      console.log(`📕 Session ${sessionId} marked completed (all participants left)`);
    } catch (err) {
      console.error('maybeCompleteSession error:', err);
    }
  }
}

// --- Main Setup ---

export function setupSocketHandlers(io: Server) {
  io.on('connection', async (socket: Socket) => {
    try {
      // 1. Authenticate via Firebase token
      const token = (socket.handshake.auth?.token || socket.handshake.query?.token) as string | undefined;
      const userId = await verifySocketTokenAsync(token);

      if (!userId) {
        console.log('❌ Socket rejected: invalid token');
        return socket.disconnect(true);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });

      if (!user) {
        console.log('❌ Socket rejected: user not found');
        return socket.disconnect(true);
      }

      // Join personal notification room
      (socket as any).user = user;
      socket.join(user.id);
      console.log(`🔗 Connected: ${user.name} (${user.id}) socket=${socket.id}`);

      // 2. Connection state recovery (Socket.io v4+)
      // If the socket recovered from a brief disconnect, re-join any active sessions
      if ((socket as any).recovered) {
        try {
          const activeMemberships = await prisma.participant.findMany({
            where: { userId: user.id, status: 'accepted' },
            include: { session: true },
          });
          for (const membership of activeMemberships) {
            if (membership.session.status === 'in_progress') {
              const sessionRoom = `session_${membership.sessionId}`;
              if (!socket.rooms.has(sessionRoom)) {
                socket.join(sessionRoom);
                console.log(`♻️ Recovered: ${user.name} re-joined session ${membership.sessionId}`);
              }
            }
          }
        } catch (err) {
          console.error('Recovery re-join error:', err);
        }
      }

      // 3. Register grouped handlers
      registerInviteHandlers(io, socket, user);
      registerSessionHandlers(io, socket, user);
      registerChatHandlers(io, socket, user);

      // 4. Cleanup on disconnect
      // Remove maybeCompleteSession from handleDisconnect entirely.
      // Only call it from the explicit leaveSession and endSession handlers.

      async function handleDisconnect(io: Server, socket: Socket, user: UserPayload) {
        chatRateLimits.delete(socket.id);

        for (const [sessionId, active] of activeSessions.entries()) {
          if (active.participants.has(user.id)) {
            active.participants.delete(user.id);
            clearTyping(io, user.id, user.name, sessionId);

            io.to(`session_${sessionId}`).emit('userLeftSession', {
              sessionId,
              userId: user.id,
              name: user.name,
              participantCount: active.participants.size,
              reason: 'disconnected',
            });

            // ✅ DO NOT call maybeCompleteSession here — a refresh is a disconnect too.
            // Only clean up the in-memory set if empty, but leave DB status as-is.
            if (active.participants.size === 0) {
              activeSessions.delete(sessionId);
              // DB stays 'in_progress' so users can rejoin after refresh
            }
          }
        }
      }

    } catch (err) {
      console.error('Socket connection error:', err);
      socket.disconnect(true);
    }
  });
}

// =============================================================================
// INVITE HANDLERS
// =============================================================================
function registerInviteHandlers(io: Server, socket: Socket, user: UserPayload) {

  // Creator sends an invite to a friend after creating the session
  socket.on('sendInvite', async (data: { toUserId: string; sessionDetails: { id: string } }) => {
    const { toUserId, sessionDetails } = data;
    const sessionId = sessionDetails?.id;

    if (!sessionId || !toUserId) {
      return socket.emit('inviteError', { error: 'Missing sessionId or toUserId' });
    }

    try {
      // FIX: Verify the sender is actually the creator of this session
      const session = await prisma.studySession.findUnique({ where: { id: sessionId } });
      if (!session) {
        return socket.emit('inviteError', { error: 'Session not found' });
      }
      if (session.creatorId !== user.id) {
        console.warn(`⚠️ ${user.name} tried to send invite for session they don't own: ${sessionId}`);
        return socket.emit('inviteError', { error: 'Not authorized to invite for this session' });
      }

      // Ensure creator has an accepted participant record
      await prisma.participant.upsert({
        where: { sessionId_userId: { sessionId, userId: user.id } },
        update: { status: 'accepted', respondedAt: new Date() },
        create: {
          sessionId,
          userId: user.id,
          status: 'accepted',
          invitedAt: new Date(),
          respondedAt: new Date(),
        },
      });

      // FIX: Check if invitee is online before emitting; warn creator if offline
      const targetSockets = await io.in(toUserId).fetchSockets();
      if (targetSockets.length === 0) {
        console.log(`📭 Invite target ${toUserId} is offline`);
        socket.emit('inviteUndelivered', {
          toUserId,
          sessionId,
          message: 'User is currently offline. They will see the invite when they reconnect.',
        });
        // Still persist the participant record so they see it on reconnect
        await prisma.participant.upsert({
          where: { sessionId_userId: { sessionId, userId: toUserId } },
          update: { status: 'invited' },
          create: {
            sessionId,
            userId: toUserId,
            status: 'invited',
            invitedAt: new Date(),
          },
        });
        return;
      }

      io.to(toUserId).emit('receiveInvite', {
        from: user.id,
        name: user.name,
        sessionDetails,
        invitedAt: new Date().toISOString(), // FIX: Send timestamp for client-side TTL display
      });
      console.log(`📩 Invite: ${user.name} → ${toUserId} for session ${sessionId}`);
    } catch (error) {
      console.error('sendInvite error:', error);
      socket.emit('inviteError', { error: 'Failed to send invite' });
    }
  });

  // Invitee accepts the invite
  socket.on('acceptInvite', async ({ sessionDetails }: { sessionDetails: any }, callback?: Function) => {
    const sessionId = sessionDetails?.id;
    const sessionRoom = `session_${sessionId}`;

    if (!sessionId) {
      if (callback) callback({ ok: false, error: 'Invalid session data' });
      return;
    }

    try {
      // FIX: Fetch session and check status atomically before updating
      // to prevent double-accept race condition
      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true },
      });

      if (!session) {
        if (callback) callback({ ok: false, error: 'Session not found' });
        return;
      }

      // FIX: Idempotency guard — reject if already started by a prior accept
      if (session.status !== 'scheduled' && session.status !== 'pending') {
        if (callback) callback({ ok: false, error: 'Invite already responded to or session already active' });
        return;
      }

      // FIX: Check invite TTL
      const participant = session.participants.find((p) => p.userId === user.id);
      if (participant?.invitedAt) {
        const age = Date.now() - new Date(participant.invitedAt).getTime();
        if (age > INVITE_TTL_MS) {
          socket.emit('inviteExpired', { sessionId });
          if (callback) callback({ ok: false, error: 'Invite has expired' });
          return;
        }
      }

      // Mark invitee as accepted
      await prisma.participant.updateMany({
        where: { sessionId, userId: user.id },
        data: { status: 'accepted', respondedAt: new Date() },
      });

      // Move session to in_progress
      const updatedSession = await prisma.studySession.update({
        where: { id: sessionId },
        data: { status: 'in_progress', actualStartTime: new Date() },
        include: { participants: true },
      });

      // Notify ALL participants to refresh / show "Join" button
      updatedSession.participants.forEach((p) => {
        io.to(p.userId).emit('sessionScheduled', {
          sessionId,
          roomId: sessionRoom,
          sessionDetails: updatedSession,
          message: 'Session is live! You can join now.',
        });
      });

      // Extra event to creator: auto-join and open chat
      io.to(session.creatorId).emit('inviteAccepted', {
        by: user.id,
        name: user.name,
        sessionId,
        roomId: sessionRoom,
        sessionDetails: updatedSession,
      });

      console.log(`✅ ${user.name} accepted invite for session ${sessionId}`);
      if (callback) callback({ ok: true, session: updatedSession });
    } catch (error) {
      console.error('acceptInvite error:', error);
      if (callback) callback({ ok: false, error: 'Server error' });
    }
  });

  // Invitee declines the invite
  socket.on('declineInvite', async ({ fromUserId, sessionId }: { fromUserId: string; sessionId: string }) => {
    if (!sessionId || !fromUserId) return;

    try {
      // FIX: Verify the relationship is legitimate before notifying anyone
      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true },
      });

      if (!session) return;

      // Ensure the claimed "fromUserId" is actually the creator
      if (session.creatorId !== fromUserId) {
        console.warn(`⚠️ ${user.name} sent declineInvite with mismatched fromUserId`);
        return;
      }

      // Ensure the declining user has a participant record for this session
      const hasRecord = session.participants.some((p) => p.userId === user.id);
      if (!hasRecord) {
        console.warn(`⚠️ ${user.name} tried to decline an invite they were not part of`);
        return;
      }

      await prisma.participant.updateMany({
        where: { sessionId, userId: user.id },
        data: { status: 'declined', respondedAt: new Date() },
      });

      io.to(fromUserId).emit('inviteDeclined', {
        by: user.id,
        name: user.name,
        sessionId,
      });

      socket.emit('inviteDeclinedSelf', { sessionId });
      console.log(`❌ ${user.name} declined invite for session ${sessionId}`);
    } catch (err) {
      console.error('declineInvite error:', err);
    }
  });
}

// =============================================================================
// SESSION HANDLERS
// =============================================================================
function registerSessionHandlers(io: Server, socket: Socket, user: UserPayload) {

  socket.on('joinSession', async ({ sessionId }: { sessionId: string }) => {
    if (!sessionId) {
      return socket.emit('joinError', { message: 'Invalid session ID' });
    }

    try {
      const verification = await getParticipantStatus(sessionId, user.id);

      if (!verification.ok) {
        console.log(`⚠️ ${user.name} attempted to join session ${sessionId}: ${verification.reason}`);
        return socket.emit('joinError', { message: 'Not authorized to join this session' });
      }

      if (verification.status === 'completed' || verification.status === 'cancelled') {
        return socket.emit('joinError', { message: 'This session has ended' });
      }

      const sessionRoom = `session_${sessionId}`;

      // FIX: Prevent duplicate room joins — socket would receive broadcasts multiple times
      if (socket.rooms.has(sessionRoom)) {
        console.log(`ℹ️ ${user.name} already in room ${sessionRoom}, skipping re-join`);
        // Still re-send current state so client can re-hydrate if needed
        const sessionData = await prisma.studySession.findUnique({
          where: { id: sessionId },
        });
        const active = activeSessions.get(sessionId);
        socket.emit('sessionJoined', {
          sessionId,
          roomId: sessionRoom,
          sessionDetails: sessionData,
          participantCount: active?.participants.size ?? 1,
        });
        socket.emit('sessionMessages', {
          sessionId,
          messages: sessionMessages.get(sessionId) || [],
        });
        return;
      }

      socket.join(sessionRoom);

      let sessionData = await prisma.studySession.findUnique({
        where: { id: sessionId },
      });

      if (sessionData?.status === 'scheduled') {
        sessionData = await prisma.studySession.update({
          where: { id: sessionId },
          data: { status: 'in_progress', actualStartTime: new Date() },
        });
        io.to(sessionRoom).emit('sessionStarted', { sessionId, sessionDetails: sessionData });
      }

      // Track in-memory presence
      if (!activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, { participants: new Set(), sessionId });
      }
      const active = activeSessions.get(sessionId)!;
      active.participants.add(user.id);

      socket.to(sessionRoom).emit('userJoinedSession', {
        sessionId,
        userId: user.id,
        name: user.name,
        participantCount: active.participants.size,
      });

      socket.emit('sessionJoined', {
        sessionId,
        roomId: sessionRoom,
        sessionDetails: sessionData,
        participantCount: active.participants.size,
      });

      // Send chat history separately — client should NOT call getSessionMessages again on mount
      socket.emit('sessionMessages', {
        sessionId,
        messages: sessionMessages.get(sessionId) || [],
      });

      console.log(`✅ ${user.name} joined session ${sessionId} (${active.participants.size} in room)`);
    } catch (error) {
      console.error('joinSession error:', error);
      socket.emit('joinError', { message: 'Failed to join session' });
    }
  });

  socket.on('leaveSession', async ({ sessionId }: { sessionId: string }) => {
    if (!sessionId) return;

    const sessionRoom = `session_${sessionId}`;
    socket.leave(sessionRoom);

    // Clear any active typing state for this user in this session
    clearTyping(io, user.id, user.name, sessionId);

    const active = activeSessions.get(sessionId);
    if (active) {
      active.participants.delete(user.id);

      io.to(sessionRoom).emit('userLeftSession', {
        sessionId,
        userId: user.id,
        name: user.name,
        participantCount: active.participants.size,
      });

      // FIX: Mark session completed in DB when last participant leaves
      await maybeCompleteSession(io, sessionId);
    }

    socket.emit('sessionLeft', { sessionId });
    console.log(`👋 ${user.name} left session ${sessionId}`);
  });

  // Typing indicator
  socket.on('typing', ({ sessionId, isTyping }: { sessionId: string; isTyping: boolean }) => {
    if (!sessionId) return;

    const key = `${user.id}:${sessionId}`;

    // FIX: Server-side typing timeout — clears "typing" state if user
    // disconnects or stops sending events without sending isTyping:false
    const existing = typingTimers.get(key);
    if (existing) clearTimeout(existing);

    if (isTyping) {
      const timer = setTimeout(() => {
        clearTyping(io, user.id, user.name, sessionId);
      }, TYPING_TIMEOUT_MS);
      typingTimers.set(key, timer);
    } else {
      typingTimers.delete(key);
    }

    socket.to(`session_${sessionId}`).emit('userTyping', {
      userId: user.id,
      name: user.name,
      isTyping,
    });
  });

  // Explicit session end (creator ends the session for everyone)
  socket.on('endSession', async ({ sessionId }: { sessionId: string }) => {
    if (!sessionId) return;

    try {
      const session = await prisma.studySession.findUnique({ where: { id: sessionId } });
      if (!session) return;

      // Only the creator can end the session
      if (session.creatorId !== user.id) {
        return socket.emit('sessionError', { message: 'Only the session creator can end the session' });
      }

      await prisma.studySession.update({
        where: { id: sessionId },
        data: { status: 'completed' },
      });

      const active = activeSessions.get(sessionId);
      if (active) {
        active.participants.clear();
        activeSessions.delete(sessionId);
      }
      sessionMessages.delete(sessionId); // Clear messages from memory!

      io.to(`session_${sessionId}`).emit('sessionEnded', {
        sessionId,
        endedBy: user.name,
      });

      console.log(`🏁 Session ${sessionId} ended by ${user.name}`);
    } catch (err) {
      console.error('endSession error:', err);
    }
  });
}

// =============================================================================
// CHAT HANDLERS
// =============================================================================
function registerChatHandlers(io: Server, socket: Socket, user: UserPayload) {

  socket.on('sendChatMessage', async ({ sessionId, text }: { sessionId: string; text: string }) => {
    if (!text?.trim() || !sessionId) return;

    // FIX: Enforce message length limit
    if (text.trim().length > MAX_MESSAGE_LENGTH) {
      return socket.emit('chatError', { msg: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` });
    }

    // FIX: Per-socket rate limiting
    if (isRateLimited(socket.id)) {
      return socket.emit('chatError', { msg: 'You are sending messages too quickly' });
    }

    try {
      const verification = await getParticipantStatus(sessionId, user.id);
      if (!verification.ok) {
        return socket.emit('chatError', { msg: 'Not authorized to send messages' });
      }
      if (verification.status !== 'in_progress') {
        return socket.emit('chatError', { msg: 'Chat is only available while the session is live' });
      }

      // Use in-memory storage for messages
      if (!sessionMessages.has(sessionId)) {
        sessionMessages.set(sessionId, []);
      }
      const chatHistory = sessionMessages.get(sessionId)!;
      
      const message = {
        id: Math.random().toString(36).substring(7),
        sessionId,
        userId: user.id,
        name: user.name,
        text: text.trim(),
        ts: new Date().toISOString()
      };
      
      chatHistory.push(message);
      
      // Optional: keep memory footprint small
      if (chatHistory.length > MAX_MESSAGES_PER_SESSION) {
        chatHistory.shift();
      }

      // Stop any active typing indicator for this user when they send
      const key = `${user.id}:${sessionId}`;
      const existing = typingTimers.get(key);
      if (existing) {
        clearTimeout(existing);
        typingTimers.delete(key);
        socket.to(`session_${sessionId}`).emit('userTyping', {
          userId: user.id,
          name: user.name,
          isTyping: false,
        });
      }

      io.to(`session_${sessionId}`).emit('newChatMessage', message);
    } catch (error) {
      console.error('sendChatMessage error:', error);
      socket.emit('chatError', { msg: 'Failed to send message' });
    }
  });

  // FIX: getSessionMessages is now for pagination only (older messages on scroll),
  // NOT for initial load — joinSession already delivers the initial history.
  // Client should pass a `before` cursor (message ID or timestamp) to paginate backwards.
  socket.on('getSessionMessages', async ({ sessionId, before }: { sessionId: string; before?: string }) => {
    if (!sessionId) return;

    try {
      const verification = await getParticipantStatus(sessionId, user.id);
      if (!verification.ok) return;

      const chatHistory = sessionMessages.get(sessionId) || [];
      // If we implement pagination, we'd slice here. For now, just send all.
      socket.emit('sessionMessages', {
        sessionId,
        messages: chatHistory,
        pagination: { before, hasMore: false },
      });
    } catch (error) {
      console.error('getSessionMessages error:', error);
    }
  });
}

// =============================================================================
// DISCONNECT CLEANUP
// =============================================================================
async function handleDisconnect(io: Server, socket: Socket, user: UserPayload) {
  console.log(`❌ Disconnected: ${user.name} (socket=${socket.id})`);

  // Clean up rate limit state for this socket
  chatRateLimits.delete(socket.id);

  for (const [sessionId, active] of activeSessions.entries()) {
    if (active.participants.has(user.id)) {
      active.participants.delete(user.id);

      // Clear any lingering typing indicator
      clearTyping(io, user.id, user.name, sessionId);

      io.to(`session_${sessionId}`).emit('userLeftSession', {
        sessionId,
        userId: user.id,
        name: user.name,
        participantCount: active.participants.size,
        reason: 'disconnected',
      });

      // FIX: Complete session in DB if no one is left
      await maybeCompleteSession(io, sessionId);
    }
  }
}