import admin from '../lib/firebaseAdmin.js';
import prisma from '../lib/prisma.js';
import { cacheDel } from '../lib/redis.js';

export async function checkAndSyncAvatar(user: { id: string; name: string; avatarUrl: string | null }): Promise<string | null> {
  // Return the database avatarUrl instantly.
  // We no longer make blocking Firebase Admin SDK network requests on list reads (eliminates N+1 bottleneck).
  return user.avatarUrl;
}

