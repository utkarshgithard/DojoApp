import { NextResponse } from 'next/server';

// RTCIceServer equivalent — Next.js server-side, no browser globals available
interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

const FALLBACK_ICE_SERVERS: IceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * GET /api/ice-servers
 *
 * Fetches fresh Metered TURN credentials server-side before every call.
 * - METERED_API_KEY is a server-only env var (no NEXT_PUBLIC_ prefix) — never exposed to the browser.
 * - Credentials from Metered are short-lived; fetching fresh ones per call ensures they never expire mid-session.
 * - Falls back to Google STUN-only if Metered is unreachable (same-network calls still work).
 */
export async function GET() {
  const apiKey = process.env.METERED_API_KEY;
  const appName = process.env.METERED_APP_NAME || 'dojo';

  if (!apiKey || apiKey === 'your_metered_api_key_here') {
    console.warn('[ICE] METERED_API_KEY not set — returning STUN-only fallback');
    return NextResponse.json({ iceServers: FALLBACK_ICE_SERVERS });
  }

  try {
    const meteredUrl = `https://${appName}.metered.ca/api/v1/turn/credentials?apiKey=${apiKey}`;

    const response = await fetch(meteredUrl, {
      method: 'GET',
      // No-cache: always get fresh credentials, never serve a stale cached response
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Metered API responded with ${response.status} ${response.statusText}`);
    }

    const meteredServers = await response.json() as IceServer[];

    const iceServers: IceServer[] = [
      ...FALLBACK_ICE_SERVERS,
      ...meteredServers,
    ];

    return NextResponse.json({ iceServers });
  } catch (err: any) {
    console.error('[ICE] Failed to fetch Metered credentials:', err.message);
    // Graceful degradation — STUN-only instead of a hard error
    return NextResponse.json({ iceServers: FALLBACK_ICE_SERVERS });
  }
}
