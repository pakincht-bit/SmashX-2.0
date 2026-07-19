# Ranks Group Filter

## Goal
On the Ranks tab, let the user filter the leaderboard to members of one group they belong to.

## UX
- Horizontal group chips under All Time / Monthly tabs (invite-style: sharp edges, neon when active).
- Default: no filter (full leaderboard).
- Tap a group → show only that group’s members; tap again → clear.
- One group at a time.
- Time range and column sort still apply.
- Keep `played >= 1` so members with no matches stay hidden.
- Hide chip row when the user has no groups.
- Empty filtered list: “No ranked matches in this group”.

## Implementation
- Pass `playerGroups` from `App.tsx` into `Leaderboard`.
- Local `groupFilterId` state; filter `users` before sort.
- Do not use `GroupLeaderboardModal` for this path.
