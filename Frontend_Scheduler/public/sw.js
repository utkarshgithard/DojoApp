/**
 * DojoClass Service Worker — Web Push handler
 * Registered from layout.tsx via navigator.serviceWorker.register('/sw.js')
 *
 * Handles:
 *   push         — shows an OS notification when a push arrives (tab closed / background)
 *   notificationclick — opens the target URL and focuses the window
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'DojoClass', body: event.data.text(), url: '/sessions' };
  }

  const { title, body, url, icon } = payload;

  event.waitUntil(
    self.registration.showNotification(title ?? 'DojoClass', {
      body: body ?? '',
      icon: icon ?? '/favicon-6-Photoroom.png',
      badge: '/favicon-6-Photoroom.png',
      data: { url: url ?? '/sessions' },
      vibrate: [100, 50, 100],
      tag: 'dojoclass-notification',      // replaces previous notification of same type
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? '/sessions';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus an existing window if one is open on the target URL
        for (const client of windowClients) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
