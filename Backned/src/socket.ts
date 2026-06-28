import { Server, Socket } from 'socket.io';
import prisma from './lib/prisma.js';
import { verifySocketTokenAsync } from './middleware/authmiddleware.js';
import { sendPushToUser } from './utils/pushService.js';
import { cacheDel, chatMessagePush, chatMessageGetAll, chatMessagesDel } from './lib/redis.js';

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

// --- Auto-end empty sessions timeout ---
const sessionCleanupTimers = new Map<string, NodeJS.Timeout>();

// --- In-memory chat storage (L1 write-through cache) ---
// Redis is L2. In-memory gives zero-latency reads within the same server
// process lifetime. Redis survives restarts and provides fast rehydration
// without hitting Postgres on every browser refresh.
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
const MAX_MESSAGE_LENGTH = 15_000_000;       // characters
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

// --- Helper: Schedule auto-end for empty sessions ---
function scheduleSessionCleanup(io: Server, sessionId: string) {
  if (sessionCleanupTimers.has(sessionId)) return;

  const timer = setTimeout(async () => {
    try {
      const active = activeSessions.get(sessionId);
      if (!active || active.participants.size === 0) {
        console.log(`🧹 Auto-ending empty session ${sessionId} after 2 minutes of inactivity.`);

        const [, deleted] = await Promise.all([
          prisma.studySession.updateMany({
            where: { id: sessionId, status: 'in_progress' },
            data: { status: 'completed' },
          }),
          prisma.message.deleteMany({
            where: { sessionId },
          }),
        ]);

        await cacheDel(`session:${sessionId}`);

        if (active) activeSessions.delete(sessionId);
        sessionMessages.delete(sessionId);
        await chatMessagesDel(sessionId);

        const session = await prisma.studySession.findUnique({
          where: { id: sessionId },
          include: { participants: true },
        });

        if (session) {
          const notifyUsers = [session.creatorId, ...session.participants.map((p) => p.userId)];
          notifyUsers.forEach((uid) => {
            io.to(String(uid)).emit('sessionEnded', {
              sessionId,
              endedBy: 'System (Auto-cleanup)',
            });
          });
        }
      }
    } catch (err) {
      console.error('Error during auto-cleanup of session:', err);
    } finally {
      sessionCleanupTimers.delete(sessionId);
    }
  }, 120_000); // 2 minutes

  sessionCleanupTimers.set(sessionId, timer);
}

// --- Helper: Cancel auto-end ---
function cancelSessionCleanup(sessionId: string) {
  const timer = sessionCleanupTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    sessionCleanupTimers.delete(sessionId);
    console.log(`🛑 Cancelled auto-cleanup for session ${sessionId} (participant rejoined)`);
  }
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
      registerCallHandlers(io, socket, user);

      // 4. Signal client that all handlers are registered — client should join AFTER this
      // This prevents the race condition where 'joinSession' arrives before handlers are set up
      socket.emit('serverReady', { userId: user.id });

      // 5. Cleanup on disconnect
      socket.on('disconnecting', () => {
        for (const room of socket.rooms) {
          if (room.startsWith('call_room_')) {
            socket.to(room).emit('room:peer-left', { userId: user.id });
          }
        }
      });

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
              scheduleSessionCleanup(io, sessionId);
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

      await cacheDel(`session:${sessionId}`);

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
        // 🔔 User is offline — deliver via Web Push
        sendPushToUser(toUserId, {
          title: '📚 Study Invite from ' + user.name,
          body:  `${user.name} invited you to study: ${session.subject}`,
          url:   '/sessions',
        }).catch((err) => console.error('push sendInvite error:', err));
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
        include: {
          creator: { select: { id: true, name: true, email: true } },
          participants: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        },
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
        include: {
          creator: { select: { id: true, name: true, email: true } },
          participants: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        },
      });

      await cacheDel(`session:${sessionId}`);

            // Notify ALL participants to refresh / show "Join" button
      updatedSession.participants.forEach((p) => {
        io.to(p.userId).emit('sessionScheduled', {
          sessionId,
          roomId: sessionRoom,
          sessionDetails: updatedSession,
          message: 'Session is live! You can join now.',
        });
        // 🔔 Push notify each accepted participant (covers closed tabs)
        if (p.status === 'accepted') {
          sendPushToUser(p.userId, {
            title: '▶️ Study Session is Live!',
            body:  `${updatedSession.subject} just started. Tap to join!`,
            url:   '/sessions',
          }).catch((err) => console.error('push sessionLive error:', err));
        }
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
        include: {
          participants: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        },
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

      await cacheDel(`session:${sessionId}`);

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
          include: {
            creator: { select: { id: true, name: true, email: true } },
            participants: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
          },
        });
        const active = activeSessions.get(sessionId);
        const activeUserIds = active ? [...active.participants] : [user.id];
        socket.emit('sessionJoined', {
          sessionId,
          roomId: sessionRoom,
          sessionDetails: sessionData,
          participantCount: active?.participants.size ?? 1,
          activeUserIds,
        });
        // Also emit activeParticipants so the frontend resolves loadingPresence immediately
        socket.emit('activeParticipants', { sessionId, userIds: activeUserIds });
      // --- Send chat history (tiered: L1 in-memory → L2 Redis → DB) ---
      let cachedMessages = sessionMessages.get(sessionId);
      if (!cachedMessages || cachedMessages.length === 0) {
        // L2: try Redis first (fast, survives restarts)
        const redisMessages = await chatMessageGetAll(sessionId);
        if (redisMessages.length > 0) {
          cachedMessages = redisMessages;
          sessionMessages.set(sessionId, cachedMessages); // warm L1
          console.log(`📦 Redis: served ${redisMessages.length} messages for session ${sessionId}`);
        } else {
          // L3: fall back to Postgres
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
            ciphertext: m.ciphertext ?? undefined,
            iv: m.iv ?? undefined,
            encryptedKeys: m.encryptedKeys ? JSON.parse(m.encryptedKeys) : undefined,
          }));
          if (cachedMessages.length > 0) {
            sessionMessages.set(sessionId, cachedMessages); // warm L1
            // Populate Redis so next rehydration skips Postgres
            for (const msg of cachedMessages) {
              chatMessagePush(sessionId, msg);
            }
            console.log(`🗄️  DB: loaded ${cachedMessages.length} messages for session ${sessionId}, written to Redis`);
          }
        }
      }
      socket.emit('sessionMessages', { sessionId, messages: cachedMessages ?? [] });
      return;
      }

      socket.join(sessionRoom);

      let sessionData = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          participants: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        },
      });

      if (sessionData?.status === 'scheduled') {
        sessionData = await prisma.studySession.update({
          where: { id: sessionId },
          data: { status: 'in_progress', actualStartTime: new Date() },
          include: {
            creator: { select: { id: true, name: true, email: true } },
            participants: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
          },
        });
        await cacheDel(`session:${sessionId}`);
        // Notify all participants so their dashboards show the live banner
        const notifyUsers = [sessionData.creatorId, ...sessionData.participants.map((p) => p.userId)];
        notifyUsers.forEach((uid) => {
          io.to(String(uid)).emit('sessionStarted', { sessionId, sessionDetails: sessionData });
        });
      }

      // Track in-memory presence
      if (!activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, { participants: new Set(), sessionId });
      }
      const active = activeSessions.get(sessionId)!;
      active.participants.add(user.id);
      cancelSessionCleanup(sessionId);

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
        activeUserIds: [...active.participants],
      });

      // --- Send chat history (tiered: L1 in-memory → L2 Redis → DB) ---
      let cachedMessages = sessionMessages.get(sessionId);
      if (!cachedMessages || cachedMessages.length === 0) {
        // L2: try Redis (fast, no DB round-trip)
        const redisMessages = await chatMessageGetAll(sessionId);
        if (redisMessages.length > 0) {
          cachedMessages = redisMessages;
          sessionMessages.set(sessionId, cachedMessages); // warm L1
          console.log(`📦 Redis: served ${redisMessages.length} messages for session ${sessionId}`);
        } else {
          // L3: fall back to Postgres
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
            ciphertext: m.ciphertext ?? undefined,
            iv: m.iv ?? undefined,
            encryptedKeys: m.encryptedKeys ? JSON.parse(m.encryptedKeys) : undefined,
          }));
          if (cachedMessages.length > 0) {
            sessionMessages.set(sessionId, cachedMessages); // warm L1
            // Populate Redis so next refresh skips Postgres entirely
            for (const msg of cachedMessages) chatMessagePush(sessionId, msg);
            console.log(`🗄️  DB: loaded ${cachedMessages.length} messages, written to Redis`);
          }
        }
      }
      socket.emit('sessionMessages', { sessionId, messages: cachedMessages ?? [] });

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

      if (active.participants.size === 0) {
        scheduleSessionCleanup(io, sessionId);
      }
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
      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: {
          participants: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        },
      });
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

      await cacheDel(`session:${sessionId}`);

      // Clear ALL caches: in-memory (L1), Redis (L2), and presence state
      const active = activeSessions.get(sessionId);
      if (active) {
        active.participants.clear();
        activeSessions.delete(sessionId);
      }
      sessionMessages.delete(sessionId);       // L1
      await chatMessagesDel(sessionId);        // L2 Redis — frees space on the 30MB free tier

      // Notify all participants so their dashboards or other pages update immediately
      const notifyUsers = [session.creatorId, ...session.participants.map((p) => p.userId)];
      notifyUsers.forEach((uid) => {
        io.to(String(uid)).emit('sessionEnded', {
          sessionId,
          endedBy: user.name,
        });
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
        include: {
          creator: { select: { id: true, name: true, email: true } },
          participants: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        },
      });

      await cacheDel(`session:${sessionId}`);

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

      // Add to in-memory cache immediately (L1)
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

      // ── Persist to Redis (L2) and DB in the background — fire and forget ──
      // Redis: appends to the list so future rehydrations skip Postgres
      chatMessagePush(sessionId, message);

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

      // Load from cache (tiered: L1 → L2 Redis → DB)
      let chatHistory = sessionMessages.get(sessionId);
      if (!chatHistory || chatHistory.length === 0) {
        const redisMessages = await chatMessageGetAll(sessionId);
        if (redisMessages.length > 0) {
          chatHistory = redisMessages;
          sessionMessages.set(sessionId, chatHistory);
        } else {
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
            ciphertext: m.ciphertext ?? undefined,
            iv: m.iv ?? undefined,
            encryptedKeys: m.encryptedKeys ? JSON.parse(m.encryptedKeys) : undefined,
          }));
          if (chatHistory.length > 0) {
            sessionMessages.set(sessionId, chatHistory);
            for (const msg of chatHistory) chatMessagePush(sessionId, msg);
          }
        }
      }
      socket.emit('sessionMessages', { sessionId, messages: chatHistory ?? [] });
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
  socket.on('e2ee:announce', ({ sessionId, publicKey, deviceId }: { sessionId: string; publicKey: string; deviceId: string }) => {
    if (!sessionId || !publicKey || !deviceId) return;
    socket.to(`session_${sessionId}`).emit('e2ee:memberJoined', {
      userId: user.id,
      publicKey,
      sessionId,
      deviceId,
    });
  });

  /**
   * An existing member sends a wrapped room key to a specific new joiner's device.
   * Server relays directly to the target user's personal socket room (user.id).
   * The server never decrypts the encryptedRoomKey blob.
   */
  socket.on('e2ee:keyPackage', ({ sessionId, toUserId, toDeviceId, encryptedRoomKey }: {
    sessionId: string;
    toUserId: string;
    toDeviceId: string;
    encryptedRoomKey: string;
  }) => {
    if (!toUserId || !toDeviceId || !encryptedRoomKey) return;
    io.to(toUserId).emit('e2ee:keyPackage', {
      fromUserId: user.id,
      toDeviceId,
      encryptedRoomKey,
    });
  });
}

// =============================================================================
// VIDEO CALL HANDLERS
// =============================================================================
function registerCallHandlers(io: Server, socket: Socket, user: UserPayload) {
  /**
   * Initiate a 1:1 call to another user
   * JSDoc: We do NOT encrypt WebRTC signaling (offer/answer/ICE).
   * These contain no sensitive content and the media stream is already
   * protected by WebRTC's built-in DTLS-SRTP encryption.
   */
  socket.on('call:initiate', ({ to, offer }: { to: string; offer: any }) => {
    if (!to || !offer) return;
    io.to(to).emit('call:incoming', {
      from: user.id,
      callerName: user.name,
      offer
    });
  });

  /**
   * Answer a 1:1 call
   * JSDoc: Signaling is not encrypted since WebRTC uses DTLS-SRTP for media protection.
   */
  socket.on('call:answer', ({ to, answer }: { to: string; answer: any }) => {
    if (!to || !answer) return;
    io.to(to).emit('call:answered', { answer });
  });

  /**
   * Reject a 1:1 call
   */
  socket.on('call:reject', ({ to }: { to: string }) => {
    if (!to) return;
    io.to(to).emit('call:rejected');
  });

  /**
   * End a 1:1 call
   */
  socket.on('call:end', ({ to }: { to: string }) => {
    if (!to) return;
    io.to(to).emit('call:ended');
  });

  /**
   * Notify caller that the user is busy
   */
  socket.on('call:busy', ({ to }: { to: string }) => {
    if (!to) return;
    io.to(to).emit('call:busy');
  });

  /**
   * Relay ICE candidates between 1:1 call peers
   */
  socket.on('ice:candidate', ({ to, candidate }: { to: string; candidate: any }) => {
    if (!to || !candidate) return;
    io.to(to).emit('ice:candidate', {
      from: user.id,
      candidate
    });
  });

  /**
   * Join a room-based mesh group call
   */
  socket.on('room:join-call', async ({ roomId, sessionId }: { roomId: string; sessionId?: string }) => {
    if (!roomId) return;
    const callRoomName = `call_room_${roomId}`;

    console.log(`📞 [room:join-call] user=${user.name} (${user.id}) roomId=${roomId} sessionId=${sessionId}`);

    // Fetch all current sockets in that room
    const sockets = await io.in(callRoomName).fetchSockets();
    const otherPeerIds = sockets
      .map((s: any) => s.user?.id)
      .filter((id: string) => id && id !== user.id);

    console.log(`📞 [room:join-call] existing peers in call room: [${otherPeerIds.join(', ')}]`);

    const isFirstToJoin = otherPeerIds.length === 0;

    // Send the list of existing peers in the call to the new participant
    socket.emit('room:existing-peers', { peers: otherPeerIds });

    // Join the call room
    socket.join(callRoomName);

    // Announce to existing peers in the room that this user joined
    socket.to(callRoomName).emit('room:peer-joined', { userId: user.id });

    // If this is the first person to start the call, notify ALL session participants
    // so they get an invitation to join the group video call
    if (isFirstToJoin && sessionId) {
      try {
        const session = await prisma.studySession.findUnique({
          where: { id: sessionId },
          include: { participants: true },
        });

        if (session) {
          const targetUserIds = new Set<string>();
          if (session.creatorId && session.creatorId !== user.id) {
            targetUserIds.add(session.creatorId);
          }
          for (const p of session.participants) {
            const pStatus = p.status as string;
            if (p.userId !== user.id && (pStatus === 'accepted' || pStatus === 'joined')) {
              targetUserIds.add(p.userId);
            }
          }

          console.log(`📢 [room:call-started] broadcasting to target users: [${Array.from(targetUserIds).join(', ')}]`);

          for (const targetId of targetUserIds) {
            io.to(targetId).emit('room:call-started', {
              startedBy: user.id,
              starterName: user.name,
              roomId,
              sessionId,
            });
          }
        } else {
          console.warn(`⚠️ [room:join-call] session ${sessionId} not found in database`);
        }
      } catch (err) {
        console.error(`❌ [room:join-call] error fetching session/participants:`, err);
      }
    } else if (!sessionId) {
      console.warn(`⚠️ [room:join-call] sessionId missing — cannot broadcast call invite`);
    } else {
      console.log(`ℹ️ [room:join-call] not first to join — skipping broadcast`);
    }
  });

  /**
   * Relay mesh SDP offer from one peer to another
   */
  socket.on('room:relay-offer', ({ to, offer }: { to: string; offer: any }) => {
    if (!to || !offer) return;
    io.to(to).emit('room:offer', {
      from: user.id,
      offer
    });
  });

  /**
   * Relay mesh SDP answer from one peer to another
   */
  socket.on('room:relay-answer', ({ to, answer }: { to: string; answer: any }) => {
    if (!to || !answer) return;
    io.to(to).emit('room:answer', {
      from: user.id,
      answer
    });
  });

  /**
   * User leaves the group call
   */
  socket.on('room:peer-left', ({ roomId }: { roomId: string }) => {
    if (!roomId) return;
    const callRoomName = `call_room_${roomId}`;
    socket.leave(callRoomName);
    socket.to(callRoomName).emit('room:peer-left', { userId: user.id });
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