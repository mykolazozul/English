const CACHE = 'ef-offline-v2';
const ASSETS = ['./', './index.html', './words-db.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.endsWith('words-db.json') || url.pathname.includes('/assets/')) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        try {
          const net = await fetch(e.request);
          cache.put(e.request, net.clone());
          return net;
        } catch {
          const hit = await cache.match(e.request);
          return hit || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
        }
      })
    );
  }
});
