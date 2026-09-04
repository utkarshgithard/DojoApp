import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authmiddleware.js';
import supabase from '../lib/supabase.js';
import { randomUUID } from 'crypto';

const SIGNED_URL_TTL = 300; // seconds — 5 minutes to complete upload

/**
 * Maps a upload purpose to a Supabase bucket name and a storage path prefix.
 * - post-media      → images/videos attached to community posts
 * - community-assets → community avatars & banners
 * - user-avatars    → user profile pictures
 * - admin-media     → images embedded in broadcast emails
 */
type UploadPurpose = 'post' | 'community-asset' | 'avatar' | 'admin-media';

const BUCKET_CONFIG: Record<UploadPurpose, { bucket: string; folder: string }> = {
  'post':             { bucket: 'post-media',        folder: 'posts' },
  'community-asset':  { bucket: 'community-assets',  folder: 'communities' },
  'avatar':           { bucket: 'user-avatars',      folder: 'avatars' },
  'admin-media':      { bucket: 'admin-media',       folder: 'broadcast' },
};

/**
 * POST /api/community/media/sign
 * Body: { fileName: string; mimeType: string; purpose?: UploadPurpose }
 * Returns a signed upload URL + the final public URL of the uploaded file.
 */
export const getSignedUploadUrl = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { fileName, mimeType, purpose } = req.body as {
      fileName: string;
      mimeType: string;
      purpose?: UploadPurpose;
    };

    if (!fileName || !mimeType) {
      res.status(400).json({ error: 'fileName and mimeType are required' });
      return;
    }

    // Determine media type
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');
    if (!isImage && !isVideo) {
      res.status(400).json({ error: 'Only image or video files are supported' });
      return;
    }

    // Resolve bucket & folder based on purpose (default: post)
    const resolvedPurpose: UploadPurpose =
      purpose && BUCKET_CONFIG[purpose] ? purpose : 'post';
    const { bucket, folder } = BUCKET_CONFIG[resolvedPurpose];

    // Build a unique storage path: userId/<folder>/<uuid>.<ext>
    const userId = req.userId!;
    const ext = fileName.split('.').pop() ?? 'bin';
    const storagePath = `${userId}/${folder}/${randomUUID()}.${ext}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error(`[getSignedUploadUrl] Supabase error (bucket: ${bucket}):`, error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
      return;
    }

    // Construct the public URL for the file once uploaded
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    res.json({
      uploadUrl: data.signedUrl,
      token: data.token,
      path: storagePath,
      publicUrl: publicUrlData.publicUrl,
      mediaType: isImage ? 'image' : 'video',
      bucket,
    });
  } catch (err) {
    console.error('[getSignedUploadUrl]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
