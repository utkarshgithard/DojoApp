import { Router, Request, Response } from 'express';

// RTCIceServer is a browser-only WebRTC type — define an equivalent here for Node.js
interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

const router = Router();

/**
 * GET /api/ice-servers
 *
 * Returns a fresh set of ICE server credentials from Metered TURN.
 * Credentials are short-lived (Metered rotates them), so we fetch
 * fresh ones from the Metered API before every call instead of
 * hardcoding them in the frontend bundle.
 *
 * The Metered API key stays server-side — never exposed to the client.
 */
router.get('/', async (_req: Request, res: Response) => {
  const apiKey = process.env.METERED_API_KEY;
  const appName = process.env.METERED_APP_NAME || 'dojo'; // your Metered app subdomain

  // Always return Google STUN as a baseline fallback
  const fallbackServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  if (!apiKey || apiKey === 'your_metered_api_key_here') {
    // No API key configured — return STUN-only (works for same-network calls)
    console.warn('[ICE] METERED_API_KEY not set — returning STUN-only ICE servers');
    res.json({ iceServers: fallbackServers });
    return;
  }

  try {
    const meteredUrl = `https://${appName}.metered.ca/api/v1/turn/credentials?apiKey=${apiKey}`;
    const response = await fetch(meteredUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // 5 second timeout
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Metered API error: ${response.status} ${response.statusText}`);
    }

    const meteredServers = await response.json() as IceServer[];

    // Merge: Metered's fresh credentials + Google STUN baseline
    const iceServers = [
      ...fallbackServers,
      ...meteredServers,
    ];

    res.json({ iceServers });
  } catch (err: any) {
    console.error('[ICE] Failed to fetch Metered credentials:', err.message);
    // Degrade gracefully — return STUN-only rather than failing the call entirely
    res.json({ iceServers: fallbackServers });
  }
});

export default router;
