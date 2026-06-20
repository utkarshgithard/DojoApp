import admin from '../lib/firebaseAdmin.js';
import prisma from '../lib/prisma.js';
import { cacheDel } from '../lib/redis.js';

export async function checkAndSyncAvatar(user: { id: string; name: string; avatarUrl: string | null }): Promise<string | null> {
  if (user.avatarUrl) return user.avatarUrl;
  try {
    const userRecord = await admin.auth().getUser(user.id);
    if (userRecord.photoURL) {
      const avatarUrl = userRecord.photoURL;
      
      // Update DB asynchronously in background
      prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl },
      })
      .then(async () => {
        // Clear redis profile cache
        await cacheDel(`profile:${user.id}`).catch(() => {});
      })
      .catch((err) => {
        console.error(`[checkAndSyncAvatar] Failed to update user ${user.id} avatar in DB:`, err);
      });

      return avatarUrl;
    }
  } catch (err) {
    // Silent: user not found in Firebase or no photo URL
  }
  return null;
}
