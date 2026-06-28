import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://dojoapp-1.onrender.com/api';

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
  let content = '';
  let mediaUrl: string | null = null;
  let isVideo = false;

  try {
    const res = await fetch(`${API_URL}/community/posts/${id}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      const post = data.post;
      authorName = post?.author?.name ?? authorName;
      content = post?.content ?? '';
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

  // Truncate content for display
  const displayContent =
    content.length > 220 ? content.slice(0, 217) + '…' : content;

  // If post has image or video thumbnail → use it as full-bleed background
  if (mediaUrl) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            position: 'relative',
            fontFamily: 'sans-serif',
            background: '#000',
          }}
        >
          {/* Full-bleed media (image or video thumbnail) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* Dark gradient overlay at bottom for readability */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '55%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)',
              display: 'flex',
            }}
          />

          {/* Video play button badge (top-right) */}
          {isVideo && (
            <div
              style={{
                position: 'absolute',
                top: 28,
                right: 36,
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

          {/* Bottom: favicon + author name */}
          <div
            style={{
              position: 'absolute',
              bottom: 36,
              left: 48,
              right: 48,
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
            <span style={{ color: 'rgba(255,255,255,0.95)', fontSize: 24, fontWeight: 700 }}>
              {authorName}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 20, marginLeft: 4 }}>
              · DojoClass
            </span>
          </div>
        </div>
      ),
      { ...size }
    );
  }

  // Text-only post → render a card with the post content
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
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
              color: '#ffffff',
              fontSize: displayContent.length > 120 ? 34 : 44,
              fontWeight: 500,
              lineHeight: 1.45,
              margin: 0,
              maxWidth: 950,
              // Decorative left accent line
              borderLeft: '5px solid #6366f1',
              paddingLeft: 32,
            }}
          >
            {displayContent || 'Check out this post on DojoClass'}
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
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
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
