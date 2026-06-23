/**
 * webPush.ts
 * Client-side utilities for Web Push: SW registration, subscribe, unsubscribe.
 * Safe to import in SSR — all browser APIs are guarded by typeof window checks.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:5000';

/** Convert a base64url VAPID public key string to a Uint8Array for PushManager */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return view;
}

/** Returns true if the browser supports service workers and the Push API */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/** Register /sw.js — safe to call on every page load (idempotent) */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('✅ DojoClass SW registered, scope:', reg.scope);
    return reg;
  } catch (err) {
    console.error('SW registration failed:', err);
    return null;
  }
}

/** Returns true if the user already has an active push subscription */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub !== null;
  } catch {
    return false;
  }
}

/**
 * Request notification permission, subscribe to push, and POST the subscription to the backend.
 * @param authToken  Firebase/JWT token used to authenticate the API call
 * @returns true on success, false if permission denied or any error
 */
export async function subscribeToPush(authToken: string): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('Push not supported in this browser.');
    return false;
  }
  if (!VAPID_PUBLIC_KEY) {
    console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY not set.');
    return false;
  }

  // Ask the browser for permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.info('Push permission not granted:', permission);
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const subJson = subscription.toJSON();

    const res = await fetch(`${API_BASE}/api/push/subscribe`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys:     subJson.keys,
      }),
    });

    if (!res.ok) {
      console.error('Backend rejected push subscription:', await res.text());
      return false;
    }

    console.log('🔔 Push subscription saved.');
    return true;
  } catch (err) {
    console.error('subscribeToPush error:', err);
    return false;
  }
}

/**
 * Unsubscribe from push and notify the backend to delete the subscription record.
 * @param authToken  Firebase/JWT token
 */
export async function unsubscribeFromPush(authToken: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return true; // already unsubscribed

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    await fetch(`${API_BASE}/api/push/unsubscribe`, {
      method:  'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${authToken}`,
      },
      body: JSON.stringify({ endpoint }),
    });

    console.log('🔕 Push subscription removed.');
    return true;
  } catch (err) {
    console.error('unsubscribeFromPush error:', err);
    return false;
  }
}

/** Returns the current Notification permission state or 'unsupported' */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
