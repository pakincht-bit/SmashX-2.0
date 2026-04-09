---
name: offline-resilience
description: "Network resilience and caching rules for SmashX. Use this skill when working with Service Workers, cache strategies, retry logic, offline mode, loading states, or pull-to-refresh. Ensures the app feels fast without showing stale data."
---

# Network Resilience & Cache Strategy — SmashX Rules

> The app must feel instant without showing lies.

## When to Apply

Reference these rules when:
- Modifying the Service Worker (`sw.js`)
- Implementing or changing data fetching logic
- Adding retry/backoff to any network operation
- Building loading states, error states, or empty states
- Working on pull-to-refresh or manual sync features
- Debugging "app shows old data on open" issues

## 1. Cache Strategy by Data Type (CRITICAL)

### Rule: Never cache live session data with Stale-While-Revalidate
SmashX has fundamentally different data types that need different cache strategies:

| Data Type | Examples | Cache Strategy | Reason |
|-----------|----------|---------------|--------|
| **Live session data** | Scores, court assignments, check-ins, matches, queues | **Network-First** | Showing stale scores is worse than showing a spinner |
| **Static assets** | JS, CSS, fonts, images | **Cache-First** | These have hashed filenames; cache forever |
| **Profile data** | User profiles, leaderboard | **SWR with 5min max-age** | Acceptable to be slightly stale; changes infrequently |
| **HTML navigation** | `index.html` | **Network-First with cache fallback** | Always serve fresh shell |

### Mandatory Service Worker Pattern
```js
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET, non-HTTP, WebSocket
  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  if (url.pathname.includes('/realtime/')) return;

  // --- SUPABASE API ---
  if (url.hostname.includes('supabase')) {
    const isSessionData = url.search.includes('sessions');
    
    if (isSessionData) {
      // NETWORK-FIRST for live data: always try network, fall back to cache
      event.respondWith(
        fetch(event.request)
          .then(response => {
            const clone = response.clone();
            caches.open(API_CACHE).then(c => c.put(event.request, clone));
            return response;
          })
          .catch(() => caches.match(event.request))
      );
    } else {
      // SWR for profiles/other: serve cached, update in background
      event.respondWith(
        caches.open(API_CACHE).then(cache =>
          cache.match(event.request).then(cached => {
            const networkFetch = fetch(event.request).then(response => {
              if (response.ok) cache.put(event.request, response.clone());
              return response;
            }).catch(() => cached);

            return cached || networkFetch;
          })
        )
      );
    }
    return;
  }

  // --- STATIC ASSETS: Cache-First ---
  // --- HTML: Network-First ---
  // (Same as current implementation)
});
```

### Anti-Patterns
```js
// ❌ WRONG: SWR for ALL Supabase calls (current sw.js implementation)
if (url.hostname.includes('supabase')) {
  // Returns cached data for EVERYTHING, including live scores
  return cached || networkFetch;
}
```

## 2. Cache Invalidation on Reconnection (HIGH)

### Rule: When Realtime reconnects, purge session cache
After the Realtime channel reconnects (see `realtime-sync` skill), broadcast a message to the Service Worker to invalidate stale session data.

### Pattern: SW Cache Purge Message
```tsx
// In App.tsx — after Realtime reconnection:
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  navigator.serviceWorker.controller.postMessage({
    type: 'INVALIDATE_SESSION_CACHE'
  });
}
```

```js
// In sw.js — handle cache purge:
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
```

## 3. Retry with Exponential Backoff (HIGH)

### Rule: All failed mutations MUST retry before showing an error
Network failures are transient on mobile. Don't immediately give up and show an error.

### Mandatory Pattern
```tsx
const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), 8000);
        console.log(`SX: Retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError!;
};

// Usage:
const { error } = await withRetry(() =>
  supabase.from('sessions').update({ player_ids: newIds }).eq('id', sessionId)
);
```

### When to Retry vs. When to Fail Fast
| Operation | Retry? | Reason |
|-----------|--------|--------|
| Record match result | ✅ 3 retries | Critical — losing a match result is unacceptable |
| Join/leave session | ✅ 2 retries | Important but user can manually retry |
| Court assignment | ✅ 2 retries | Important for live session flow |
| Fetch data | ✅ 3 retries | Essential for app usability |
| Profile update (name/avatar) | ❌ No retry | Low urgency, user can redo |
| Delete session | ❌ No retry | Destructive action, fail fast and confirm |

## 4. Loading States (MEDIUM)

### Rule: Every data-dependent UI MUST have 3 states
Never show a blank screen or stale data without indication.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  LOADING     │    │  SUCCESS    │    │   ERROR     │
│  skeleton/   │    │  fresh data │    │  message +  │
│  spinner     │    │  rendered   │    │  retry btn  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Guidelines
- **Initial load:** Show branded skeleton (not generic spinners) — the current "Entering Arena..." spinner is good
- **Background sync:** Use the `isSyncing` state with a subtle overlay — never block the entire UI
- **Pull-to-refresh:** Show "Syncing..." with a timestamp: "Last updated: 5s ago"
- **Error state:** Always include a retry button. Never dead-end the user

### Freshness Indicator Pattern
During active (PLAYING) sessions, show when data was last synced:
```tsx
const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

// Update after every successful fetch:
const fetchData = async () => {
  // ...fetch logic...
  setLastSyncTime(new Date());
};

// In UI:
const secondsAgo = Math.floor((Date.now() - lastSyncTime.getTime()) / 1000);
// Show "Updated 3s ago" or "Updated just now"
```

## 5. Offline Detection & Recovery (MEDIUM)

### Rule: Detect offline state from BOTH browser API and failed fetches
`navigator.onLine` is unreliable on mobile. Use a combination approach:

```tsx
const [isOffline, setIsOffline] = useState(!navigator.onLine);

useEffect(() => {
  const handleOnline = () => {
    setIsOffline(false);
    // Trigger full data sync
    fetchData();
  };
  const handleOffline = () => setIsOffline(true);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

### Offline Mode Behavior
When offline is detected:
1. **Disable mutations** — Prevent users from taking actions that will silently fail
2. **Show offline banner** — "You're offline. Scores may not be current."
3. **Keep showing last-known data** — Better than a blank screen
4. **On reconnect** → Full data refetch + Realtime channel verification

## 6. Pull-to-Refresh Enhancement (LOW)

### Rule: Pull-to-refresh bypasses all caches
When the user explicitly pulls to refresh, they're telling you "I don't trust what I see":

```tsx
const handlePullToRefresh = async () => {
  // 1. Bypass SW cache — add cache-buster header
  // (or use the INVALIDATE_SESSION_CACHE message)
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'INVALIDATE_SESSION_CACHE'
    });
  }

  // 2. Verify Realtime channel health
  const channelState = channelRef.current?.state;
  if (channelState !== 'joined') {
    scheduleReconnection();
  }

  // 3. Force fresh data fetch
  await fetchData();

  // 4. Show last-updated time
  showToast(`Synced — ${new Date().toLocaleTimeString()}`);
};
```

## 7. Mandatory Code Checklist

When writing or reviewing network/cache related code:

- [ ] Live session data uses Network-First caching (never SWR)
- [ ] Profile/static data uses appropriate cache strategy (SWR or Cache-First)
- [ ] Realtime reconnection triggers SW cache invalidation for sessions
- [ ] Critical mutations retry with exponential backoff (1s → 2s → 4s)
- [ ] All data-dependent UI has loading, success, and error states
- [ ] Active sessions show a "last synced" freshness indicator
- [ ] `navigator.onLine` + failed fetch detection for offline mode
- [ ] Offline mode disables mutations and shows a banner
- [ ] Pull-to-refresh bypasses SW cache and verifies Realtime health
- [ ] No blank screens — always show last-known data or a loading state

## 8. SmashX-Specific Context

### Files That Handle Caching & Network
- [sw.js](file:///Users/APPLE/Desktop/00_Personal/SmashX-2.0/sw.js) — Service Worker with cache strategies
- [App.tsx](file:///Users/APPLE/Desktop/00_Personal/SmashX-2.0/App.tsx) — `fetchData()`, `withTimeout()`, `visibilitychange` handler
- [components/PullToRefresh.tsx](file:///Users/APPLE/Desktop/00_Personal/SmashX-2.0/components/PullToRefresh.tsx) — Pull-to-refresh UI component

### Current Timeout Value
The app uses a 30-second fetch timeout (`FETCH_TIMEOUT = 30000`). This is reasonable for initial load but too long for background syncs during active sessions. Consider:
- Initial load: 30s timeout (current)
- Background sync during PLAYING: 10s timeout
- Pull-to-refresh: 15s timeout
