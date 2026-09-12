import express, { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import admin from '../lib/firebaseAdmin.js';
import { verifyToken, optionalVerifyToken, AuthenticatedRequest } from '../middleware/authmiddleware.js';
import generate6CharCode from '../utils/generateCode.js';
import { cacheGet, cacheSet, cacheDel } from '../lib/redis.js';
import { checkAndSyncAvatar } from '../utils/avatarSync.js';
import { isBase64DataUrl, convertDataUrlAvatar } from '../utils/avatarHeal.js';
import { calculateDailyPerformanceScore } from '../utils/performanceIndex.js';
import { createNotification } from '../utils/notificationHelper.js';
import {
  sanitizeUsername,
  usernameValidationError,
  generateUsernameFromName,
  ensureUserHasUsername,
  isUsernameAvailable,
} from '../utils/username.js';

const userRouter = express.Router();

// GET /api/auth/userDetails
userRouter.get('/userDetails', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const cacheKey = `profile:${userId}`;

    // Try reading from cache first
    const cachedProfile = await cacheGet(cacheKey);
    const forceRefresh = req.query.refresh === 'true';

    if (cachedProfile && !forceRefresh) {
      try {
        const user = JSON.parse(cachedProfile);
        // If the cached profile was created before we added the 'role' field,
        // bypass the cache and fetch fresh from the DB.
        if (user && typeof user === 'object' && 'role' in user) {
          // Legacy poisoned cache: never serve base64 data-URL avatars.
          if (isBase64DataUrl(user?.avatarUrl)) {
            await cacheDel(cacheKey).catch(() => { });
          } else {
            res.json({ user, success: true, message: 'User Found (cached)' });
            return;
          }
        }
      } catch {
        // If JSON parsing fails, clear the corrupted cache
        await cacheDel(cacheKey).catch(() => { });
      }
    }

    if (forceRefresh) {
      await cacheDel(cacheKey).catch(() => { });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        verified: true,
        friendCode: true,
        username: true,
        createdAt: true,
        bio: true,
        avatarUrl: true,
        role: true,
        college: true,
        collegeCode: true,
      },
    });

    if (user) {
      const avatarUrl = await checkAndSyncAvatar(user);
      user.avatarUrl = avatarUrl;
      // Never cache a legacy base64 data URL — it bloats the cache and client storage.
      if (isBase64DataUrl(user.avatarUrl)) {
        await cacheDel(cacheKey).catch(() => {});
      } else {
        // Cache the profile details for 24 hours (86400 seconds)
        await cacheSet(cacheKey, JSON.stringify(user), 86400);
      }
    }

    res.json({ user, success: true, message: 'User Found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// GET /api/auth/users/:id — fetch public details of another user
userRouter.get('/users/:id', optionalVerifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id as string;
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        bio: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const avatarUrl = await checkAndSyncAvatar(user);
    const userWithAvatar = {
      ...user,
      avatarUrl,
    };

    res.json({ user: userWithAvatar, success: true });
  } catch (err) {
    console.error('[getUserDetails]', err);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// Helper to process referral/invite friendship
async function establishReferralFriendship(currentUserId: string, currentUserName: string, inviteCode: string, io: any) {
  try {
    const referrer = await prisma.user.findUnique({ where: { friendCode: inviteCode } });
    if (referrer && referrer.id !== currentUserId) {
      // Create mutual friendship and follow in both directions
      await Promise.all([
        prisma.userFriend.createMany({
          data: [
            { userId: currentUserId, friendId: referrer.id },
            { userId: referrer.id, friendId: currentUserId },
          ],
          skipDuplicates: true,
        }),
        prisma.userFollow.createMany({
          data: [
            { followerId: currentUserId, followingId: referrer.id },
            { followerId: referrer.id, followingId: currentUserId },
          ],
          skipDuplicates: true,
        }),
      ]);

      // Trigger notification for the referrer
      await createNotification(
        referrer.id,
        currentUserId,
        'friendship_mutual',
        undefined,
        undefined,
        io
      );
      console.log(`🔗 Referral: Connected ${currentUserName} (${currentUserId}) and ${referrer.name} (${referrer.id}) as friends.`);
    }
  } catch (err) {
    console.error('❌ Error establishing referral friendship:', err);
  }
}

// POST /api/auth/sync
userRouter.post('/sync', async (req: Request, res: Response): Promise<void> => {
  const { name, email, inviteCode, college, collegeCode } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      // Backfill username for users created before the username feature
      if (!existing.username) {
        await ensureUserHasUsername(existing.id).catch((err) =>
          console.error('Failed to backfill username on sync:', err)
        );
      }

      // Sync avatar ONLY when the user has no avatar stored yet.
      // Never overwrite a user-uploaded Supabase avatar with the Google/Firebase
      // photo — that clobbered custom avatars on every login.
      if (!existing.avatarUrl && decodedToken.picture) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { avatarUrl: decodedToken.picture },
        });
        await cacheDel(`profile:${existing.id}`);
      }

      // Process referral if inviteCode is provided
      if (inviteCode) {
        const io = req.app.get('io');
        await establishReferralFriendship(existing.id, existing.name, inviteCode, io);
      }

      res.status(200).json({
        message: 'User synced successfully.',
        userId: existing.id
      });
      return;
    }

    // New user, generate unique friend code
    let code: string;
    do {
      code = generate6CharCode();
    } while (await prisma.user.findUnique({ where: { friendCode: code } }));

    // Fallback name if missing
    const displayName = name || decodedToken.name || email.split('@')[0];

    // Username: use the provided one if valid + free, else generate from name
    let username: string;
    const requestedUsername = sanitizeUsername(String(req.body.username ?? ''));
    if (requestedUsername && !usernameValidationError(requestedUsername) && (await isUsernameAvailable(requestedUsername))) {
      username = requestedUsername;
    } else {
      username = await generateUsernameFromName(displayName);
    }

    const user = await prisma.user.create({
      data: {
        id: uid,
        name: displayName,
        email,
        password: '', // Password is not used anymore
        verified: true, // Firebase handles verification
        friendCode: code,
        username,
        avatarUrl: decodedToken.picture || null, // Sync photo URL from Google
        college: college || null,
        collegeCode: collegeCode || null,
      },
    });

    // Process referral for new user
    if (inviteCode) {
      const io = req.app.get('io');
      await establishReferralFriendship(user.id, user.name, inviteCode, io);
    }

    res.status(201).json({
      message: 'User registered successfully.',
      userId: user.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// GET /api/auth/friends-List
userRouter.get('/friends-List', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userWithFriends = await prisma.user.findUnique({
      where: { id: req.userId! },
      include: {
        friends: {
          include: {
            friend: {
              select: { id: true, name: true, username: true, friendCode: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    const friends = userWithFriends?.friends.map((uf) => uf.friend) ?? [];
    const formattedFriends = await Promise.all(
      friends.map(async (f) => {
        const avatarUrl = await checkAndSyncAvatar(f);
        return {
          ...f,
          avatarUrl,
        };
      })
    );
    res.json({ friends: formattedFriends });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// POST /api/auth/add  — add friend by friend code OR username
userRouter.post('/add', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { friendCode, username } = req.body;
    const userId = req.userId!;

    if (!friendCode && !username) {
      res.status(400).json({ error: 'Friend code or username is required' });
      return;
    }

    // Prefer username lookup when provided; fall back to legacy friend code.
    let friend = null as Awaited<ReturnType<typeof prisma.user.findFirst>> | null;
    if (username) {
      const sanitized = sanitizeUsername(String(username));
      if (sanitized) {
        friend = await prisma.user.findUnique({ where: { username: sanitized } });
      }
    }
    if (!friend && friendCode) {
      friend = await prisma.user.findUnique({ where: { friendCode: String(friendCode) } });
    }

    if (!friend) {
      res.status(404).json({ error: 'User with this username or code not found' });
      return;
    }

    if (friend.id === userId) {
      res.status(400).json({ error: 'You cannot add yourself as a friend' });
      return;
    }

    // Add both directions of the friendship and follows to keep them in sync
    await Promise.all([
      prisma.userFriend.createMany({
        data: [
          { userId, friendId: friend.id },
          { userId: friend.id, friendId: userId },
        ],
        skipDuplicates: true,
      }),
      prisma.userFollow.createMany({
        data: [
          { followerId: userId, followingId: friend.id },
          { followerId: friend.id, followingId: userId },
        ],
        skipDuplicates: true,
      }),
    ]);

    res.json({
      success: true,
      message: `${friend.name} added as a friend`,
      friend: {
        id: friend.id,
        name: friend.name,
        username: friend.username,
        friendCode: friend.friendCode,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/add-by-id — add friend directly by user ID (used from suggestion cards)
userRouter.post('/add-by-id', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { targetUserId } = req.body;
    const userId = req.userId!;

    if (!targetUserId) {
      res.status(400).json({ error: 'targetUserId is required' });
      return;
    }

    const friend = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, username: true, friendCode: true },
    });
    if (!friend) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (friend.id === userId) {
      res.status(400).json({ error: 'You cannot add yourself as a friend' });
      return;
    }

    // Check already friends
    const existing = await prisma.userFriend.findUnique({
      where: { userId_friendId: { userId, friendId: friend.id } },
    });
    if (existing) {
      res.status(400).json({ error: 'Already friends' });
      return;
    }

    const io = req.app.get('io');

    // Create mutual friendship and follow in both directions
    await Promise.all([
      prisma.userFriend.createMany({
        data: [
          { userId, friendId: friend.id },
          { userId: friend.id, friendId: userId },
        ],
        skipDuplicates: true,
      }),
      prisma.userFollow.createMany({
        data: [
          { followerId: userId, followingId: friend.id },
          { followerId: friend.id, followingId: userId },
        ],
        skipDuplicates: true,
      }),
    ]);

    // Notify the added user
    await createNotification(friend.id, userId, 'friendship_mutual', undefined, undefined, io);

    res.json({
      success: true,
      message: `${friend.name} added as a friend`,
      friend: { id: friend.id, name: friend.name, username: friend.username, friendCode: friend.friendCode },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/profile — update user profile
userRouter.put('/profile', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, bio, avatarUrl, college, collegeCode, username } = req.body;
    const userId = req.userId!;

    // Reject/convert legacy base64 data URLs — persist a storage URL instead.
    let avatarUrlUpdate: string | null | undefined = undefined;
    if (avatarUrl !== undefined) {
      if (avatarUrl === null || avatarUrl === '') {
        avatarUrlUpdate = null;
      } else if (isBase64DataUrl(avatarUrl)) {
        const converted = await convertDataUrlAvatar(userId, avatarUrl);
        if (!converted) {
          res.status(400).json({ error: 'Profile photo is too large. Please pick a smaller image.' });
          return;
        }
        avatarUrlUpdate = converted;
      } else {
        avatarUrlUpdate = avatarUrl;
      }
    }

    // Username update: normalize + validate + ensure uniqueness
    let usernameUpdate: string | undefined = undefined;
    if (username !== undefined) {
      const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      if (username === null || username === '') {
        // Empty value: regenerate automatically from display name
        const currentName = typeof name === 'string' && name.trim() ? name.trim() : undefined;
        const userRow = currentName
          ? null
          : await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        usernameUpdate = await generateUsernameFromName(currentName || userRow?.name || 'user');
      } else {
        const sanitized = sanitizeUsername(String(username));
        if (!sanitized) {
          res.status(400).json({ error: 'Username cannot be empty.' });
          return;
        }
        const validationError = usernameValidationError(sanitized);
        if (validationError) {
          res.status(400).json({ error: validationError });
          return;
        }
        if (sanitized !== current?.username && !(await isUsernameAvailable(sanitized, userId))) {
          res.status(409).json({ error: 'That username is already taken.' });
          return;
        }
        usernameUpdate = sanitized;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name !== undefined ? name : undefined,
        bio: bio !== undefined ? bio : undefined,
        avatarUrl: avatarUrlUpdate,
        college: college !== undefined ? college : undefined,
        collegeCode: collegeCode !== undefined ? collegeCode : undefined,
        username: usernameUpdate,
      },
      select: {
        id: true,
        name: true,
        email: true,
        verified: true,
        friendCode: true,
        username: true,
        bio: true,
        avatarUrl: true,
        college: true,
        collegeCode: true,
      }
    });

    // Invalidate profile cache
    await cacheDel(`profile:${userId}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ error: 'That username is already taken.' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/auth/username-available?username=xyz — check username availability
userRouter.get('/username-available', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sanitized = sanitizeUsername(String(req.query.username ?? ''));
    if (!sanitized) {
      res.json({ available: false, error: 'Enter a username.' });
      return;
    }
    const validationError = usernameValidationError(sanitized);
    if (validationError) {
      res.json({ available: false, error: validationError });
      return;
    }
    const available = await isUsernameAvailable(sanitized, req.userId!);
    res.json({ available, username: sanitized });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check username availability' });
  }
});

// PUT /api/auth/public-key — store/update caller's ECDH public key (E2EE) for a specific device
userRouter.put('/public-key', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { publicKey, deviceId } = req.body;
    if (!publicKey || typeof publicKey !== 'string') {
      res.status(400).json({ error: 'publicKey (string) is required' });
      return;
    }
    if (!deviceId || typeof deviceId !== 'string') {
      res.status(400).json({ error: 'deviceId (string) is required' });
      return;
    }
    await prisma.userPublicKey.upsert({
      where: { userId_deviceId: { userId: req.userId!, deviceId } },
      create: { userId: req.userId!, deviceId, publicKey },
      update: { publicKey },
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to store public key' });
  }
});

// GET /api/auth/public-keys?userIds=id1,id2,... — bulk-fetch ECDH public keys (E2EE sender wrapping)
userRouter.get('/public-keys', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const raw = req.query.userIds as string;
    if (!raw) {
      res.status(400).json({ error: 'userIds query param required' });
      return;
    }
    const ids = raw.split(',').map((id) => id.trim()).filter(Boolean).slice(0, 50); // cap at 50
    const rows = await prisma.userPublicKey.findMany({ where: { userId: { in: ids } } });

    // Group public keys by userId
    const keys: Record<string, { deviceId: string; publicKey: string }[]> = {};
    for (const row of rows) {
      if (!keys[row.userId]) {
        keys[row.userId] = [];
      }
      keys[row.userId].push({
        deviceId: row.deviceId,
        publicKey: row.publicKey,
      });
    }
    res.json({ keys });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch public keys' });
  }
});

// POST /api/auth/study-time
userRouter.post('/study-time', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { date, duration } = req.body as { date?: string; duration?: number };

    if (!date || typeof duration !== 'number' || duration < 0) {
      res.status(400).json({ error: 'date and duration are required' });
      return;
    }

    const studyLog = await prisma.studyLog.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, duration },
      update: { duration: { increment: duration } },
    });

    res.json({ success: true, data: studyLog });
  } catch (error: any) {
    console.error('[Study Time] error:', error.message);
    res.status(500).json({ error: 'Failed to save study time.' });
  }
});

// GET /api/auth/performance-index — fetch past 7 days of performance index
userRouter.get('/performance-index', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const dates: string[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData: Array<{ date: string; dayName: string; rawDate: Date }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const formattedDate = `${yyyy}-${mm}-${dd}`;
      const dayName = dayNames[d.getDay()];
      dates.push(formattedDate);
      chartData.push({ date: formattedDate, dayName, rawDate: d });
    }

    const [studyLogs, attendanceRecords, posts, userSubjects] = await Promise.all([
      prisma.studyLog.findMany({ where: { userId, date: { in: dates } } }),
      prisma.attendanceRecord.findMany({ where: { userId, date: { in: dates } }, include: { entries: true } }),
      prisma.post.findMany({ where: { userId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      prisma.subject.findMany({ where: { userId } }),
    ]);

    const studyLogMap = new Map(studyLogs.map((entry: any) => [entry.date, entry.duration]));
    const attendanceMap = new Map(attendanceRecords.map((record: any) => [record.date, record.entries]));
    const postDateSet = new Set<string>();

    posts.forEach((post: any) => {
      const dateKey = new Date(post.createdAt).toISOString().split('T')[0];
      if (dateKey) {
        postDateSet.add(dateKey);
      }
    });

    const tasksDataRaw = req.query.tasksData as string | undefined;
    let parsedTasksData: Record<string, { completed: number; total: number }> = {};
    if (tasksDataRaw) {
      try {
        parsedTasksData = JSON.parse(tasksDataRaw);
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    const result = await Promise.all(chartData.map(async (dataPoint) => {
      const dateStr = dataPoint.date;
      let tasksCompleted = 0;
      let tasksTotal = 0;

      if (parsedTasksData[dateStr]) {
        tasksCompleted = parsedTasksData[dateStr].completed || 0;
        tasksTotal = parsedTasksData[dateStr].total || 0;
      }

      const dayName = dataPoint.rawDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const scheduledSubjects = userSubjects.filter((subject) => subject.days.includes(dayName));

      const attendanceEntries = attendanceMap.get(dateStr) ?? [];
      const postedToday = postDateSet.has(dateStr);
      const studyDurationSeconds = studyLogMap.get(dateStr) ?? 0;

      const breakdown = calculateDailyPerformanceScore({
        studyDurationSeconds,
        scheduledSubjects,
        attendanceEntries: attendanceEntries.map((entry: any) => ({ subject: entry.subject, status: entry.status })),
        completedTasks: tasksCompleted,
        totalTasks: tasksTotal,
        postedToday,
      });

      return {
        date: dateStr,
        dayName: dataPoint.dayName,
        score: breakdown.score,
        tasksCompleted: breakdown.tasksCompleted,
        tasksTotal: breakdown.tasksTotal,
        studyHours: breakdown.studyHours,
        studyPoints: breakdown.studyPoints,
        lectureScore: breakdown.lectureScore,
        taskPoints: breakdown.taskPoints,
        communityPoints: breakdown.communityPoints,
        postedToday: breakdown.postedToday,
        lectureAwarded: breakdown.lectureAwarded,
      };
    }));

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Performance Index] error:', error.message);
    res.status(500).json({ error: 'Failed to fetch performance index.' });
  }
});

export default userRouter;

