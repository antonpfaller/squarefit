const CACHE_NAME = 'squarefit-v2';
const SHARE_CACHE = 'shared-image-cache';

// Dateien, die für den Offline-Betrieb vorgehalten werden (relativ zum Ort von sw.js)
const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Alte App-Caches aufräumen, den Teilen-Cache aber behalten
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== SHARE_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Wenn ein Bild über das Android-Teilen-Menü eingeht (POST-Request)
  if (event.request.method === 'POST' && url.pathname.endsWith('index.html')) {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const imageFile = formData.get('image');
          if (imageFile) {
            const cache = await caches.open(SHARE_CACHE);
            await cache.put('shared-image', new Response(imageFile));
          }
        } catch (err) {
          console.error('Teilen fehlgeschlagen:', err);
        }

        // Weiterleitung auf die App mit Signal-Parameter
        return Response.redirect('./index.html?shared=true', 303);
      })()
    );
    return;
  }

  // Nur eigene GET-Anfragen behandeln, alles andere normal durchlassen
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Erst Netzwerk (immer aktuell), bei Fehler aus dem Cache (offline)
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch (err) {
        const cached = await caches.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        throw err;
      }
    })()
  );
});
