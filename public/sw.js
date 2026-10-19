const CACHE_NAME = 'jam-shift-shell-v4';
const APP_BASE = new URL('./', self.registration.scope).href;
const APP_SHELL = [
  APP_BASE,
  new URL('./manifest.webmanifest', APP_BASE).href,
  new URL('./jam-shift-icon.svg', APP_BASE).href,
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('jam-shift-shell-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) void caches.open(CACHE_NAME).then(cache => cache.put(APP_BASE, response.clone()));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || await caches.match(APP_BASE);
        }),
    );
    return;
  }

  const isExecutableAsset = request.destination === 'script'
    || request.destination === 'style'
    || /\/assets\/[^/]+\.(?:js|css)$/.test(new URL(request.url).pathname);

  if (isExecutableAsset) {
    event.respondWith(
      fetch(new Request(request, { cache: 'no-cache' }))
        .then(response => {
          if (response.ok) void caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          return response;
        })
        .catch(async () => await caches.match(request) || Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const update = fetch(request).then(response => {
        if (response.ok) void caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      });
      return cached || update;
    }),
  );
});
