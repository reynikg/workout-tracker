/* Workout Tracker service worker — offline app shell + data.
   Bump CACHE when you change app files to push an update. */
/* Keep this version in sync with APP_VERSION in app.js. */
const CACHE = 'wt-cache-1.5.0';

/* Core files the app needs to run offline. */
const CORE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './legal.js',
  './legal.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png',
];

/* Optional files — cached if present, ignored if missing (e.g. sample data
   may have been removed before sharing the app). */
const OPTIONAL = [
  './data/workouts-2026.json',
  './data/workouts-extra-2026.json',
];

/* Cache each asset on its own so one missing/failed file never aborts install. */
function cacheAll(cache, urls) {
  return Promise.all(urls.map((url) =>
    fetch(new Request(url, { cache: 'reload' }))
      .then((res) => (res && res.ok ? cache.put(url, res) : null))
      .catch(() => null)
  ));
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all([cacheAll(c, CORE), cacheAll(c, OPTIONAL)]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Stale-while-revalidate for same-origin GET requests:
   serve from cache instantly, refresh the cache in the background. */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
