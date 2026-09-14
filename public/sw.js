const CACHE_NAME = 'scout-trainer-v3-gesture';
const APP_SHELL = [
  './',
  './manifest.webmanifest',
  './icons/scout-trainer.svg',
  './icons/scout-trainer-192.png',
  './icons/scout-trainer-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(async (cache) => {
        const response = await fetch('./index.html');
        const html = await response.text();
        await cache.put(
          './index.html',
          new Response(html, { headers: { 'Content-Type': 'text/html' } }),
        );
        const discoveredAssets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
          .map((match) => new URL(match[1], self.registration.scope))
          .filter((url) => url.origin === self.location.origin)
          .map((url) => url.href);
        const shellUrls = APP_SHELL.map((path) => new URL(path, self.registration.scope).href);
        await cache.addAll([...new Set([...shellUrls, ...discoveredAssets])]);
      }),
      self.skipWaiting(),
    ]),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
        ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin)
    return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ??
        fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }),
    ),
  );
});
