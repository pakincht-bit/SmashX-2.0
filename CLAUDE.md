# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Type-check then build to dist/
npm run preview   # Preview production build locally
```

There is no test suite or linter configured.

## Architecture

**SmashX** is a React/TypeScript PWA for organizing and gamifying badminton sessions among friend groups. It uses Supabase for auth, a PostgreSQL database, and real-time subscriptions.

### State Management

All global state lives in `App.tsx` as `useState`/`useRef` hooks — there is no external state library. `App.tsx` owns:
- `sessions` — active/upcoming sessions (last 24h window)
- `pastSessions` — on-demand loaded history
- `users` — all player profiles
- `currentUser` / `activeUser` — the logged-in player

`activeUser` is a memoized merge of `currentUser` and the live `users` array, ensuring the logged-in player always reflects real-time leaderboard updates.

### Data Flow Pattern (Critical)

Every mutating action follows the same pattern:
1. **Optimistic update** — `setSessions(prev => ...)` immediately
2. **Supabase write** — update/insert/rpc call
3. **Rollback on error** — restore `previousSessions` if the call fails

Match result recording (`handleRecordMatchResult`) is the exception: it uses the `record_match_result` Supabase RPC to atomically update sessions + player stats, then refetches all profiles. The same pattern applies to `undo_match_result`.

### Realtime Sync

A single Supabase channel (`public:all-changes`) subscribes to all `sessions` and `profiles` changes. The channel is created in `createRealtimeChannel()` and managed by a `useEffect` tied to `isAuthenticated`. Key behaviors:
- **Fetch guard**: realtime events older than `lastFetchRef.current` are ignored to prevent stale overwrites.
- **Exponential backoff reconnection**: up to 5 retries via `scheduleReconnection()`.
- **Visibility change handler**: every time the app tab becomes visible, it fetches fresh data regardless of channel health.
- `mutatingRef` is a `Set<string>` of lock keys (e.g. `join-{sessionId}`) to prevent double-submits.

### Session Lifecycle

`Session` objects transition through states stored as fields (not an explicit enum):
- **Open**: `started === false/undefined`, players can join/leave
- **Live**: `started === true`, check-in active, court assignments tracked in `courtAssignments: Record<number, string[]>`
- **Ended**: `finalBill` is set

The queue system (`calculateQueue`, `getAvailablePlayers` from `utils.ts`) determines rotation order based on `checkInTimes`.

### Ranking System

Players start at 1,000 RP. Each match awards ±25 points. Points are **stored in the `profiles` table** — not recalculated client-side from match history. `getFrameByPoints()` in `utils.ts` maps points to tier names: `unpolished → spark → flow → combustion → prism → void → ascended`.

### Component Loading

Heavy components are lazy-loaded via `React.lazy()` in `App.tsx`. All lazy components are wrapped in `<Suspense>`. The `SessionDetailModal` is the core game-loop UI (check-in, court assignment, match recording, billing).

### DB Mapping

Supabase uses snake_case columns; TypeScript uses camelCase. `mapSessionFromDB()` and `mapProfileFromDB()` in `utils.ts` handle translation. When adding new DB columns, update both the SQL migration in `migrations/` and the relevant mapper function.

### Authentication

Login uses email derived from username: `${name.replace(/\s/g, '').toLowerCase()}@example.com`. This is intentional — the app uses display names, not emails, as the user-facing identifier.

### Design System

- Background: `#000B29` (Deep Navy)
- Accent: `#00FF41` (Neon Green)
- Cards/surfaces: `#001645`
- Typography: `font-black italic uppercase tracking-tighter` for headings
- Buttons: flat, `-skew-x-12` italic style, no border-radius (`rounded-none`)
- Haptics: `triggerHaptic()` from `utils.ts` wraps `navigator.vibrate` — call on all interactive actions
