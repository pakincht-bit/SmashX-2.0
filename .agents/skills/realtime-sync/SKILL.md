---
name: realtime-sync
description: "Supabase Realtime reliability rules for SmashX. Use this skill when working with real-time subscriptions, WebSocket channels, live data updates, or connection handling. Ensures all connected users see consistent, fresh data."
---

# Supabase Realtime Reliability — SmashX Rules

> Every user must see the same data within 2 seconds, or know that they don't.

## When to Apply

Reference these rules when:
- Creating, modifying, or debugging Supabase Realtime channel subscriptions
- Handling `visibilitychange` or app resume logic
- Building UI that displays live data (scores, court assignments, check-ins, queues)
- Working on connection status indicators or sync feedback
- Debugging "stale data" or "scores not updating" issues

## 1. Channel Health Monitoring (CRITICAL)

### Rule: Never trust a silent channel
The Supabase Realtime channel silently disconnects on mobile when:
- The phone screen locks or user switches to another app
- Network transitions between WiFi and cellular
- The WebSocket connection times out server-side
- Supabase restarts or rebalances connections

### Mandatory Pattern: Status-Aware Subscription
```tsx
// ✅ CORRECT: Monitor ALL channel states
const channel = supabase.channel('public:all-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, handleSessionChange)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, handleProfileChange)
  .subscribe((status, err) => {
    console.log('SX: Realtime status:', status);

    if (status === 'SUBSCRIBED') {
      setConnectionStatus('live');
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.error('SX: Channel error, will reconnect:', err?.message);
      setConnectionStatus('reconnecting');
      scheduleReconnection();
    } else if (status === 'CLOSED') {
      setConnectionStatus('disconnected');
      scheduleReconnection();
    }
  });
```

```tsx
// ❌ WRONG: Log-and-ignore
.subscribe((status) => {
  console.log('SX: Realtime channel status:', status);
  // No error handling, no reconnection, no user feedback
});
```

### Connection Status States
Always track connection health using one of these states:

| State | Meaning | UI Indicator |
|-------|---------|-------------|
| `live` | Channel subscribed, data is fresh | Green dot (hidden or subtle) |
| `reconnecting` | Channel lost, attempting recovery | Yellow pulsing dot + "Reconnecting..." |
| `disconnected` | Channel dead, manual action needed | Red dot + "Offline" banner |
| `syncing` | Channel reconnected, fetching fresh data | Blue spinner + "Syncing..." |

## 2. Reconnection Protocol (CRITICAL)

### Rule: Reconnection = Destroy + Recreate + Refetch
Never assume Supabase's internal reconnection "caught up". After any disconnection, you MUST:

1. **Remove** the old channel entirely (`supabase.removeChannel(channel)`)
2. **Create** a new channel with fresh subscriptions
3. **Fetch** all data from the server (full refetch, not incremental)
4. **Reconcile** fetched data with local state (server wins)
5. **Update** connection status to `live`

### Mandatory Pattern: Exponential Backoff Reconnection
```tsx
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

const scheduleReconnection = (attempt = 0) => {
  if (attempt >= MAX_RETRIES) {
    setConnectionStatus('disconnected');
    return; // Show manual retry UI
  }

  const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30000);
  console.log(`SX: Reconnecting in ${delay}ms (attempt ${attempt + 1})`);

  setTimeout(async () => {
    try {
      // 1. Destroy old channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      // 2. Create new channel (re-subscribe)
      channelRef.current = createRealtimeChannel();
      // 3. Full data refetch
      setConnectionStatus('syncing');
      await fetchData();
      setConnectionStatus('live');
    } catch (err) {
      scheduleReconnection(attempt + 1);
    }
  }, delay);
};
```

### Anti-Patterns
- ❌ Never call `.subscribe()` again on a dead channel — always destroy and recreate
- ❌ Never skip the data refetch after reconnection — you WILL have missed events
- ❌ Never reconnect without backoff — you'll DDoS your own Supabase instance

## 3. Visibility Change Protocol (HIGH)

### Rule: Every app resume = verify channel + sync data
Mobile browsers (Safari, Chrome) put WebSocket connections to sleep when backgrounded. The `visibilitychange` event is your recovery point.

### Mandatory Pattern: Enhanced Visibility Handler
```tsx
const handleVisibilityChange = async () => {
  if (document.visibilityState !== 'visible') return;

  console.log('SX: App resumed — verifying channel health...');

  // 1. Check if channel is still alive
  const channelState = channelRef.current?.state;
  const isHealthy = channelState === 'joined' || channelState === 'joining';

  if (!isHealthy) {
    // 2. Channel is dead — full reconnection
    console.log('SX: Channel unhealthy, reconnecting...');
    setConnectionStatus('reconnecting');
    scheduleReconnection();
  }

  // 3. ALWAYS fetch fresh data regardless of channel state
  // (even healthy channels may have missed events during background)
  setConnectionStatus('syncing');
  await fetchData();
  setConnectionStatus('live');
};
```

```tsx
// ❌ WRONG: Fetch without checking channel health
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    fetchData(); // Data fetched once, but channel is dead — future updates dropped
  }
};
```

## 4. Event Ordering & Deduplication (MEDIUM)

### Rule: Never apply an older event over a newer local state
Realtime events can arrive out of order or be duplicates (especially after reconnection).

### Guidelines
- When processing an `UPDATE` event, compare the event's `updated_at` (or relevant timestamp) with your local state's timestamp
- If the event is older than local state, discard it
- If the event is newer, apply it (server wins)
- After a full refetch, ignore any Realtime events that arrived *during* the refetch (use a `lastFetchTimestamp` guard)

### Pattern: Fetch Guard
```tsx
const lastFetchRef = useRef<number>(0);

const fetchData = async () => {
  const fetchStarted = Date.now();
  // ... fetch from Supabase ...
  lastFetchRef.current = fetchStarted;
};

// In Realtime handler:
const handleSessionChange = (payload) => {
  const eventTime = new Date(payload.commit_timestamp).getTime();
  if (eventTime < lastFetchRef.current) {
    console.log('SX: Ignoring stale Realtime event (older than last fetch)');
    return;
  }
  // ... apply update ...
};
```

## 5. Mandatory Code Checklist

When writing or reviewing any code that touches Realtime:

- [ ] Channel subscription has a status callback that handles `CHANNEL_ERROR`, `TIMED_OUT`, and `CLOSED`
- [ ] Connection status is tracked in component state and exposed to the UI
- [ ] Reconnection uses exponential backoff with a max retry limit
- [ ] Reconnection always destroys old channel + creates new one + refetches data
- [ ] `visibilitychange` handler verifies channel health before trusting it
- [ ] `visibilitychange` always fetches fresh data (even if channel appears healthy)
- [ ] Realtime events are compared against `lastFetchTimestamp` to prevent stale overwrites
- [ ] Connection status indicator is visible to the user during active sessions

## 6. SmashX-Specific Context

### Files That Touch Realtime
- [App.tsx](file:///Users/APPLE/Desktop/00_Personal/SmashX-2.0/App.tsx) — Lines 95-153: Main Realtime subscription + visibility handler
- [services/supabaseClient.ts](file:///Users/APPLE/Desktop/00_Personal/SmashX-2.0/services/supabaseClient.ts) — Supabase client singleton

### Tables Subscribed To
| Table | Events | Purpose |
|-------|--------|---------|
| `sessions` | INSERT, UPDATE, DELETE | Live scores, court assignments, check-ins, matchups |
| `profiles` | UPDATE | Points, rank frame changes after match results |

### Critical Live Data Fields
These fields change frequently during active sessions and MUST be kept in sync:
- `sessions.court_assignments` — Who is playing on which court
- `sessions.matches` — Match results and scores
- `sessions.checked_in_player_ids` — Who is present
- `sessions.check_in_times` — Queue ordering
- `sessions.next_matchups` — Queued matches
- `profiles.points` — Elo rating (changes after every match)
- `profiles.wins` / `profiles.losses` — Career stats
