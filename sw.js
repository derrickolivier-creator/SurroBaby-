// sw.js — GitHub Pages–safe PWA SW
const CACHE = 'surro-pwa-v2';

// Figure out our base path on GitHub Pages (e.g. "/SurroBaby-/")
const SCOPE_URL = new URL(self.registration.scope);
const BASE_PATH = SCOPE_URL.pathname.endsWith('/') ? SCOPE_URL.pathname : SCOPE_URL.pathname + '/';

// Helper to make a scoped URL for caching/matching
const u = (p) => new URL(p, SCOPE_URL).toString();

// App shell to cache (use absolute URLs scoped to the repo path)
const APP_SHELL = [
  u('./'),
  u('./index.html'),
  u('./styles.css'),
  u('./app.js'),
  u('./manifest.webmanifest'),
  u('./offline.html'),
  u('./icons/icon-192.png'),
  u('./icons/icon-512.png'),
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // 1) SPA fallback: if it’s a page navigation, serve index.html from cache
  if (req.mode === 'navigate' && req.method === 'GET') {
    e.respondWith(
      fetch(req).catch(() => caches.match(u('./index.html')).then((r) => r || caches.match(u('./'))))
    );
    return;
  }

  // 2) Network-first for JSON requests
  const accept = req.headers.get('accept') || '';
  if (req.method === 'GET' && accept.includes('application/json')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || new Response('{}', { headers: { 'Content-Type': 'application/json' } })))
    );
    return;
  }

  // 3) Cache-first for same-origin assets
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  if (req.method === 'GET' && sameOrigin) {
    e.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).catch(() => {
          // last-resort offline page for assets that fail
          if (accept.includes('text/html')) return caches.match(u('./offline.html'));
          return undefined;
        })
      )
    );
  }
});
