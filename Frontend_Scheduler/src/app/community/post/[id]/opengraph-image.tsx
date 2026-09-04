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

  const authorCaption = `A post by ${authorName}`;

  // Keep the post private while presenting shared media in a branded card.
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
            background: 'linear-gradient(135deg, #09090b 0%, #18122f 52%, #312e81 100%)',
            padding: '34px 42px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 30,
              left: 42,
              right: 42,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://dojoclass.space/favicon.png"
                style={{ width: 34, height: 34, objectFit: 'contain' }}
              />
              <span style={{ color: '#ffffff', fontSize: 23, fontWeight: 800 }}>DojoClass</span>
            </div>
            <span style={{ color: '#c4b5fd', fontSize: 16, fontWeight: 700 }}>COMMUNITY POST</span>
          </div>

          <div
            style={{
              width: '100%',
              height: '454px',
              marginTop: 54,
              padding: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.28)',
              borderRadius: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.32)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaDataUrl}
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 15 }}
            />
          </div>

          {/* Video play button badge */}
          {isVideo && (
            <div
              style={{
                position: 'absolute',
                top: 222,
                left: 570,
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)',
                border: '2px solid rgba(255,255,255,0.8)',
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
                  borderTop: '12px solid transparent',
                  borderBottom: '12px solid transparent',
                  borderLeft: '20px solid rgba(255,255,255,0.9)',
                  marginLeft: 4,
                }}
              />
            </div>
          )}

          <div
            style={{
              height: '68px',
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://dojoclass.space/favicon.png"
              style={{ width: 32, height: 32, objectFit: 'contain', opacity: 0.9 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ color: '#ffffff', fontSize: 22, fontWeight: 800 }}>
                {authorName}
              </span>
              <span style={{ color: '#c4b5fd', fontSize: 16, fontWeight: 600 }}>
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
          background: 'linear-gradient(135deg, #09090b 0%, #18122f 52%, #312e81 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '54px 72px',
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
          <span style={{ color: '#ffffff', fontSize: 23, fontWeight: 800, letterSpacing: 0.5 }}>
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
              fontSize: 38,
              fontWeight: 500,
              lineHeight: 1.45,
              margin: 0,
              maxWidth: 950,
              // Decorative left accent line
              borderLeft: '5px solid #a78bfa',
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
            <span style={{             color: '#c4b5fd', fontSize: 16 }}>
              dojoclass.space
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
