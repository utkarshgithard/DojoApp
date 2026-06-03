import { Server, Socket } from 'socket.io';
import prisma from './lib/prisma.js';
import { verifySocketTokenAsync } from './middleware/authmiddleware.js';

// Shared DB readiness flag — set to true by server.ts once DB is connected
let _dbReady = false;
export function setDbReady(ready: boolean) { _dbReady = ready; }

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

// --- Helper: Check if user is an accepted participant or the session creator ---
async function getParticipantStatus(sessionId: string, userId: string) {
  if (!sessionId || !userId) return { ok: false, reason: 'missing_params' };

  const session = await prisma.studySession.findUnique({
    where: { id: sessionId },
    include: { participants: true },
  });

  if (!session) return { ok: false, reason: 'not_found' };

  // The creator is always allowed, even without a participant record
  const isCreator = session.creatorId === userId;

  const participant = session.participants.find((p) => p.userId === userId);
  // Cast to string so we can safely compare even if 'joined' isn't in the Prisma enum
  const participantStatus = participant?.status as string | undefined;
  const accepted = isCreator || participantStatus === 'accepted' || participantStatus === 'joined';

  return {
    ok: accepted,
    status: session.status,
    creatorId: session.creatorId,
    isCreator,
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

// Automatic session completion on disconnect was removed to prevent chat history wiping on page refreshes.

// --- Main Setup ---

export function setupSocketHandlers(io: Server) {
  io.on('connection', async (socket: Socket) => {
    try {
      // 0. Guard: reject socket connections while DB is unavailable
      if (!_dbReady) {
        console.warn('⚠️ Socket rejected: database not ready yet');
        socket.emit('error', { message: 'Server is starting up. Please try again in a few seconds.' });
        return socket.disconnect(true);
      }

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
      registerE2EEHandlers(io, socket, user);

      // 4. Cleanup on disconnect
      socket.on('disconnect', () => {
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

            // DO NOT complete session on disconnect — a page refresh is also a disconnect.
            // Leave DB status as-is so users can rejoin.
            if (active.participants.size === 0) {
              activeSessions.delete(sessionId);
            }
          }
        }

        console.log(`🔌 Disconnected: ${user.name} (${user.id}) socket=${socket.id}`);
      });

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
        include: { participants: true, creator: true },
      });

      if (!session) {
        if (callback) callback({ ok: false, error: 'Session not found' });
        return;
      }

      const participant = session.participants.find((p) => p.userId === user.id);
      if (!participant) {
        if (callback) callback({ ok: false, error: 'You are not invited to this session' });
        return;
      }

      if (participant.status === 'accepted') {
        if (callback) callback({ ok: true, session });
        return;
      }

      if (participant.status === 'declined') {
        if (callback) callback({ ok: false, error: 'Invite already declined' });
        return;
      }

      // Reject only if the session is completed or cancelled
      if (session.status === 'completed' || session.status === 'cancelled') {
        if (callback) callback({ ok: false, error: 'This session has already ended or been cancelled' });
        return;
      }

      // FIX: Check invite TTL
      if (participant.invitedAt) {
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
        include: { participants: true, creator: true },
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

      // Broadcast update to the active session room so in-room participants see this user as accepted/joined
      io.to(sessionRoom).emit('participantAccepted', {
        sessionId,
        userId: user.id,
        status: 'accepted',
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

      // Broadcast update to the active session room so in-room participants see this user as declined
      io.to(`session_${sessionId}`).emit('participantDeclined', {
        sessionId,
        userId: user.id,
        status: 'declined',
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
        console.log(`ℹ️ ${user.name} already in room ${sessionRoom}, re-hydrating client`);
        const sessionData = await prisma.studySession.findUnique({
          where: { id: sessionId },
          include: { participants: true, creator: true },
        });
        const active = activeSessions.get(sessionId);
        socket.emit('sessionJoined', {
          sessionId,
          roomId: sessionRoom,
          sessionDetails: sessionData,
          participantCount: active?.participants.size ?? 1,
        });
        // Load from DB if in-memory cache is empty
        let cachedMessages = sessionMessages.get(sessionId);
        if (!cachedMessages || cachedMessages.length === 0) {
          const dbMessages = await prisma.message.findMany({
            where: { sessionId },
            include: { user: { select: { avatarUrl: true } } },
            orderBy: { ts: 'asc' },
            take: MAX_MESSAGES_PER_SESSION,
          });
          cachedMessages = dbMessages.map((m) => ({
            id: m.id,
            sessionId: m.sessionId,
            userId: m.userId,
            name: m.name,
            text: m.text,
            ts: m.ts.toISOString(),
            avatarUrl: m.user?.avatarUrl ?? undefined,
            // E2EE fields
            ciphertext: m.ciphertext ?? undefined,
            iv: m.iv ?? undefined,
            encryptedKeys: m.encryptedKeys ? JSON.parse(m.encryptedKeys) : undefined,
          }));
          if (cachedMessages.length > 0) {
            sessionMessages.set(sessionId, cachedMessages);
          }
        }
        socket.emit('sessionMessages', {
          sessionId,
          messages: cachedMessages,
        });
        return;
      }

      socket.join(sessionRoom);

      let sessionData = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true, creator: true },
      });

      if (sessionData?.status === 'scheduled') {
        sessionData = await prisma.studySession.update({
          where: { id: sessionId },
          data: { status: 'in_progress', actualStartTime: new Date() },
          include: { participants: true, creator: true },
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

      // Send chat history — load from DB if in-memory cache is empty (e.g. after server restart)
      let cachedMessages = sessionMessages.get(sessionId);
      if (!cachedMessages || cachedMessages.length === 0) {
        const dbMessages = await prisma.message.findMany({
          where: { sessionId },
          include: { user: { select: { avatarUrl: true } } },
          orderBy: { ts: 'asc' },
          take: MAX_MESSAGES_PER_SESSION,
        });
        cachedMessages = dbMessages.map((m) => ({
          id: m.id,
          sessionId: m.sessionId,
          userId: m.userId,
          name: m.name,
          text: m.text,
          ts: m.ts.toISOString(),
          avatarUrl: m.user?.avatarUrl ?? undefined,
          // E2EE fields
          ciphertext: m.ciphertext ?? undefined,
          iv: m.iv ?? undefined,
          encryptedKeys: m.encryptedKeys ? JSON.parse(m.encryptedKeys) : undefined,
        }));
        if (cachedMessages.length > 0) {
          sessionMessages.set(sessionId, cachedMessages);
        }
      }
      socket.emit('sessionMessages', {
        sessionId,
        messages: cachedMessages,
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

      // Run status update + message wipe in parallel for speed
      const [, deleted] = await Promise.all([
        prisma.studySession.update({
          where: { id: sessionId },
          data: { status: 'completed' },
        }),
        prisma.message.deleteMany({
          where: { sessionId },
        }),
      ]);

      // Clear in-memory caches
      const active = activeSessions.get(sessionId);
      if (active) {
        active.participants.clear();
        activeSessions.delete(sessionId);
      }
      sessionMessages.delete(sessionId);

      io.to(`session_${sessionId}`).emit('sessionEnded', {
        sessionId,
        endedBy: user.name,
      });

      console.log(`🏁 Session ${sessionId} ended by ${user.name} — ${deleted.count} message(s) permanently deleted.`);
    } catch (err) {
      console.error('endSession error:', err);
    }
  });

  // Extend session duration (creator adds extra time in multiples of 5 minutes)
  socket.on('extendSession', async ({ sessionId, extraMinutes }: { sessionId: string; extraMinutes: number }) => {
    if (!sessionId || !extraMinutes) return;

    // Validate extraMinutes is a multiple of 5
    if (extraMinutes % 5 !== 0 || extraMinutes <= 0) {
      return socket.emit('sessionError', { message: 'Extra time must be a positive multiple of 5 minutes' });
    }

    try {
      const session = await prisma.studySession.findUnique({ where: { id: sessionId } });
      if (!session) return;

      // Only the creator can extend the session
      if (session.creatorId !== user.id) {
        return socket.emit('sessionError', { message: 'Only the session creator can extend the session' });
      }

      // Update the duration in database
      const updatedSession = await prisma.studySession.update({
        where: { id: sessionId },
        data: {
          duration: session.duration + extraMinutes,
        },
        include: { participants: true, creator: true },
      });

      // Broadcast the duration extension to everyone in the session
      io.to(`session_${sessionId}`).emit('sessionExtended', {
        sessionId,
        duration: updatedSession.duration,
        extraMinutes,
        extendedBy: user.name,
      });

      console.log(`⏱️ Session ${sessionId} extended by ${extraMinutes} minutes (New duration: ${updatedSession.duration}m) by ${user.name}`);
    } catch (err) {
      console.error('extendSession error:', err);
    }
  });
}

// =============================================================================
// CHAT HANDLERS
// =============================================================================
function registerChatHandlers(io: Server, socket: Socket, user: UserPayload) {

  socket.on('sendChatMessage', async (payload: {
    sessionId: string;
    text?: string;
    // E2EE fields (present when client has E2EE enabled)
    ciphertext?: string;
    iv?: string;
    encryptedKeys?: Record<string, string>;
  }) => {
    const { sessionId, text, ciphertext, iv, encryptedKeys } = payload;

    const isE2EE = !!(ciphertext && iv && encryptedKeys);

    // Require either plaintext or a full E2EE payload
    if (!isE2EE && !text?.trim()) return;
    if (!sessionId) return;

    // FIX: Enforce message length limit
    const messageContent = isE2EE ? ciphertext : text!.trim();
    if (messageContent.length > MAX_MESSAGE_LENGTH) {
      return socket.emit('chatError', { msg: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` });
    }

    // FIX: Per-socket rate limiting
    if (isRateLimited(socket.id)) {
      return socket.emit('chatError', { msg: 'You are sending messages too quickly' });
    }

    try {
      // Fast in-memory authorization check — avoids a DB round-trip on every message
      const activeRoom = activeSessions.get(sessionId);
      if (!activeRoom || !activeRoom.participants.has(user.id)) {
        return socket.emit('chatError', { msg: 'Not authorized to send messages' });
      }

      // Build the message immediately with a temp ID so we can broadcast instantly
      const tempId = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const message: any = {
        id: tempId,
        sessionId,
        userId: user.id,
        name: user.name,
        text: isE2EE ? '' : (text!.trim()),
        ts: new Date().toISOString(),
        // E2EE fields (undefined for plaintext messages)
        ...(isE2EE && { ciphertext, iv, encryptedKeys }),
      };

      // Add to in-memory cache immediately
      if (!sessionMessages.has(sessionId)) {
        sessionMessages.set(sessionId, []);
      }
      const chatHistory = sessionMessages.get(sessionId)!;
      chatHistory.push(message);
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

      // ── Broadcast instantly — no waiting for DB ──
      io.to(`session_${sessionId}`).emit('newChatMessage', message);

      // ── Persist to DB in the background (fire and forget) ──
      prisma.message.create({
        data: {
          sessionId,
          userId: user.id,
          name: user.name,
          text: isE2EE ? '' : (text!.trim()),
          ...(isE2EE && {
            ciphertext,
            iv,
            encryptedKeys: JSON.stringify(encryptedKeys),
          }),
        },
      }).then((dbMessage) => {
        // Update the in-memory entry with the real DB id
        const idx = chatHistory.findIndex((m) => m.id === tempId);
        if (idx !== -1) chatHistory[idx].id = dbMessage.id;
      }).catch((err) => {
        console.error('Failed to persist message to DB:', err);
      });
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

      // Load from DB if in-memory cache is empty
      let chatHistory = sessionMessages.get(sessionId);
      if (!chatHistory || chatHistory.length === 0) {
        const dbMessages = await prisma.message.findMany({
          where: { sessionId },
          include: { user: { select: { avatarUrl: true } } },
          orderBy: { ts: 'asc' },
          take: MAX_MESSAGES_PER_SESSION,
        });
        chatHistory = dbMessages.map((m) => ({
          id: m.id,
          sessionId: m.sessionId,
          userId: m.userId,
          name: m.name,
          text: m.text,
          ts: m.ts.toISOString(),
          avatarUrl: m.user?.avatarUrl ?? undefined,
          // E2EE fields
          ciphertext: m.ciphertext ?? undefined,
          iv: m.iv ?? undefined,
          encryptedKeys: m.encryptedKeys ? JSON.parse(m.encryptedKeys) : undefined,
        }));
        if (chatHistory.length > 0) {
          sessionMessages.set(sessionId, chatHistory);
        }
      }
      socket.emit('sessionMessages', {
        sessionId,
        messages: chatHistory,
      });
    } catch (error) {
      console.error('getSessionMessages error:', error);
    }
  });

  // Returns the list of userIds currently active (in-room) for a session.
  // Called by the chat page on mount so it can correctly show who is Active vs Joined.
  socket.on('getActiveParticipants', ({ sessionId }: { sessionId: string }) => {
    if (!sessionId) return;
    const active = activeSessions.get(sessionId);
    socket.emit('activeParticipants', {
      sessionId,
      userIds: active ? [...active.participants] : [],
    });
  });
}

// =============================================================================
// E2EE KEY EXCHANGE HANDLERS (server is a pure relay — never sees key material)
// =============================================================================
function registerE2EEHandlers(io: Server, socket: Socket, user: UserPayload) {

  /**
   * A client announces their ECDH public key when joining a session.
   * Server relays to all existing members so they can distribute the room key.
   */
  socket.on('e2ee:announce', ({ sessionId, publicKey }: { sessionId: string; publicKey: string }) => {
    if (!sessionId || !publicKey) return;
    socket.to(`session_${sessionId}`).emit('e2ee:memberJoined', {
      userId: user.id,
      publicKey,
      sessionId,
    });
  });

  /**
   * An existing member sends a wrapped room key to a specific new joiner.
   * Server relays directly to the target user's personal socket room (user.id).
   * The server never decrypts the encryptedRoomKey blob.
   */
  socket.on('e2ee:keyPackage', ({ sessionId, toUserId, encryptedRoomKey }: {
    sessionId: string;
    toUserId: string;
    encryptedRoomKey: string;
  }) => {
    if (!toUserId || !encryptedRoomKey) return;
    io.to(toUserId).emit('e2ee:keyPackage', {
      fromUserId: user.id,
      encryptedRoomKey,
    });
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
    }
  }
}