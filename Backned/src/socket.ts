import { Server, Socket } from 'socket.io';
import prisma from './lib/prisma.js';
import { verifySocketTokenAsync } from './middleware/authmiddleware.js';
import { sendPushToUser } from './utils/pushService.js';
import { cacheDel, chatMessagePush, chatMessageGetAll, chatMessagesDel } from './lib/redis.js';

// Shared DB readiness flag â€” set to true by server.ts once DB is connected
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
  chatId: string;
}

// --- In-memory active session tracking ---
// NOTE: For multi-process / multi-server deployments, replace this Map with
// a Redis-backed store using @socket.io/redis-adapter + Redis Sets.
// e.g. SADD session:{id}:members userId  |  SCARD session:{id}:members
const activeChats = new Map<string, ActiveSession>();

// --- Auto-end empty sessions timeout ---
const chatCleanupTimers = new Map<string, NodeJS.Timeout>();

// --- In-memory chat storage (L1 write-through cache) ---
// Redis is L2. In-memory gives zero-latency reads within the same server
// process lifetime. Redis survives restarts and provides fast rehydration
// without hitting Postgres on every browser refresh.
// Key: chatId, Value: array of message objects
const chatMessages = new Map<string, any[]>();

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

// Enforces canonical ordering (sorted) for friend chatId (e.g. friend_A_B)
function canonicalizeChatId(chatId: string): string {
  if (!chatId) return chatId;
  const parts = chatId.split('_');
  if (parts.length === 3 && parts[0] === 'friend') {
    const sorted = [parts[1], parts[2]].sort();
    return `friend_${sorted[0]}_${sorted[1]}`;
  }
  return chatId;
}

async function areFriends(chatId: string, userId: string): Promise<boolean> {
  const canonicalId = canonicalizeChatId(chatId);
  const parts = canonicalId.split('_');
  if (parts.length !== 3 || parts[0] !== 'friend') return false;
  const friendId = parts[1] === userId ? parts[2] : (parts[2] === userId ? parts[1] : null);
  if (!friendId) return false;

  const friendship = await prisma.userFriend.findFirst({
    where: { userId, friendId }
  });
  return !!friendship;
}


// --- Helper: Check if user is an accepted participant or the session creator ---
// --- Helper: Clear typing state for a user in a session ---
function clearTyping(io: Server, userId: string, userName: string, chatId: string) {
  const canonicalId = canonicalizeChatId(chatId);
  const key = `${userId}:${canonicalId}`;
  const existing = typingTimers.get(key);
  if (existing) clearTimeout(existing);
  typingTimers.delete(key);

  const parts = canonicalId.split('_');
  const otherUserId = parts.length === 3 && parts[0] === 'friend'
    ? (parts[1] === userId ? parts[2] : (parts[2] === userId ? parts[1] : null))
    : null;

  if (otherUserId) {
    io.to(otherUserId).emit('userTyping', { userId, name: userName, isTyping: false, chatId: canonicalId });
  }
  io.to(`chat_${canonicalId}`).emit('userTyping', { userId, name: userName, isTyping: false, chatId: canonicalId });
}

// --- Helper: Schedule auto-end for empty sessions ---
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
        console.warn('âš ï¸ Socket rejected: database not ready yet');
        socket.emit('error', { message: 'Server is starting up. Please try again in a few seconds.' });
        return socket.disconnect(true);
      }

      // 1. Authenticate via Firebase token
      const token = (socket.handshake.auth?.token || socket.handshake.query?.token) as string | undefined;
      const userId = await verifySocketTokenAsync(token);

      if (!userId) {
        console.log('âŒ Socket rejected: invalid token');
        return socket.disconnect(true);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });

      if (!user) {
        console.log('Socket rejected: user not found');
        return socket.disconnect(true);
      }

      // Join personal notification room
      (socket as any).user = user;
      socket.join(user.id);
      console.log(` Connected: ${user.name} (${user.id}) socket=${socket.id}`);

      // Track global online status using native Socket.io rooms
      // The socket just joined `user.id`. Let's check how many sockets are in this room.
      const userSockets = io.sockets.adapter.rooms.get(user.id);
      if (userSockets && userSockets.size === 1) {
        // User just came online globally (this is their only socket)
        prisma.userFriend.findMany({ where: { userId: user.id } }).then((friends) => {
          for (const friend of friends) {
            socket.to(friend.friendId).emit('globalUserOnline', { userId: user.id });
          }
        }).catch(err => console.error("Error broadcasting online status", err));
      }

      // Send initial online friends to this user
      prisma.userFriend.findMany({ where: { userId: user.id } }).then((friends) => {
        const onlineFriends = friends
          .filter(f => (io.sockets.adapter.rooms.get(f.friendId)?.size || 0) > 0)
          .map(f => f.friendId);
        socket.emit('initialOnlineFriends', { onlineUsers: onlineFriends });
      }).catch(err => console.error("Error fetching online friends", err));

      // 1.5 Calculate unread counts
      prisma.message.groupBy({
        by: ['chatId'],
        where: {
          chatId: { startsWith: 'friend_' },
          userId: { not: user.id }, // messages sent BY others
          isRead: false,
        },
        _count: { isRead: true }
      }).then(unreadGroups => {
        const unreadCounts: Record<string, number> = {};
        unreadGroups.forEach(g => {
          unreadCounts[g.chatId] = g._count.isRead;
        });
        socket.emit('syncUnreadCounts', unreadCounts);
      }).catch(err => console.error("Error fetching unread counts", err));

      // 2. Connection state recovery (Socket.io v4+)
      // If the socket recovered from a brief disconnect, re-join any active sessions
      // 3. Register grouped handlers
      registerChatHandlers(io, socket, user);
      registerE2EEHandlers(io, socket, user);
      registerCallHandlers(io, socket, user);

      // 4. Signal client that all handlers are registered â€” client should join AFTER this
      // This prevents the race condition where 'joinSession' arrives before handlers are set up
      socket.emit('serverReady', { userId: user.id });

      // 5. Cleanup on disconnect
      socket.on('disconnecting', () => {
        for (const room of socket.rooms) {
          if (room.startsWith('call_room_')) {
            socket.to(room).emit('room:peer-left', { userId: user.id });
          }
        }

        // Global offline tracking: check if this is the last socket for this user
        const userSockets = io.sockets.adapter.rooms.get(user.id);
        if (userSockets && userSockets.size === 1 && userSockets.has(socket.id)) {
          // This is the last connection disconnecting, user is going completely offline
          prisma.userFriend.findMany({ where: { userId: user.id } }).then((friends) => {
            for (const friend of friends) {
              io.to(friend.friendId).emit('globalUserOffline', { userId: user.id });
            }
          }).catch(err => console.error("Error broadcasting offline status", err));
        }
      });

      socket.on('disconnect', () => {
        chatRateLimits.delete(socket.id);

        for (const [chatId, active] of activeChats.entries()) {
          if (active.participants.has(user.id)) {
            active.participants.delete(user.id);
            clearTyping(io, user.id, user.name, chatId);

            io.to(`chat_${chatId}`).emit('userLeftSession', {
              chatId,
              userId: user.id,
              name: user.name,
              participantCount: active.participants.size,
              reason: 'disconnected',
            });

            // DO NOT complete session on disconnect â€” a page refresh is also a disconnect.
            // Leave DB status as-is so users can rejoin.
            if (active.participants.size === 0) {

            }
          }
        }



        console.log(`ðŸ”Œ Disconnected: ${user.name} (${user.id}) socket=${socket.id}`);
      });

    } catch (err) {
      console.error('Socket connection error:', err);
      socket.disconnect(true);
    }
  });
}

// =============================================================================
// CHAT HANDLERS
// =============================================================================
function registerChatHandlers(io: Server, socket: Socket, user: UserPayload) {

  socket.on('joinFriendChat', async ({ chatId }: { chatId: string }) => {
    if (!chatId) return;
    const canonicalId = canonicalizeChatId(chatId);
    const isFriend = await areFriends(canonicalId, user.id);
    if (!isFriend) return socket.emit('joinError', { message: 'Not authorized' });

    const chatRoom = `chat_${canonicalId}`;
    socket.join(chatRoom);

    if (!activeChats.has(canonicalId)) {
      activeChats.set(canonicalId, {
        chatId: canonicalId,
        participants: new Set(),
      });
    }
    activeChats.get(canonicalId)!.participants.add(user.id);

    // Announce to other participants that this user joined
    socket.to(`chat_${canonicalId}`).emit('userJoinedSession', {
      chatId: canonicalId,
      userId: user.id,
      name: user.name,
      participantCount: activeChats.get(canonicalId)!.participants.size,
    });

    let chatHistory = chatMessages.get(canonicalId);
    if (!chatHistory || chatHistory.length === 0) {
      const redisMessages = await chatMessageGetAll(canonicalId);
      if (redisMessages.length > 0) {
        chatHistory = redisMessages;
        chatMessages.set(canonicalId, chatHistory);
      } else {
        const dbMessages = await prisma.message.findMany({
          where: { chatId: canonicalId },
          include: { user: { select: { avatarUrl: true } } },
          orderBy: { ts: 'asc' },
          take: MAX_MESSAGES_PER_SESSION,
        });
        chatHistory = dbMessages.map((m) => ({
          id: m.id,
          chatId: m.chatId,
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
          chatMessages.set(canonicalId, chatHistory);
          for (const msg of chatHistory) chatMessagePush(canonicalId, msg);
        }
      }
    }
    socket.emit('chatMessages', { chatId: canonicalId, messages: chatHistory ?? [] });
  });

  socket.on('leaveFriendChat', ({ chatId }: { chatId: string }) => {
    const canonicalId = canonicalizeChatId(chatId);
    socket.leave(`chat_${canonicalId}`);

    const active = activeChats.get(canonicalId);
    if (active && active.participants.has(user.id)) {
      active.participants.delete(user.id);
      clearTyping(io, user.id, user.name, canonicalId);

      io.to(`chat_${canonicalId}`).emit('userLeftSession', {
        chatId: canonicalId,
        userId: user.id,
        name: user.name,
        participantCount: active.participants.size,
        reason: 'left',
      });
    }
  });

  socket.on('sendChatMessage', async (payload: {
    chatId: string;
    text?: string;
    clientId?: string;
    // E2EE fields (present when client has E2EE enabled)
    ciphertext?: string;
    iv?: string;
    encryptedKeys?: Record<string, string>;
  }) => {
    const { chatId, text, clientId, ciphertext, iv, encryptedKeys } = payload;
    const canonicalId = canonicalizeChatId(chatId);

    const isE2EE = !!(ciphertext && iv && encryptedKeys);

    // Require either plaintext or a full E2EE payload
    if (!isE2EE && !text?.trim()) return;
    if (!canonicalId) return;

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
      const isFriend = await areFriends(canonicalId, user.id);
      if (!isFriend) {
        return socket.emit('chatError', { msg: 'Not authorized to send messages' });
      }

      // Build the message immediately with a temp ID so we can broadcast instantly
      const tempId = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const message: any = {
        id: tempId,
        chatId: canonicalId,
        userId: user.id,
        name: user.name,
        clientId,
        text: isE2EE ? '' : (text!.trim()),
        ts: new Date().toISOString(),
        // E2EE fields (undefined for plaintext messages)
        ...(isE2EE && { ciphertext, iv, encryptedKeys }),
      };

      // Add to in-memory cache immediately (L1)
      if (!chatMessages.has(canonicalId)) {
        chatMessages.set(canonicalId, []);
      }
      const chatHistory = chatMessages.get(canonicalId)!;
      chatHistory.push(message);
      if (chatHistory.length > MAX_MESSAGES_PER_SESSION) {
        chatHistory.shift();
      }

      // Stop any active typing indicator for this user when they send
      const key = `${user.id}:${canonicalId}`;
      const existing = typingTimers.get(key);
      if (existing) {
        clearTimeout(existing);
        typingTimers.delete(key);
        socket.to(`chat_${canonicalId}`).emit('userTyping', {
          userId: user.id,
          name: user.name,
          isTyping: false,
        });
      }

      const parts = canonicalId.split('_');
      const otherUserId = parts.length === 3 && parts[0] === 'friend'
        ? (parts[1] === user.id ? parts[2] : parts[1])
        : null;

      // ─── Broadcast instantly — no waiting for DB ───
      io.to(`chat_${canonicalId}`).emit('newChatMessage', message);
      if (otherUserId) {
        io.to(otherUserId).emit('newChatMessage', message);
      }

      // ─── Persist to Redis (L2) and DB in the background — fire and forget ───
      // Redis: appends to the list so future rehydrations skip Postgres
      chatMessagePush(canonicalId, message);

      prisma.message.create({
        data: {
          chatId: canonicalId,
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

  socket.on('deleteChatMessage', async ({ chatId, messageId }: { chatId: string; messageId: string }) => {
    if (!chatId || !messageId) return;
    const canonicalId = canonicalizeChatId(chatId);

    try {
      const msg = await prisma.message.findUnique({ where: { id: messageId } });
      if (!msg) return;
      if (msg.userId !== user.id) {
        return socket.emit('chatError', { msg: 'You can only delete your own messages.' });
      }

      await prisma.message.delete({ where: { id: messageId } });

      if (chatMessages.has(canonicalId)) {
        const history = chatMessages.get(canonicalId)!;
        const newHistory = history.filter(m => m.id !== messageId);
        chatMessages.set(canonicalId, newHistory);
      }

      const parts = canonicalId.split('_');
      const otherUserId = parts.length === 3 && parts[0] === 'friend'
        ? (parts[1] === user.id ? parts[2] : parts[1])
        : null;

      io.to(`chat_${canonicalId}`).emit('messageDeleted', { chatId: canonicalId, messageId });
      if (otherUserId) {
        io.to(otherUserId).emit('messageDeleted', { chatId: canonicalId, messageId });
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  });

  // FIX: getSessionMessages is now for pagination only (older messages on scroll),
  // NOT for initial load — joinSession already delivers the initial history.
  // Client should pass a `before` cursor (message ID or timestamp) to paginate backwards.
  socket.on('getSessionMessages', async ({ chatId, before }: { chatId: string; before?: string }) => {
    if (!chatId) return;
    const canonicalId = canonicalizeChatId(chatId);

    try {
      const isFriend = await areFriends(canonicalId, user.id);
      if (!isFriend) return;

      // Load from cache (tiered: L1 → L2 Redis → DB)
      let chatHistory = chatMessages.get(canonicalId);
      if (!chatHistory || chatHistory.length === 0) {
        const redisMessages = await chatMessageGetAll(canonicalId);
        if (redisMessages.length > 0) {
          chatHistory = redisMessages;
          chatMessages.set(canonicalId, chatHistory);
        } else {
          const dbMessages = await prisma.message.findMany({
            where: { chatId: canonicalId },
            include: { user: { select: { avatarUrl: true } } },
            orderBy: { ts: 'asc' },
            take: MAX_MESSAGES_PER_SESSION,
          });
          chatHistory = dbMessages.map((m) => ({
            id: m.id,
            chatId: m.chatId,
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
            chatMessages.set(canonicalId, chatHistory);
            for (const msg of chatHistory) chatMessagePush(canonicalId, msg);
          }
        }
      }
      socket.emit('chatMessages', { chatId: canonicalId, messages: chatHistory ?? [] });
    } catch (error) {
      console.error('getSessionMessages error:', error);
    }
  });

  socket.on('getActiveParticipants', ({ chatId }: { chatId: string }) => {
    if (!chatId) return;
    const canonicalId = canonicalizeChatId(chatId);
    const active = activeChats.get(canonicalId);
    socket.emit('activeParticipants', {
      chatId: canonicalId,
      userIds: active ? [...active.participants] : [],
    });
  });

  socket.on('markMessagesRead', async ({ chatId }: { chatId: string }) => {
    if (!chatId) return;
    const canonicalId = canonicalizeChatId(chatId);
    const parts = canonicalId.split('_');
    if (parts.length !== 3 || parts[0] !== 'friend') return;
    const otherUserId = parts[1] === user.id ? parts[2] : (parts[2] === user.id ? parts[1] : null);
    
    try {
      // Update DB
      await prisma.message.updateMany({
        where: {
          chatId: canonicalId,
          userId: { not: user.id },
          isRead: false
        },
        data: { isRead: true }
      });

      // Update in-memory cache
      if (chatMessages.has(canonicalId)) {
        const history = chatMessages.get(canonicalId)!;
        let modified = false;
        for (const msg of history) {
          if (msg.userId !== user.id && msg.status !== 'read') { // We also use status in frontend context
             msg.isRead = true;
             modified = true;
          }
        }
      }

      if (otherUserId) {
        io.to(otherUserId).emit('messagesRead', { chatId: canonicalId, userId: user.id });
      }
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  });

  socket.on('typing', ({ chatId, sessionId, isTyping }: { chatId?: string; sessionId?: string; isTyping: boolean }) => {
    const targetChatId = chatId || sessionId;
    if (!targetChatId) return;
    const canonicalId = canonicalizeChatId(targetChatId);

    const parts = canonicalId.split('_');
    const otherUserId = parts.length === 3 && parts[0] === 'friend'
      ? (parts[1] === user.id ? parts[2] : (parts[2] === user.id ? parts[1] : null))
      : null;

    const key = `${user.id}:${canonicalId}`;
    const existing = typingTimers.get(key);
    if (existing) clearTimeout(existing);

    if (isTyping) {
      if (otherUserId) {
        socket.to(otherUserId).emit('userTyping', {
          userId: user.id,
          name: user.name,
          isTyping: true,
          chatId: canonicalId,
        });
      }
      socket.to(`chat_${canonicalId}`).emit('userTyping', {
        userId: user.id,
        name: user.name,
        isTyping: true,
        chatId: canonicalId,
      });

      const timer = setTimeout(() => {
        typingTimers.delete(key);
        if (otherUserId) {
          socket.to(otherUserId).emit('userTyping', {
            userId: user.id,
            name: user.name,
            isTyping: false,
            chatId: canonicalId,
          });
        }
        socket.to(`chat_${canonicalId}`).emit('userTyping', {
          userId: user.id,
          name: user.name,
          isTyping: false,
          chatId: canonicalId,
        });
      }, TYPING_TIMEOUT_MS);
      typingTimers.set(key, timer);
    } else {
      typingTimers.delete(key);
      if (otherUserId) {
        socket.to(otherUserId).emit('userTyping', {
          userId: user.id,
          name: user.name,
          isTyping: false,
          chatId: canonicalId,
        });
      }
      socket.to(`chat_${canonicalId}`).emit('userTyping', {
        userId: user.id,
        name: user.name,
        isTyping: false,
        chatId: canonicalId,
      });
    }
  });
}

// =============================================================================
// E2EE KEY EXCHANGE HANDLERS (server is a pure relay â€” never sees key material)
// =============================================================================
function registerE2EEHandlers(io: Server, socket: Socket, user: UserPayload) {

  /**
   * A client announces their ECDH public key when joining a session.
   * Server relays to all existing members so they can distribute the room key.
   */
  socket.on('e2ee:announce', ({ chatId, publicKey, deviceId }: { chatId: string; publicKey: string; deviceId: string }) => {
    if (!chatId || !publicKey || !deviceId) return;
    const canonicalId = canonicalizeChatId(chatId);
    socket.to(`chat_${canonicalId}`).emit('e2ee:memberJoined', {
      userId: user.id,
      publicKey,
      chatId: canonicalId,
      deviceId,
    });
  });

  /**
   * An existing member sends a wrapped room key to a specific new joiner's device.
   * Server relays directly to the target user's personal socket room (user.id).
   * The server never decrypts the encryptedRoomKey blob.
   */
  socket.on('e2ee:keyPackage', ({ chatId, toUserId, toDeviceId, encryptedRoomKey }: {
    chatId: string;
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
  socket.on('room:join-call', async ({ roomId, chatId }: { roomId: string; chatId?: string }) => {
    if (!roomId) return;
    const canonicalRoomId = canonicalizeChatId(roomId);
    const canonicalChatId = chatId ? canonicalizeChatId(chatId) : undefined;
    const callRoomName = `call_room_${canonicalRoomId}`;

    console.log(`📞 [room:join-call] user=${user.name} (${user.id}) roomId=${roomId} chatId=${chatId}`);

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
    if (isFirstToJoin && canonicalChatId) {
      try {
        const parts = canonicalChatId.split('_');
        if (parts.length === 3 && parts[0] === 'friend') {
          const friendId = parts[1] === user.id ? parts[2] : parts[1];
          if (friendId) {
            io.to(friendId).emit('groupCall:invite', {
              starterName: user.name,
              roomId: callRoomName,
              chatId: canonicalChatId
            });
          }
        }
      } catch (err) {
        console.error(`❌ [room:join-call] error fetching session/participants:`, err);
      }
    } else if (!canonicalChatId) {
      console.warn(`⚠️ [room:join-call] chatId missing — cannot broadcast call invite`);
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
    const canonicalRoomId = canonicalizeChatId(roomId);
    const callRoomName = `call_room_${canonicalRoomId}`;
    socket.leave(callRoomName);
    socket.to(callRoomName).emit('room:peer-left', { userId: user.id });
  });
}

// =============================================================================
// DISCONNECT CLEANUP
// =============================================================================
async function handleDisconnect(io: Server, socket: Socket, user: UserPayload) {
  console.log(`âŒ Disconnected: ${user.name} (socket=${socket.id})`);

  // Clean up rate limit state for this socket
  chatRateLimits.delete(socket.id);

  for (const [chatId, active] of activeChats.entries()) {
    if (active.participants.has(user.id)) {
      active.participants.delete(user.id);

      // Clear any lingering typing indicator
      clearTyping(io, user.id, user.name, chatId);

      io.to(`chat_${chatId}`).emit('userLeftSession', {
        chatId,
        userId: user.id,
        name: user.name,
        participantCount: active.participants.size,
        reason: 'disconnected',
      });
    }
  }
}
