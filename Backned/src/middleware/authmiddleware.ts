import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import admin from '../lib/firebaseAdmin.js';

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

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.userId = decodedToken.uid;

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

    if (!user) {
      // In a strict setup, you might return 401 here. 
      // But during registration, the token is valid but user doesn't exist yet in Prisma.
      // So we'll attach userId and let the route handle it.
    } else {
      req.user = user;
    }
    next();
  } catch (err: any) {
    const isExpired = err?.code === 'auth/id-token-expired' || err?.errorInfo?.code === 'auth/id-token-expired';
    if (isExpired) {
      console.log(`ℹ️ Auth token expired: ${err.message || 'Firebase ID token has expired.'} (Axios client will automatically refresh and retry)`);
    } else {
      console.error('Token verification error:', err);
    }
    res.status(401).json({ error: 'Invalid or expired token', success: false });
  }
};

export async function verifySocketTokenAsync(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const decoded = await admin.auth().verifyIdToken(token.replace('Bearer ', ''));
    return decoded.uid;
  } catch {
    return null;
  }
}

