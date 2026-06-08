/**
 * pushService.ts
 * Thin wrapper around the `web-push` library.
 * Fires a Web Push notification to every registered browser subscription for a given userId.
 * Silently cleans up expired/invalid subscriptions (410 Gone).
 */
import webPush from 'web-push';
import prisma from '../lib/prisma.js';

// ── VAPID configuration ──────────────────────────────────────────────────────
const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject    = process.env.VAPID_SUBJECT ?? 'mailto:support@dojoclass.space';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn('⚠️  VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push notifications disabled.');
} else {
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;   // page to open on click (e.g. '/sessions')
  icon?: string;  // default: '/favicon-6-Photoroom.png'
}

/**
 * Send a push notification to all registered subscriptions of `userId`.
 * Errors are caught per-subscription; a single bad endpoint never aborts the rest.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) return; // gracefully skip if VAPID not configured

  let subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[];

  try {
    subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  } catch (err) {
    console.error('pushService: failed to fetch subscriptions for', userId, err);
    return;
  }

  if (subscriptions.length === 0) return;

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    url:   payload.url  ?? '/sessions',
    icon:  payload.icon ?? '/favicon-6-Photoroom.png',
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notificationPayload,
        );
      } catch (err: any) {
        // 410 Gone → subscription is expired; remove it from DB
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          console.log(`🗑️  Removing expired push subscription ${sub.id} for user ${userId}`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error(`pushService: failed to push to sub ${sub.id}:`, err?.message ?? err);
        }
      }
    }),
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) {
    console.warn(`pushService: ${failed}/${subscriptions.length} push(es) failed for user ${userId}`);
  }
}
