/**
 * Amit Joshi Portfolio - Service Worker
 * Pre-caches portfolio assets for offline viewing.
 */

const CACHE_NAME = 'amit-portfolio-v1.0.1';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './avatar.png',
  './favicon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        CORE_ASSETS.map((assetUrl) =>
          cache.add(assetUrl).catch((err) => {
            console.warn(`[SW] Could not pre-cache ${assetUrl}:`, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => new Response('')))
    );
    return;
  }

  const isNavigation = event.request.mode === 'navigate';
  const isCode = event.request.destination === 'script' ||
                 url.pathname.endsWith('.js') ||
                 url.pathname.endsWith('.html');

  if (isNavigation || isCode) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return networkResponse;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
