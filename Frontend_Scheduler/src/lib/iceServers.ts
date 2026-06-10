/**
 * Fetches fresh TURN + STUN ICE server credentials from the Next.js API route
 * which keeps the Metered secret key safe on the server.
 *
 * Results are cached in memory for 55 minutes — Metered credentials are valid
 * for 24h, but we refresh proactively to avoid hitting a stale credential
 * mid-call.
 */

let cachedServers: RTCIceServer[] | null = null;
let cacheExpiry = 0; // epoch ms

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  const now = Date.now();

  if (cachedServers && now < cacheExpiry) {
    return cachedServers;
  }

  try {
    const res = await fetch('/api/ice-servers');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const servers: RTCIceServer[] = await res.json();

    // Cache for 55 minutes
    cachedServers = servers;
    cacheExpiry = now + 55 * 60 * 1000;

    return servers;
  } catch (err) {
    console.warn('[fetchIceServers] Could not fetch TURN credentials, falling back to STUN only:', err);
    // Fallback — works for simple NAT, not for CGNAT/mobile networks
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];
  }
}
