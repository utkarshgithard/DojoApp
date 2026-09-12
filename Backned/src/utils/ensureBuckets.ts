import supabase from '../lib/supabase.js';

/**
 * Avatar/media buckets must be PUBLIC — avatarUrl points at their public URLs.
 * If a bucket is created private (Supabase's default), every avatar URL 403s
 * and users see broken images in chat, mentions, posts, etc.
 *
 * This runs once at server startup and is a no-op for already-public buckets.
 */
const REQUIRED_PUBLIC_BUCKETS = [
  'user-avatars',
  'post-media',
  'community-assets',
  'community-media',
  'admin-media',
];

export async function ensurePublicBuckets(): Promise<void> {
  if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
    console.warn('[storage] Supabase env vars missing — skipping bucket check');
    return;
  }

  for (const bucket of REQUIRED_PUBLIC_BUCKETS) {
    try {
      const { data: existing, error: getErr } = await supabase.storage.getBucket(bucket);
      if (getErr || !existing) {
        // Bucket doesn't exist — create it as public.
        const { error: createErr } = await supabase.storage.createBucket(bucket, { public: true });
        if (createErr) {
          console.warn(`[storage] Could not create bucket "${bucket}":`, createErr.message);
        } else {
          console.log(`[storage] Created public bucket "${bucket}"`);
        }
        continue;
      }

      if (!existing.public) {
        const { error: updateErr } = await supabase.storage.updateBucket(bucket, { public: true });
        if (updateErr) {
          console.warn(`[storage] Could not make bucket "${bucket}" public:`, updateErr.message);
        } else {
          console.log(`[storage] Bucket "${bucket}" was private — switched to public`);
        }
      }
    } catch (err: any) {
      console.warn(`[storage] Bucket check failed for "${bucket}":`, err?.message || err);
    }
  }
}
