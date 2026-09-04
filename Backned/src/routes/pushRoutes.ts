/**
 * pushRoutes.ts
 * Endpoints for managing browser Web Push subscriptions.
 *
 *  POST   /api/push/subscribe    — save / update a subscription (upsert by endpoint)
 *  DELETE /api/push/unsubscribe  — remove a subscription by endpoint
 *  GET    /api/push/vapid-public-key — serve the VAPID public key to the client
 */
import express, { Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, AuthenticatedRequest } from '../middleware/authmiddleware.js';

const pushRouter = express.Router();

// GET /api/push/vapid-public-key — no auth needed; client needs this to subscribe
pushRouter.get('/vapid-public-key', (_req, res: Response) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    res.status(503).json({ error: 'Push notifications not configured on this server.' });
    return;
  }
  res.json({ publicKey: key });
});

// POST /api/push/subscribe
pushRouter.post('/subscribe', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { endpoint, keys } = req.body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'Missing subscription fields: endpoint, keys.p256dh, keys.auth' });
    return;
  }

  try {
    // Verify the user exists in our DB before creating a push subscription.
    // This can fail if Firebase auth succeeds but /auth/sync hasn't run yet
    // (e.g. token issued before the user record was created).
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      // Return a specific status so the client can re-run /auth/sync.
      res.status(409).json({
        error: 'User record not found. Please re-sync your account.',
        code: 'USER_NOT_SYNCED',
      });
      return;
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });

    res.status(201).json({ message: '✅ Push subscription saved.' });
  } catch (err) {
    console.error('push/subscribe error:', err);
    res.status(500).json({ error: 'Failed to save push subscription.' });
  }
});

// DELETE /api/push/unsubscribe
pushRouter.delete('/unsubscribe', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { endpoint } = req.body as { endpoint: string };

  if (!endpoint) {
    res.status(400).json({ error: 'Missing endpoint' });
    return;
  }

  try {
    await prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    res.json({ message: '✅ Push subscription removed.' });
  } catch (err) {
    console.error('push/unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to remove push subscription.' });
  }
});

export default pushRouter;
