/**
 * compressImage.ts
 * Client-side image compression using the Canvas API.
 * Videos are returned as-is (browser cannot encode video).
 */

export interface CompressOptions {
  /** Maximum width or height in pixels (aspect ratio is preserved). Default: 1920 */
  maxDimension?: number;
  /** JPEG/WebP quality 0–1. Default: 0.82 */
  quality?: number;
  /** Output MIME type. Defaults to 'image/webp' (best compression), falls back to 'image/jpeg' */
  outputType?: 'image/webp' | 'image/jpeg' | 'image/png';
}

/**
 * Compresses an image File using an off-screen Canvas.
 * - Skips compression for videos, GIFs, and SVGs (returns original).
 * - Skips compression if the file is already small (< 100 KB).
 * - Always preserves the original aspect ratio.
 *
 * @returns A new File (or the original if compression is skipped).
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxDimension = 1920,
    quality = 0.82,
    outputType = 'image/webp',
  } = options;

  // Skip non-compressible types
  const skip =
    file.type.startsWith('video/') ||
    file.type === 'image/gif' ||
    file.type === 'image/svg+xml';

  if (skip) return file;

  // Skip very small files — no point re-encoding
  // AVIF is not reliably supported by Next.js ImageResponse/social crawlers,
  // so let the canvas normalize it even when the original is small.
  if (file.size < 100 * 1024 && file.type !== 'image/avif') return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Scale down while preserving aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // Canvas unavailable — return original
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size === 0) {
            resolve(file);
            return;
          }

          // Only keep compressed version if it's actually smaller
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }

          const ext = outputType === 'image/webp' ? 'webp' : 'jpg';
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const compressedFile = new File([blob], `${baseName}.${ext}`, {
            type: outputType,
            lastModified: Date.now(),
          });

          console.log(
            `[compressImage] ${file.name}: ${(file.size / 1024).toFixed(0)} KB → ${(compressedFile.size / 1024).toFixed(0)} KB` +
            ` (${width}×${height}, ${outputType})`
          );

          resolve(compressedFile);
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // Fallback to original on error
    };

    img.src = objectUrl;
  });
}

/**
 * Preset: Community post images (high quality, large max size)
 */
export const compressPostImage = (file: File) =>
  compressImage(file, { maxDimension: 1920, quality: 0.82 });

/**
 * Preset: Community/group avatars and banners (medium quality, smaller size)
 */
export const compressCommunityAsset = (file: File) =>
  compressImage(file, { maxDimension: 800, quality: 0.80 });

/**
 * Preset: User profile avatars (small, high quality)
 */
export const compressAvatar = (file: File) =>
  compressImage(file, { maxDimension: 400, quality: 0.85 });

/**
 * Preset: Admin broadcast email images
 */
export const compressAdminMedia = (file: File) =>
  compressImage(file, { maxDimension: 1200, quality: 0.80 });
