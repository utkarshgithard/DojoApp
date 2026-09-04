import { ImageResponse } from 'next/og';
import { getPublicApiUrl } from '@/lib/publicPostMetadata';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Image({ params }: Props) {
  const { id } = await params;

  // Fetch post data
  let authorName = 'DojoClass User';
  let mediaUrl: string | null = null;
  let mediaDataUrl: string | null = null;
  let isVideo = false;

  try {
    const res = await fetch(`${getPublicApiUrl()}/community/posts/${id}`, {
      next: { revalidate: 60 },
    });
    console.info(`[opengraph-image] Post fetch ${res.status} for ${id}`);
    if (res.ok) {
      const data = await res.json();
      const post = data.post;
      authorName = post?.author?.name ?? authorName;
      const firstMedia = post?.media?.[0];
      if (firstMedia?.type === 'image') {
        // Use image directly
        mediaUrl = typeof firstMedia.url === 'string' ? firstMedia.url : null;
        isVideo = false;
      } else if (firstMedia?.type === 'video') {
        // Use the pre-generated first-frame thumbnail stored in DB
        mediaUrl = typeof firstMedia.thumbnailUrl === 'string' ? firstMedia.thumbnailUrl : null;
        isVideo = true;
      }
      console.info(
        `[opengraph-image] Selected media for ${id}: ${firstMedia?.type ?? 'none'} (${mediaUrl ? 'url available' : 'no usable URL'})`
      );
    }
  } catch (error) {
    console.error(`[opengraph-image] Post fetch threw an error for ${id}`, error);
    // Use defaults on failure
  }

  // Embed storage media in the generated PNG. ImageResponse can otherwise
  // omit remote images when the social crawler requests this route.
  if (mediaUrl) {
    try {
      const mediaResponse = await fetch(mediaUrl, { cache: 'no-store' });
      const responseContentType = mediaResponse.headers.get('content-type') || '';

      const canEmbedMedia =
        responseContentType === 'image/jpeg' ||
        responseContentType === 'image/png' ||
        responseContentType === 'image/webp' ||
        responseContentType === 'image/gif';

      if (mediaResponse.ok && canEmbedMedia) {
        const mediaBytes = new Uint8Array(await mediaResponse.arrayBuffer());
        let binary = '';
        for (let index = 0; index < mediaBytes.length; index += 8192) {
          binary += String.fromCharCode(...mediaBytes.subarray(index, index + 8192));
        }
        mediaDataUrl = `data:${responseContentType};base64,${btoa(binary)}`;
        console.info(
          `[opengraph-image] Media loaded for ${id}: ${responseContentType}, ${mediaBytes.byteLength} bytes`
        );
      } else {
        console.error(
          `[opengraph-image] Media fetch failed with ${mediaResponse.status} (${responseContentType || 'unknown content type'})`
        );
      }
    } catch (error) {
      console.error('[opengraph-image] Media fetch threw an error', error);
    }
  }

  const authorCaption = `Read this post by ${authorName} on DojoClass`;

  // Keep uploaded media in its own section instead of applying a branded
  // background or placing the post text over the user's image.
  if (mediaDataUrl) {
    console.info(`[opengraph-image] Rendering image preview for ${id}`);
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            position: 'relative',
            fontFamily: 'sans-serif',
            background: '#f4f4f5',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '500px',
              padding: '28px 48px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaDataUrl}
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }}
            />
          </div>

          {/* Video play button badge (top-right) */}
          {isVideo && (
            <div
              style={{
                position: 'absolute',
                top: 42,
                right: 62,
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)',
                border: '2.5px solid rgba(255,255,255,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Triangle play icon */}
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderTop: '11px solid transparent',
                  borderBottom: '11px solid transparent',
                  borderLeft: '18px solid rgba(255,255,255,0.85)',
                  marginLeft: 4,
                }}
              />
            </div>
          )}

          <div
            style={{
              height: '102px',
              padding: '0 48px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://dojoclass.space/favicon.png"
              style={{ width: 36, height: 36, objectFit: 'contain', opacity: 0.9 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ color: '#18181b', fontSize: 24, fontWeight: 700 }}>
                {authorName}
              </span>
              <span style={{ color: '#52525b', fontSize: 18 }}>
                {authorCaption}
              </span>
            </div>
          </div>
        </div>
      ),
      { ...size }
    );
  }

  // Text-only post → keep the preview generic and do not expose post content.
  console.info(`[opengraph-image] Rendering text-only preview for ${id}`);
  return new ImageResponse(
    (
      <div
        style={{
          background: '#f4f4f5',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top bar: favicon + site name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://dojoclass.space/favicon.png"
            style={{ width: 44, height: 44, objectFit: 'contain' }}
          />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22, fontWeight: 600, letterSpacing: 0.5 }}>
            DojoClass
          </span>
        </div>

        {/* Post content — the star of the show */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <p
            style={{
              color: '#18181b',
              fontSize: 38,
              fontWeight: 500,
              lineHeight: 1.45,
              margin: 0,
              maxWidth: 950,
              // Decorative left accent line
              borderLeft: '5px solid #a1a1aa',
              paddingLeft: 32,
            }}
          >
            {authorCaption}
          </p>
        </div>

        {/* Bottom: author info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 32 }}>
          {/* Avatar circle with initials */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#71717a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {authorName.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ color: '#ffffff', fontSize: 20, fontWeight: 700 }}>
              {authorName}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>
              dojoclass.space
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
