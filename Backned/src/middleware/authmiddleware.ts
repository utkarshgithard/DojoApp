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
  let decodedToken;

  try {
    decodedToken = await admin.auth().verifyIdToken(token);
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
    const decoded = await admin.auth().verifyIdToken(token.replace('Bearer ', ''));
    return decoded.uid;
  } catch {
    return null;
  }
}

