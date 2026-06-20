import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authmiddleware.js';
import supabase from '../lib/supabase.js';
import { randomUUID } from 'crypto';

const BUCKET = 'community-media';
const SIGNED_URL_TTL = 300; // seconds — 5 minutes to complete upload

/**
 * POST /api/community/media/sign
 * Body: { fileName: string; mimeType: string }
 * Returns a signed upload URL + the final public URL of the uploaded file.
 */
export const getSignedUploadUrl = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { fileName, mimeType } = req.body as { fileName: string; mimeType: string };

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

    // Build a unique storage path: userId/posts/<uuid>/<originalName>
    const userId = req.userId!;
    const ext = fileName.split('.').pop() ?? 'bin';
    const storagePath = `${userId}/posts/${randomUUID()}.${ext}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error('[getSignedUploadUrl] Supabase error:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
      return;
    }

    // Construct the public URL for the file once uploaded
    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    res.json({
      uploadUrl: data.signedUrl,
      token: data.token,
      path: storagePath,
      publicUrl: publicUrlData.publicUrl,
      mediaType: isImage ? 'image' : 'video',
    });
  } catch (err) {
    console.error('[getSignedUploadUrl]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
