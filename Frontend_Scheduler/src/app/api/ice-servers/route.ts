import { NextResponse } from 'next/server';

/**
 * GET /api/ice-servers
 *
 * Fetches fresh, short-lived TURN credentials from Metered.ca on the SERVER
 * so the secret API key is NEVER exposed to the browser.
 *
 * Metered docs: https://www.metered.ca/stun-turn
 * The response is an array of RTCIceServer objects ready to pass directly
 * to `new RTCPeerConnection({ iceServers })`.
 */
export async function GET() {
  const domain = process.env.METERED_DOMAIN;    // e.g. "yourapp.metered.live"
  const apiKey = process.env.METERED_SECRET_KEY; // secret key from Metered dashboard

  if (!domain || !apiKey) {
    // Fall back to Google STUN only — works for simple NAT (same ISP / nearby)
    return NextResponse.json([
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]);
  }

  try {
    const res = await fetch(
      `https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`,
      { next: { revalidate: 3600 } } // cache for 1 hour — Metered credentials are valid for 24h
    );

    if (!res.ok) {
      throw new Error(`Metered API responded with ${res.status}`);
    }

    const iceServers: RTCIceServer[] = await res.json();
    return NextResponse.json(iceServers);
  } catch (err) {
    console.error('[ice-servers] Failed to fetch TURN credentials from Metered:', err);
    // Graceful fallback — at minimum STUN works for non-CGNAT connections
    return NextResponse.json([
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]);
  }
}
