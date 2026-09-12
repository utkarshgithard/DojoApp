import { randomUUID } from 'crypto';
import prisma from '../lib/prisma.js';
import { cacheDel } from '../lib/redis.js';
import supabase from '../lib/supabase.js';

/**
 * Legacy bug: the settings page used to save cropped profile photos as
 * base64 data URLs (1-4 MB of text) straight into the users.avatarUrl
 * column. That bloated every API payload containing avatars and filled
 * client localStorage quotas, crashing pages client-side.
 *
 * These helpers detect data-URL avatars and migrate them to Supabase
 * storage on first read, so the database only ever holds short https URLs.
 */

const DATA_URL_RE = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;
const MAX_HEAL_SIZE = 5 * 1024 * 1024; // 5 MB sanity cap

export function isBase64DataUrl(value: string | null | undefined): boolean {
  return !!value && DATA_URL_RE.test(value);
}

/** Upload a base64 data URL to Supabase storage. Returns public URL or null on failure. */
async function uploadDataUrlToStorage(userId: string, dataUrl: string): Promise<string | null> {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) return null;

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.byteLength === 0) return null;

  // Oversized payloads are not worth migrating — drop them.
  if (buffer.byteLength > MAX_HEAL_SIZE) return null;

  const ext = (mimeType.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
  const storagePath = `${userId}/avatars/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from('user-avatars')
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

  if (error) {
    console.error('[avatarHeal] Supabase upload failed:', error.message);
    return null;
  }

  const { data } = supabase.storage.from('user-avatars').getPublicUrl(storagePath);
  return data.publicUrl || null;
}

// In-flight dedup so concurrent reads don't race to heal the same user twice.
const healing = new Set<string>();

/**
 * If the user's avatar is a legacy base64 data URL, migrate it to Supabase
 * storage, persist the https URL, and invalidate the profile cache.
 * Returns the (possibly healed) avatar URL; returns the original value
 * untouched when it's not a data URL or when the upload fails.
 */
export async function healBase64Avatar(user: { id: string; avatarUrl: string | null }): Promise<string | null> {
  const { id: userId, avatarUrl } = user;
  if (!avatarUrl || !isBase64DataUrl(avatarUrl)) return avatarUrl;
  if (healing.has(userId)) return avatarUrl; // another request is already healing

  healing.add(userId);
  try {
    const publicUrl = await uploadDataUrlToStorage(userId, avatarUrl);
    if (!publicUrl) return avatarUrl; // transient failure — retry on next read

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: publicUrl },
    });
    await cacheDel(`profile:${userId}`).catch(() => {});

    console.log(`[avatarHeal] Migrated legacy base64 avatar for user ${userId}`);
    return publicUrl;
  } catch (err) {
    console.error('[avatarHeal] Unexpected error:', err);
    return avatarUrl;
  } finally {
    healing.delete(userId);
  }
}

/**
 * Upload an incoming base64 data URL (e.g. from an old client still sending
 * data URLs to PUT /auth/profile) and return the storage URL to persist.
 * Returns null when the upload fails so callers never persist data URLs.
 */
export async function convertDataUrlAvatar(userId: string, dataUrl: string): Promise<string | null> {
  if (!isBase64DataUrl(dataUrl)) return dataUrl;
  try {
    return await uploadDataUrlToStorage(userId, dataUrl);
  } catch (err) {
    console.error('[avatarHeal] convertDataUrlAvatar failed:', err);
    return null;
  }
}
