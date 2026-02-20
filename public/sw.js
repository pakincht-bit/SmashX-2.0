
// SmashX Service Worker v2
// Strategy: Cache-first for static assets, Stale-While-Revalidate for API calls.
// This means the app opens INSTANTLY on return visits while refreshing data in the background.

const CACHE_VERSION = 'smashx-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Core files to pre-cache during install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// ============================================
// INSTALL: Pre-cache core shell
// ============================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// ============================================
// ACTIVATE: Clean up old caches
// ============================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== API_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // Take control immediately
  );
});

// ============================================
// FETCH: Smart caching strategies
// ============================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests (POST, DELETE, etc.)
  if (event.request.method !== 'GET') return;

  // Skip non-http(s) requests (chrome-extension://, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Skip WebSocket and realtime connections
  if (url.protocol === 'wss:' || url.pathname.includes('/realtime/')) return;

  // ----- Strategy 1: Supabase API (Stale-While-Revalidate) -----
  // Show cached data instantly, then refresh in background
  if (url.hostname.includes('supabase')) {
    event.respondWith(
      caches.open(API_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          const networkFetch = fetch(event.request).then(response => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached); // If network fails, use cache

          return cached || networkFetch; // Return cached immediately if available
        })
      )
    );
    return;
  }

  // ----- Strategy 2: Static Assets (Cache-First) -----
  // JS, CSS, fonts — these have hashed filenames so cache forever
  if (url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|jpg|webp|ico)$/)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached; // Return from cache instantly

          return fetch(event.request).then(response => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // ----- Strategy 3: HTML Navigation (Network-First) -----
  // Always try to get fresh HTML, fall back to cache if offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }
});
