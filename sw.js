/* Workout Tracker service worker — offline app shell + in-place updates.

   How updates work:
   - The installed version is served from the cache (cache-first), so every file
     always comes from the same release — no half-updated app.
   - When sw.js changes on the server (the CACHE name below changes with every
     release), the browser installs the new worker in the background. It downloads
     a complete fresh copy of the app and then *waits*.
   - The app's "Update now" button tells the waiting worker to take over and
     reloads the page. If the user never taps it, the new version takes over the
     next time the app is fully closed and reopened.
   - Workouts live in localStorage, which updates never touch.

   Releasing an update: bump the version in app.js (APP_VERSION), here (CACHE)
   and in version.json — all three must match. */
const CACHE = 'wt-cache-1.8.0';

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

/* Cache each asset on its own so one missing/failed file never aborts install.
   cache: 'reload' skips the HTTP cache so a release is fetched fresh. */
function cacheAll(cache, urls) {
  return Promise.all(urls.map((url) =>
    fetch(new Request(url, { cache: 'reload' }))
      .then((res) => (res && res.ok ? cache.put(url, res) : null))
      .catch(() => null)
  ));
}

self.addEventListener('install', (e) => {
  // No skipWaiting here: the new version waits until the user chooses to update
  // (or until the app is closed), so a running app never has its files swapped underneath it.
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all([cacheAll(c, CORE), cacheAll(c, OPTIONAL)])));
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // The update check must always reach the server.
  if (url.pathname.endsWith('/version.json')) return;
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: req.mode === 'navigate' }).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
            return res;
          })
          .catch(() => (req.mode === 'navigate' ? cache.match('./index.html') : undefined));
      })
    )
  );
});
