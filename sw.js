
// SmashX Service Worker v4
// Strategy:
//   - Network-First for live session data (scores, assignments, check-ins)
//   - Stale-While-Revalidate for profile data
//   - Cache-First for hashed production static assets only
//   - Network-First for HTML navigation
//   - NEVER intercept Vite dev server requests or localhost

const CACHE_VERSION = 'smashx-v4';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

function isLocalhost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function isViteDevRequest(url) {
  if (isLocalhost(url.hostname)) return true;
  if (url.pathname.startsWith('/@')) return true;
  if (url.pathname.includes('/node_modules/.vite/')) return true;
  if (url.pathname.endsWith('.tsx') || url.pathname.endsWith('.ts')) return true;
  if (url.search.includes('?t=') || url.search.includes('&t=')) return true;
  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== API_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'INVALIDATE_SESSION_CACHE') {
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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  if (url.protocol === 'wss:' || url.pathname.includes('/realtime/')) return;

  // Never intercept dev server traffic — stale cached Vite modules cause blank screens
  if (isViteDevRequest(url)) return;

  if (url.hostname.includes('supabase')) {
    const isSessionData = url.search.includes('sessions');

    if (isSessionData) {
      const NETWORK_TIMEOUT = 5000;

      event.respondWith(
        new Promise((resolve) => {
          let settled = false;

          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            caches.match(event.request).then(cached => {
              resolve(cached || fetch(event.request));
            });
          }, NETWORK_TIMEOUT);

          fetch(event.request)
            .then(response => {
              if (settled) return;
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
              caches.match(event.request).then(cached => {
                resolve(cached || new Response('{}', { status: 503 }));
              });
            });
        })
      );
    } else {
      event.respondWith(
        caches.open(API_CACHE).then(cache =>
          cache.match(event.request).then(cached => {
            const networkFetch = fetch(event.request).then(response => {
              if (response.ok) {
                cache.put(event.request, response.clone());
              }
              return response;
            }).catch(() => cached);

            return cached || networkFetch;
          })
        )
      );
    }
    return;
  }

  // Production hashed assets only — skip unhashed dev bundles
  if (url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|jpg|webp|ico)$/) && url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;

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
  }
});
