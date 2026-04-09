---
name: data-consistency
description: "Multi-user data consistency rules for SmashX. Use this skill when implementing mutations, optimistic updates, conflict resolution, or any code where multiple users can modify the same data simultaneously. Prevents divergent state across devices."
---

# Multi-User Data Consistency — SmashX Rules

> Two phones showing different scores is a critical bug, not an edge case.

## When to Apply

Reference these rules when:
- Writing or modifying any Supabase mutation (insert, update, delete, RPC)
- Implementing optimistic updates for any user action
- Handling Realtime `UPDATE` events that may conflict with local state
- Debugging issues where users see different data on different devices
- Working on match recording, court assignments, check-ins, or queue management

## 1. Server-Authoritative State (CRITICAL)

### Rule: The server is ALWAYS the source of truth
After every mutation, the goal is to make local state match the server — not the other way around.

### When Realtime delivers state that conflicts with your optimistic update:
- **Server wins. Always.** Replace local state with the server version.
- If the user's action was overridden (e.g., someone else assigned a court first), show a brief toast: "Updated by another player"
- Never "merge" local and server state — this creates Franken-state that neither user intended

### Anti-Pattern: Preserving Local State Over Server
```tsx
// ❌ WRONG: Keeping local state when server says null
if ((payload.new.next_matchups === null) && s.nextMatchups?.length > 0) {
  newSession.nextMatchups = s.nextMatchups; // DANGER: masking server state
}

// ✅ CORRECT: Trust the server
const newSession = mapSessionFromDB(payload.new);
// Server said next_matchups is null? Then it IS null.
return newSession;
```

## 2. Optimistic Update Lifecycle (CRITICAL)

### Rule: Every optimistic update must follow the 4-step lifecycle

```
┌──────────────────────────────────────────────────────┐
│  1. SNAPSHOT    → Save previous state for rollback   │
│  2. OPTIMISTIC  → Apply update to local state        │
│  3. MUTATE      → Send mutation to Supabase          │
│  4. RECONCILE   → On Realtime echo: replace with     │
│                   server state. On error: rollback.   │
│                   On timeout (10s): refetch.          │
└──────────────────────────────────────────────────────┘
```

### Mandatory Pattern
```tsx
const handleAction = useCallback(async (sessionId: string, /* params */) => {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;

  // 1. SNAPSHOT — save for rollback
  const previousSessions = sessions;

  // 2. OPTIMISTIC — immediate UI feedback
  setSessions(prev => prev.map(s => s.id === sessionId ? {
    ...s,
    /* optimistic changes */
  } : s));

  try {
    // 3. MUTATE — send to server
    const { error } = await supabase.from('sessions').update({
      /* server-format changes */
    }).eq('id', sessionId);

    if (error) throw error;

    // 4. RECONCILE — Realtime will deliver the server echo.
    // The Realtime handler replaces local state with server state.
    // If no Realtime echo within 10s, trigger manual refetch.

  } catch (err) {
    // ROLLBACK on error
    setSessions(previousSessions);
    showToast("Action failed", true);
  }
}, [sessions, showToast]);
```

### Reconciliation Timeout
If no Realtime echo arrives within 10 seconds of a mutation, assume the channel missed it and refetch:

```tsx
// After successful mutation:
const reconcileTimeout = setTimeout(() => {
  console.log('SX: No Realtime echo received, refetching...');
  fetchData();
}, 10000);

// In Realtime handler, when you receive the echo for this mutation:
clearTimeout(reconcileTimeout);
```

## 3. Atomic Operations (HIGH)

### Rule: Multi-table mutations MUST use Supabase RPC
Never do sequential client-side mutations across tables. They can partially fail, leaving the database in an inconsistent state.

### SmashX Examples
| Operation | Tables Affected | Solution |
|-----------|----------------|----------|
| Record match result | `sessions` (matches array) + `profiles` (points, wins, losses) | ✅ Use `record_match_result` RPC |
| End session with billing | `sessions` (final_bill) | ✅ Single table — direct update OK |
| Join session | `sessions` (player_ids) | ✅ Single table — direct update OK |

### When to Create a New RPC
If your mutation needs to update **2+ tables** or needs **read-then-write** atomicity (e.g., "add to array only if not already present"), create a Supabase RPC function.

```sql
-- Example: Atomic join with duplicate guard
CREATE OR REPLACE FUNCTION join_session(p_session_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sessions
  SET player_ids = array_append(player_ids, p_user_id)
  WHERE id = p_session_id
    AND NOT (p_user_id = ANY(player_ids));  -- Prevent duplicates
END;
$$ LANGUAGE plpgsql;
```

## 4. Race Condition Guards (MEDIUM)

### Rule: Debounce rapid mutations to the same resource
When a user taps a button rapidly (e.g., check-in toggle), multiple mutations can fire before the first one completes.

### Mandatory Pattern: Mutation Lock
```tsx
const mutatingRef = useRef<Set<string>>(new Set());

const handleCheckInToggle = useCallback(async (sessionId: string, playerId: string) => {
  const lockKey = `checkin-${sessionId}-${playerId}`;
  if (mutatingRef.current.has(lockKey)) return; // Already in flight

  mutatingRef.current.add(lockKey);
  try {
    // ... optimistic update + mutation ...
  } finally {
    mutatingRef.current.delete(lockKey);
  }
}, [/* deps */]);
```

### Scope
Apply mutation locks to these high-frequency actions:
- Check-in / check-out toggle
- Join / leave session
- Court assignment
- Skip turn
- Record match result (most critical — double-recording corrupts stats)

## 5. Stale State Detection (MEDIUM)

### Rule: Periodically verify freshness during active sessions
During a live session (status = `PLAYING`), silently compare local state with the server every 30 seconds.

```tsx
useEffect(() => {
  if (!activeSessionId || sessionStatus !== 'PLAYING') return;

  const interval = setInterval(async () => {
    const { data } = await supabase
      .from('sessions')
      .select('updated_at, matches')
      .eq('id', activeSessionId)
      .single();

    if (data) {
      const serverMatchCount = (data.matches || []).length;
      const localMatchCount = (localSession?.matches || []).length;

      if (serverMatchCount !== localMatchCount) {
        console.log('SX: Stale state detected, refetching...');
        await fetchData();
      }
    }
  }, 30000);

  return () => clearInterval(interval);
}, [activeSessionId, sessionStatus]);
```

## 6. Mandatory Code Checklist

When writing or reviewing any mutation code:

- [ ] Previous state is saved before optimistic update (for rollback)
- [ ] Optimistic update is applied immediately to local state
- [ ] Server mutation is awaited with error handling
- [ ] On error: local state is rolled back to snapshot
- [ ] On success: Realtime handler replaces optimistic state with server state
- [ ] Multi-table mutations use Supabase RPC (not sequential client calls)
- [ ] Rapid taps are guarded by a mutation lock (ref-based Set)
- [ ] No local state is preserved over server state (no "preservation hacks")
- [ ] User is notified if their action was overridden by another user

## 7. SmashX-Specific Context

### High-Contention Operations
These operations are most likely to have concurrent users and need extra care:
1. **Record Match Result** — Host presses "Team 1 Wins" while a player refreshes → double recording
2. **Court Assignment** — Two users try to assign different players to the same court
3. **Check-in Toggle** — Host rapidly checking in multiple players
4. **Queue Match** — Two users add the same matchup simultaneously

### Files That Contain Mutations
- [App.tsx](file:///Users/APPLE/Desktop/00_Personal/SmashX-2.0/App.tsx) — All mutation handlers (handleJoin, handleLeave, handleCheckInToggle, handleRecordMatchResult, handleCourtAssignment, etc.)
- [migrations/003_record_match_result_rpc.sql](file:///Users/APPLE/Desktop/00_Personal/SmashX-2.0/migrations/003_record_match_result_rpc.sql) — Atomic match recording RPC
