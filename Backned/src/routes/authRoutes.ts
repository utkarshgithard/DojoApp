import express, { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import admin from '../lib/firebaseAdmin.js';
import { verifyToken, AuthenticatedRequest } from '../middleware/authmiddleware.js';
import generate6CharCode from '../utils/generateCode.js';
import { cacheGet, cacheSet, cacheDel } from '../lib/redis.js';

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
        department: true,
        avatarUrl: true,
      },
    });

    if (user) {
      // Cache the profile details for 24 hours (86400 seconds)
      await cacheSet(cacheKey, JSON.stringify(user), 86400);
    }

    res.json({ user, success: true, message: 'User Found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user.' });
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
      // User already exists, just return success (it's a login)
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
    res.json({ friends });
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

    // Add both directions of the friendship
    await prisma.userFriend.createMany({
      data: [
        { userId, friendId: friend.id },
        { userId: friend.id, friendId: userId },
      ],
      skipDuplicates: true,
    });

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
    const { name, bio, department, avatarUrl } = req.body;
    const userId = req.userId!;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name !== undefined ? name : undefined,
        bio: bio !== undefined ? bio : undefined,
        department: department !== undefined ? department : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        verified: true,
        friendCode: true,
        bio: true,
        department: true,
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

export default userRouter;

