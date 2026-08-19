const CACHE_NAME = 'squarefit-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Wenn ein Bild über das Android-Teilen-Menü eingeht (POST-Request)
  if (event.request.method === 'POST' && url.pathname.endsWith('index.html')) {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const imageFile = formData.get('image');
        
        const cache = await caches.open('shared-image-cache');
        await cache.put('shared-image', new Response(imageFile));
        
        // Weiterleitung auf die App mit Signal-Parameter
        return Response.redirect('./index.html?shared=true', 303);
      })()
    );
    return;
  }

  // Normales Laden von statischen Ressourcen
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});