// 湛湛 App 的 service worker：只負責推播通知，不做快取（避免卡在舊版）。
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || '湛湛';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: 'icon-180.png',
    badge: 'icon-180.png',
    tag: data.tag || 'zhan-chat',
    renotify: true,
    data: { url: data.url || './' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || './', self.registration.scope).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) { c.postMessage({ type: 'open-chat' }); return c.focus(); }
    }
    return self.clients.openWindow(url);
  })());
});
