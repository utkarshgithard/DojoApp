import express, { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import admin from '../lib/firebaseAdmin.js';
import { verifyToken, optionalVerifyToken, AuthenticatedRequest } from '../middleware/authmiddleware.js';
import generate6CharCode from '../utils/generateCode.js';
import { cacheGet, cacheSet, cacheDel } from '../lib/redis.js';
import { checkAndSyncAvatar } from '../utils/avatarSync.js';
import { calculateDailyPerformanceScore } from '../utils/performanceIndex.js';

const userRouter = express.Router();

// GET /api/auth/userDetails
userRouter.get('/userDetails', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const cacheKey = `profile:${userId}`;

    // Try reading from cache first
    const cachedProfile = await cacheGet(cacheKey);
    if (cachedProfile) {
      const user = JSON.parse(cachedProfile);
      res.json({ user, success: true, message: 'User Found (cached)' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        verified: true,
        friendCode: true,
        createdAt: true,
        bio: true,
        avatarUrl: true,
      },
    });

    if (user) {
      const avatarUrl = await checkAndSyncAvatar(user);
      user.avatarUrl = avatarUrl;
      // Cache the profile details for 24 hours (86400 seconds)
      await cacheSet(cacheKey, JSON.stringify(user), 86400);
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

// POST /api/auth/sync
userRouter.post('/sync', async (req: Request, res: Response): Promise<void> => {
  const { name, email } = req.body;
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
      // If user has no avatar in DB but has a picture in Firebase, sync it
      if (!existing.avatarUrl && decodedToken.picture) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { avatarUrl: decodedToken.picture },
        });
        await cacheDel(`profile:${existing.id}`);
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

    const user = await prisma.user.create({
      data: {
        id: uid,
        name: displayName,
        email,
        password: '', // Password is not used anymore
        verified: true, // Firebase handles verification
        friendCode: code,
        avatarUrl: decodedToken.picture || null, // Sync photo URL from Google
      },
    });

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
              select: { id: true, name: true, friendCode: true, email: true, avatarUrl: true },
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

// POST /api/auth/add  — add friend by code
userRouter.post('/add', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { friendCode } = req.body;
    const userId = req.userId!;

    if (!friendCode) {
      res.status(400).json({ error: 'Friend code is required' });
      return;
    }

    const friend = await prisma.user.findUnique({ where: { friendCode } });
    if (!friend) {
      res.status(404).json({ error: 'User with this code not found' });
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
        friendCode: friend.friendCode,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/profile — update user profile
userRouter.put('/profile', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, bio, avatarUrl } = req.body;
    const userId = req.userId!;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name !== undefined ? name : undefined,
        bio: bio !== undefined ? bio : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        verified: true,
        friendCode: true,
        bio: true,
        avatarUrl: true,
      }
    });

    // Invalidate profile cache
    await cacheDel(`profile:${userId}`);

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/auth/public-key — store/update caller's ECDH public key (E2EE)
userRouter.put('/public-key', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { publicKey } = req.body;
    if (!publicKey || typeof publicKey !== 'string') {
      res.status(400).json({ error: 'publicKey (string) is required' });
      return;
    }
    await prisma.userPublicKey.upsert({
      where: { userId: req.userId! },
      create: { userId: req.userId!, publicKey },
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
    const keys: Record<string, string> = {};
    for (const row of rows) keys[row.userId] = row.publicKey;
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

    const [studyLogs, studySessions, attendanceRecords, posts, userSubjects] = await Promise.all([
      prisma.studyLog.findMany({ where: { userId, date: { in: dates } } }),
      prisma.studySession.findMany({
        where: {
          startAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          OR: [
            { creatorId: userId },
            { participants: { some: { userId, status: 'accepted' } } },
          ],
        },
      }),
      prisma.attendanceRecord.findMany({ where: { userId, date: { in: dates } }, include: { entries: true } }),
      prisma.post.findMany({ where: { userId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      prisma.subject.findMany({ where: { userId } }),
    ]);

    const studyLogMap = new Map(studyLogs.map((entry: any) => [entry.date, entry.duration]));
    const attendanceMap = new Map(attendanceRecords.map((record: any) => [record.date, record.entries]));
    const sessionMap = new Map<string, number>();
    const postDateSet = new Set<string>();

    studySessions.forEach((session: any) => {
      const dateKey = new Date(session.startAt).toISOString().split('T')[0];
      if (dateKey) {
        sessionMap.set(dateKey, (sessionMap.get(dateKey) ?? 0) + 1);
      }
    });

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
      const sessionsCount = sessionMap.get(dateStr) ?? 0;
      const postedToday = postDateSet.has(dateStr);
      const studyDurationSeconds = studyLogMap.get(dateStr) ?? 0;

      const breakdown = calculateDailyPerformanceScore({
        studyDurationSeconds,
        scheduledSubjects,
        attendanceEntries: attendanceEntries.map((entry: any) => ({ subject: entry.subject, status: entry.status })),
        completedTasks: tasksCompleted,
        totalTasks: tasksTotal,
        sessionsCount,
        postedToday,
      });

      return {
        date: dateStr,
        dayName: dataPoint.dayName,
        score: breakdown.score,
        tasksCompleted: breakdown.tasksCompleted,
        tasksTotal: breakdown.tasksTotal,
        sessionsCount: breakdown.sessionsCount,
        studyHours: breakdown.studyHours,
        studyPoints: breakdown.studyPoints,
        lectureScore: breakdown.lectureScore,
        taskPoints: breakdown.taskPoints,
        sessionPoints: breakdown.sessionPoints,
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

