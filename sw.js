
// SmashX Service Worker v3
// Strategy:
//   - Network-First for live session data (scores, assignments, check-ins)
//   - Stale-While-Revalidate for profile data (acceptable to be slightly stale)
//   - Cache-First for static assets (JS, CSS, fonts, images)
//   - Network-First for HTML navigation
// See: offline-resilience skill §1

const CACHE_VERSION = 'smashx-v3';
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
// MESSAGE: Handle cache invalidation from App
// (offline-resilience skill §2)
// ============================================
self.addEventListener('message', (event) => {
  if (event.data?.type === 'INVALIDATE_SESSION_CACHE') {
    console.log('SW: Invalidating session cache');
    caches.open(API_CACHE).then(cache => {
      cache.keys().then(keys => {
        keys.forEach(key => {
          if (key.url.includes('sessions')) {
            cache.delete(key);
          }
        });
      });
    });
  }
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

  // ----- Supabase API: Split by data type -----
  if (url.hostname.includes('supabase')) {
    // Detect if this is live session data
    const isSessionData = url.search.includes('sessions');

    if (isSessionData) {
      // NETWORK-FIRST with 5s timeout for live session data
      // Try network first for fresh scores, but fall back to cache quickly
      // The Realtime channel will correct stale data within seconds
      const NETWORK_TIMEOUT = 5000;

      event.respondWith(
        new Promise((resolve) => {
          let settled = false;

          // Race: network vs timeout
          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            // Network too slow — serve from cache
            caches.match(event.request).then(cached => {
              resolve(cached || fetch(event.request));
            });
          }, NETWORK_TIMEOUT);

          fetch(event.request)
            .then(response => {
              if (settled) return; // Timeout already won
              settled = true;
              clearTimeout(timer);
              if (response.ok) {
                const clone = response.clone();
                caches.open(API_CACHE).then(cache => cache.put(event.request, clone));
              }
              resolve(response);
            })
            .catch(() => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              // Network failed — fall back to cache
              caches.match(event.request).then(cached => {
                resolve(cached || new Response('{}', { status: 503 }));
              });
            });
        })
      );
    } else {
      // STALE-WHILE-REVALIDATE for profiles and other data
      // Acceptable to be slightly stale; show cached instantly, refresh in background
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
    }
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
