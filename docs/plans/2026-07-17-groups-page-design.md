# Groups Page Design

## Goal
Move player groups off the Arena home page onto a dedicated full-screen page opened from the header.

## Entry
- Home header, right side: icon-only `Users` button
- Opens a Profile-style full-screen overlay

## Page
- Sticky header: back + `Player Groups` title
- Vertical list of groups (name, member count, avatar stack)
- Tap row → existing `GroupManageModal`
- New Group action + empty-state CTA → same create flow
- Arena home no longer renders the groups carousel

## Create flow
1. Select members (searchable checklist; you are auto-included)
2. Name group — name input in the header section; body shows selected members as avatar + name only (no pts)
3. Create Group

## Data
- Reuse existing `playerGroups` state and create/manage/delete handlers in `App.tsx`
- No schema or RPC changes
- Session invite-by-group unchanged
