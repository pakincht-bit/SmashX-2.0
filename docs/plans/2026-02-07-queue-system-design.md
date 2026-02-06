# Smart Queue System Design

## Problem Statement

เมื่อเล่น badminton session ยาว มีปัญหา 2 อย่าง:

1. **คู่ซ้ำ** - Teammate และ Matchup เดิมซ้ำบ่อย
2. **จัดคนลงคอร์ตช้า** - Auto suggestion ปัจจุบันไม่ดีพอ ต้อง manual แก้บ่อย

## Goals (Priority Order)

1. **Fairness** - ทุกคนได้เล่นเท่าๆ กัน (สำคัญสุด)
2. **Variety** - หลากหลาย ไม่ซ้ำ teammate/matchup
3. **Speed** - จัดคู่เร็ว ไม่มี dead time
4. **Balance** - ทีม Balanced (ให้ความสำคัญน้อยสุด)

---

## Solution: Smart Queue System

### Core Concept

**Universal Queue + Pool Selection**

- ทุกคน (รวมคนบนคอร์ต) อยู่ใน Queue เดียวกัน
- Sort ตาม "match start time" (คนที่เริ่มเล่นนานสุดอยู่บน)
- เมื่อต้องจัดคอร์ตใหม่ → ดึง Top 6 มาเป็น Pool → เลือก 4 คนที่ maximize variety

---

## Data Structure Changes

### Session Type (เพิ่ม)

```typescript
interface Session {
  // ... existing fields

  // NEW: Track when each player's current/last match started
  matchStartTimes?: Record<string, string>; // Map courtIndex -> ISO timestamp (existing, ใช้ต่อ)
  
  // For queue calculation, we derive from:
  // - courtAssignments (who is on which court)
  // - matchStartTimes (when each court started)
  // - checkedInPlayerIds (who is available)
}
```

### Queue Calculation

```typescript
interface QueuedPlayer {
  id: string;
  waitingSince: Date;      // When their last match ended OR when they checked in
  currentlyPlaying: boolean;
  courtIndex?: number;     // If playing, which court
}

const calculateQueue = (session: Session): QueuedPlayer[] => {
  const queue: QueuedPlayer[] = [];
  const checkedInIds = session.checkedInPlayerIds || [];
  const assignments = session.courtAssignments || {};
  const startTimes = session.matchStartTimes || {};

  // Build set of players currently on court
  const playingPlayers: Record<string, { courtIndex: number; startTime: Date }> = {};
  Object.entries(assignments).forEach(([courtIdx, playerIds]) => {
    const courtStartTime = startTimes[parseInt(courtIdx)];
    (playerIds as string[]).forEach(pid => {
      playingPlayers[pid] = {
        courtIndex: parseInt(courtIdx),
        startTime: courtStartTime ? new Date(courtStartTime) : new Date()
      };
    });
  });

  // Add all checked-in players to queue
  checkedInIds.forEach(pid => {
    if (playingPlayers[pid]) {
      // Currently playing - use match start time
      queue.push({
        id: pid,
        waitingSince: playingPlayers[pid].startTime,
        currentlyPlaying: true,
        courtIndex: playingPlayers[pid].courtIndex
      });
    } else {
      // Not playing - use check-in time or last match end
      const checkInTime = session.checkInTimes?.[pid];
      queue.push({
        id: pid,
        waitingSince: checkInTime ? new Date(checkInTime) : new Date(),
        currentlyPlaying: false
      });
    }
  });

  // Sort by waitingSince (oldest first)
  queue.sort((a, b) => a.waitingSince.getTime() - b.waitingSince.getTime());

  return queue;
};
```

---

## Pool Selection Algorithm

```typescript
const POOL_SIZE = 6;
const RECENT_MATCH_THRESHOLD = 3;

const selectBestFourFromPool = (
  pool: string[],           // Top 6 player IDs from queue
  allUsers: User[],
  recentMatches: MatchResult[]  // Last 3 matches only
): string[] => {
  
  // Helper: Check if two players were teammates recently
  const wereRecentTeammates = (p1: string, p2: string): boolean => {
    return recentMatches.some(m =>
      (m.team1Ids.includes(p1) && m.team1Ids.includes(p2)) ||
      (m.team2Ids.includes(p1) && m.team2Ids.includes(p2))
    );
  };

  // Helper: Calculate "variety score" for a group of 4
  // Lower = more variety (fewer recent teammates)
  const getVarietyScore = (four: string[]): number => {
    let score = 0;
    // Check all pairs
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        if (wereRecentTeammates(four[i], four[j])) {
          score += 1;
        }
      }
    }
    return score;
  };

  // Generate all combinations of 4 from pool
  const combinations = getCombinations(pool, 4);
  
  // Find combination with lowest variety score
  let bestCombination = combinations[0];
  let bestScore = getVarietyScore(bestCombination);

  for (const combo of combinations) {
    const score = getVarietyScore(combo);
    if (score < bestScore) {
      bestScore = score;
      bestCombination = combo;
    }
  }

  return bestCombination;
};
```

---

## UI Design

### 1. Queue Display (New Section)

Location: Below Courts, Above Check-In List

```
┌─────────────────────────────────────────────┐
│ ⏳ UP NEXT                      6 in queue  │
├─────────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐   │
│ │  NEXT MATCH (Pool)                    │   │
│ │  [👤 Alice]  [👤 Bob]  [👤 Carol]     │   │
│ │  [👤 Dave]   [👤 Eve]  [👤 Frank]     │   │
│ │                                       │   │
│ │  ⚠️ Alice + Bob: played together     │   │  ← Warning (if any)
│ │     in last 3 games                   │   │
│ │                                       │   │
│ │  [🎯 Auto Select Best 4]              │   │  ← Main action button
│ └───────────────────────────────────────┘   │
│                                             │
│ ─ ─ ─ Also waiting ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│ 7. [👤 Grace]  8 mins                       │
│ 8. [👤 Henry]  5 mins                       │
└─────────────────────────────────────────────┘
```

### 2. Warning Display

Show warning only if recent (last 3 games) teammate pair exists in the suggested selection:

```
┌─────────────────────────────────────────────┐
│ ⚠️ Alice + Bob played together recently    │
│    (1 game ago)                             │
└─────────────────────────────────────────────┘
```

### 3. Court Assignment Flow (Updated)

**Current Flow:**
1. Click empty court → Opens player selection modal
2. Manually pick 4 players or click Randomize

**New Flow:**
1. Click empty court → Shows pre-selected 4 from Pool
2. Can swap any player with another from queue
3. Click "Start Match" to confirm

---

## Implementation Plan

### Phase 1: Core Queue Logic
- [ ] Add `calculateQueue()` function to `utils.ts`
- [ ] Update `getSmartMatchSuggestion()` to use Pool Selection algorithm
- [ ] Add `getRecentMatches()` helper (last N matches)
- [ ] Add `getVarietyScore()` helper

### Phase 2: Queue UI
- [ ] Create new `QueueDisplay` component
- [ ] Add "Up Next" section to `SessionDetailModal`
- [ ] Show waiting time for each player
- [ ] Highlight Top 6 as "Pool"

### Phase 3: Warning System
- [ ] Add `checkRecentTeammates()` helper
- [ ] Show warning banner when recent duplicates detected
- [ ] Only warn for last 3 games

### Phase 4: Court Assignment UX
- [ ] Update court click to show pre-selected players
- [ ] Add quick swap UI (tap to swap with queue member)
- [ ] Add "Auto Select Best 4" button

---

## Edge Cases

### Not Enough Players in Queue
- If < 4 players waiting and courts have players → Include players from oldest running match in the Pool
- System will naturally suggest them as they've been "playing longest"

### Everyone Recently Played Together
- If no combination has variety score of 0, pick the one with lowest score
- Warning can show but doesn't block assignment

### Player Leaves Mid-Session
- Remove from queue
- If on court, match continues with remaining players
- Recalculate queue when match ends

---

## Success Metrics

1. **Fairness**: Standard deviation of games played per player should be ≤ 1
2. **Variety**: Average games before repeating a teammate should be ≥ 3
3. **Speed**: Time to assign court after game ends should be < 10 seconds

---

## Confirmed Features

### ✅ Queue Visibility
- ทุกคนเห็น queue position ของตัวเอง
- แสดงเลขลำดับและเวลาที่รอ
- Player รู้ว่าตัวเองอยู่คิวที่เท่าไหร่

### ✅ Decline to Play
- เมื่อถูก suggest ให้ลงคอร์ต player สามารถ "Decline" ได้
- เมื่อ decline: ถูกย้ายไปท้ายคิว (resetเวลารอ)
- UI: ปุ่ม "Skip Turn" ข้าง player chip ใน Pool

```
┌─────────────────────────────────────────────┐
│  NEXT MATCH (Pool)                          │
│  [👤 Alice ✓] [👤 Bob ⏭] [👤 Carol ✓]       │  ← Bob กด Skip
│  [👤 Dave ✓]  [👤 Eve →]  [👤 Frank ✓]      │  ← Eve ขยับขึ้นมาแทน
└─────────────────────────────────────────────┘
```

## Open Questions (Deferred)

1. ควร track variety metrics ให้ Host ดู post-session ไหม? (Future enhancement)
