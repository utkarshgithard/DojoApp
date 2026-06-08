import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import admin from '../lib/firebaseAdmin.js';
import crypto from 'crypto';
import { cacheGet, cacheSet } from '../lib/redis.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    verified: boolean;
    friendCode: string;
    createdAt: Date;
  };
}

export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized: No token' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const cacheKey = `token:${tokenHash}`;
  let decodedToken;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      decodedToken = JSON.parse(cached);
    } else {
      decodedToken = await admin.auth().verifyIdToken(token);
      const remainingTime = decodedToken.exp - Math.floor(Date.now() / 1000);
      if (remainingTime > 0) {
        // Cache for at most 15 minutes (900 seconds)
        await cacheSet(cacheKey, JSON.stringify(decodedToken), Math.min(remainingTime, 900));
      }
    }
    req.userId = decodedToken.uid;
  } catch (err: any) {
    const isExpired = err?.code === 'auth/id-token-expired' || err?.errorInfo?.code === 'auth/id-token-expired';
    if (isExpired) {
      console.log(`ℹ️ Auth token expired: ${err.message || 'Firebase ID token has expired.'} (Axios client will automatically refresh and retry)`);
    } else {
      console.error('Token verification error:', err);
    }
    res.status(401).json({ error: 'Invalid or expired token', success: false });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.uid },
      select: {
        id: true,
        name: true,
        email: true,
        verified: true,
        friendCode: true,
        createdAt: true,
      },
    });

    if (user) {
      req.user = user;
    }
    next();
  } catch (err: any) {
    console.error('Database query error in verifyToken:', err);
    res.status(500).json({ error: 'Database query failure. Please try again later.', success: false });
  }
};

export async function verifySocketTokenAsync(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const rawToken = token.replace('Bearer ', '');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const cacheKey = `token:${tokenHash}`;
    
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const decoded = JSON.parse(cached);
      return decoded.uid;
    }

    const decoded = await admin.auth().verifyIdToken(rawToken);
    const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
    if (remainingTime > 0) {
      await cacheSet(cacheKey, JSON.stringify(decoded), Math.min(remainingTime, 900));
    }
    return decoded.uid;
  } catch {
    return null;
  }
}

