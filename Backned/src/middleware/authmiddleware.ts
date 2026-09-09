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
    role: string;
  };
}

// Shared resolver used by both middleware. Caches the Firebase token verify
// AND the user row lookup (two round-trips per request otherwise).
// User data is cached for at most 15 minutes, bounded by the token lifetime.
const resolveUserFromToken = async (
  req: AuthenticatedRequest,
  token: string,
  opts: { required?: boolean } = {}
): Promise<{ ok: boolean; error?: string; status?: number }> => {
  const { required = false } = opts;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const tokenCacheKey = `token:${tokenHash}`;
  const userCacheKey = `token:user:${tokenHash}`;

  let decodedToken: any;
  try {
    const cached = await cacheGet(tokenCacheKey);
    if (cached) {
      decodedToken = JSON.parse(cached);
    } else {
      decodedToken = await admin.auth().verifyIdToken(token);
      const remainingTime = decodedToken.exp - Math.floor(Date.now() / 1000);
      if (remainingTime > 0) {
        // Cache for at most 15 minutes (900 seconds)
        await cacheSet(tokenCacheKey, JSON.stringify(decodedToken), Math.min(remainingTime, 900));
      }
    }
  } catch (err: any) {
    const isExpired = err?.code === 'auth/id-token-expired' || err?.errorInfo?.code === 'auth/id-token-expired';
    if (isExpired) {
      console.log(`ℹ️ Auth token expired: ${err.message || 'Firebase ID token has expired.'} (Axios client will automatically refresh and retry)`);
    } else {
      console.error('Token verification error:', err);
    }
    return { ok: false, error: 'Invalid or expired token', status: 401 };
  }

  req.userId = decodedToken.uid;

  try {
    const cachedUser = await cacheGet(userCacheKey);
    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
    } else {
      const user = await prisma.user.findUnique({
        where: { id: decodedToken.uid },
        select: {
          id: true,
          name: true,
          email: true,
          verified: true,
          friendCode: true,
          createdAt: true,
          role: true,
        },
      });

      if (user) {
        req.user = user;
        await cacheSet(userCacheKey, JSON.stringify(user), 900);
      }
    }
  } catch (err: any) {
    if (required) {
      console.error('Database query error in verifyToken:', err);
      return { ok: false, error: 'Database query failure. Please try again later.', status: 500 };
    }
    // Optional middleware: userId is already set — continue without req.user.
  }

  return { ok: true };
};

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
  const result = await resolveUserFromToken(req, token, { required: true });
  if (!result.ok) {
    res.status(result.status || 401).json({ error: result.error, success: false });
    return;
  }
  next();
};

export const optionalVerifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token || token === 'null' || token === 'undefined') {
    return next();
  }

  const result = await resolveUserFromToken(req, token);
  if (!result.ok) {
    // Optional token validation is bypassed on failure
    console.log('Optional token validation bypassed/failed:', result.error);
  }
  next();
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

