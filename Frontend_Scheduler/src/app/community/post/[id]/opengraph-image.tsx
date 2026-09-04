import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getPublicApiUrl } from '@/lib/publicPostMetadata';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Image({ params }: Props) {
  const { id } = await params;

  // Read favicon once at build/request time
  const faviconData = readFileSync(join(process.cwd(), 'public', 'favicon.png'));
  const faviconBase64 = `data:image/png;base64,${faviconData.toString('base64')}`;

  // Fetch post data
  let authorName = 'DojoClass User';
  let mediaUrl: string | null = null;
  let mediaDataUrl: string | null = null;
  let isVideo = false;

  try {
    const res = await fetch(`${getPublicApiUrl()}/community/posts/${id}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      const post = data.post;
      authorName = post?.author?.name ?? authorName;
      const firstMedia = post?.media?.[0];
      if (firstMedia?.type === 'image') {
        // Use image directly
        mediaUrl = firstMedia.url;
        isVideo = false;
      } else if (firstMedia?.type === 'video') {
        // Use the pre-generated first-frame thumbnail stored in DB
        mediaUrl = firstMedia.thumbnailUrl ?? null;
        isVideo = true;
      }
    }
  } catch {
    // Use defaults on failure
  }

  // Embed storage media in the generated PNG. ImageResponse can otherwise
  // omit remote images when the social crawler requests this route.
  if (mediaUrl) {
    const mediaResponse = await fetch(mediaUrl, { cache: 'no-store' });
    if (mediaResponse.ok) {
      const contentType = mediaResponse.headers.get('content-type') || 'image/jpeg';
      const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());
      mediaDataUrl = `data:${contentType};base64,${mediaBuffer.toString('base64')}`;
    } else {
      console.error(`[opengraph-image] Media fetch failed with ${mediaResponse.status}`);
    }
  }

  const authorCaption = `See what ${authorName} is saying about this on DojoClass`;

  // Keep uploaded media in its own section instead of applying a branded
  // background or placing the post text over the user's image.
  if (mediaDataUrl) {
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
              src={faviconBase64}
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
            src={faviconBase64}
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
