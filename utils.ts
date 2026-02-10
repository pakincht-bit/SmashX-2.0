
import { User, Session, MatchResult, NextMatchup } from './types';

export const generateId = (): string => Math.random().toString(36).substring(2, 9);

export const calculateMaxPlayers = (courtCount: number): number => courtCount * 6;

export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
};

export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

export const getDateParts = (isoString: string) => {
  const date = new Date(isoString);
  return {
    month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase(),
    day: new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(date),
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date).toUpperCase(),
  };
};

export const getFrameByPoints = (points: number): string => {
  if (points >= 3000) return 'ascended';
  if (points >= 2500) return 'void';
  if (points >= 2000) return 'prism';
  if (points >= 1600) return 'combustion';
  if (points >= 1300) return 'flow';
  if (points >= 1100) return 'spark';
  return 'unpolished';
};

export const getRankFrameClass = (frame: string | undefined): string => {
  const base = "ring-offset-2 ring-offset-[#000B29]";
  switch (frame) {
    case 'unpolished':
      return `${base} rank-unpolished ring-zinc-700`;
    case 'spark':
      return `${base} rank-spark ring-cyan-500`;
    case 'flow':
      return `${base} rank-flow ring-slate-200`;
    case 'combustion':
      return `${base} rank-combustion ring-orange-500 animate-pulse`;
    case 'prism':
      return `${base} rank-prism ring-purple-400`;
    case 'void':
      return `${base} rank-void ring-purple-950`;
    case 'ascended':
      return `${base} rank-ascended ring-white`;
    default:
      return 'ring-0';
  }
};

export const getWinRateColor = (winRate: number): string => {
  if (winRate >= 70) return '#00FF41'; // Elite (Green)
  if (winRate >= 55) return '#facc15'; // Strong (Yellow)
  if (winRate >= 45) return '#22d3ee'; // Average (Cyan)
  return '#ef4444'; // Struggling (Red)
};

export const getPerformanceGrade = (points: number, winRate: number): { grade: string; color: string } => {
  const normalizedPoints = points / 1000;
  const score = (normalizedPoints * 15) + (winRate / 2);

  if (score >= 75) return { grade: 'S+', color: 'text-[#00FF41]' };
  if (score >= 60) return { grade: 'S', color: 'text-yellow-400' };
  if (score >= 50) return { grade: 'A', color: 'text-white' };
  if (score >= 40) return { grade: 'B', color: 'text-blue-300' };
  return { grade: 'C', color: 'text-gray-500' };
};

export const getNextTierProgress = (points: number) => {
  const tiers = [
    { id: 'unpolished', min: 0, max: 1099, next: 'spark' },
    { id: 'spark', min: 1100, max: 1299, next: 'flow' },
    { id: 'flow', min: 1300, max: 1599, next: 'combustion' },
    { id: 'combustion', min: 1600, max: 1999, next: 'prism' },
    { id: 'prism', min: 2000, max: 2499, next: 'void' },
    { id: 'void', min: 2500, max: 2999, next: 'ascended' },
    { id: 'ascended', min: 3000, max: Infinity, next: null },
  ];

  const currentTier = tiers.find(t => points >= t.min && points <= t.max);
  if (!currentTier || !currentTier.next) return { progress: 100, remaining: 0, nextTierName: 'Max' };

  const nextTier = tiers.find(t => t.id === currentTier.next)!;
  const totalInTier = nextTier.min - currentTier.min;
  const progressInTier = points - currentTier.min;
  const progress = Math.min(100, Math.max(0, (progressInTier / totalInTier) * 100));
  const remaining = nextTier.min - points;

  return {
    progress,
    remaining,
    nextTierName: nextTier.id.charAt(0).toUpperCase() + nextTier.id.slice(1)
  };
};

export const mapProfileFromDB = (dbProfile: any): User => ({
  id: dbProfile.id,
  name: dbProfile.name,
  avatar: dbProfile.avatar,
  points: dbProfile.points || dbProfile.mmr || 1000,
  rankFrame: dbProfile.rank_frame || 'none',
});

export const mapSessionFromDB = (dbSession: any): Session => ({
  id: dbSession.id,
  title: dbSession.title,
  location: dbSession.location,
  startTime: dbSession.start_time,
  endTime: dbSession.end_time,
  courtCount: dbSession.court_count,
  maxPlayers: dbSession.max_players,
  hostId: dbSession.host_id,
  playerIds: dbSession.player_ids || [],
  checkedInPlayerIds: dbSession.checked_in_player_ids || [],
  checkInTimes: dbSession.check_in_times || {},
  courtAssignments: dbSession.court_assignments || {},
  matchStartTimes: dbSession.match_start_times || {},
  matches: dbSession.matches || [],
  nextMatchups: dbSession.next_matchups || [],
  finalBill: dbSession.final_bill,
  started: dbSession.started || (dbSession.checked_in_player_ids && dbSession.checked_in_player_ids.length > 0) || false
});

export const getAvatarColor = (identifier: string): string => {
  const colors = ['#1e1b4b', '#312e81', '#4c1d95', '#581c87', '#701a75', '#831843', '#881337', '#7f1d1d', '#7c2d12', '#78350f', '#14532d', '#064e3b', '#134e4a', '#164e63', '#0c4a6e', '#1e3a8a'];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export const getSmartMatchSuggestion = (
  allUsers: User[],
  checkedInIds: string[],
  assignments: Record<number, string[]>,
  courtIndex: number,
  matches: MatchResult[]
): string[] => {
  const assignedToOtherCourts = new Set<string>();
  Object.entries(assignments).forEach(([idx, ids]) => {
    if (parseInt(idx) !== courtIndex) {
      ids.forEach(id => assignedToOtherCourts.add(id));
    }
  });

  const availableIds = checkedInIds.filter(id => !assignedToOtherCourts.has(id));

  const playCounts: Record<string, number> = {};
  availableIds.forEach(id => {
    playCounts[id] = matches.filter(m =>
      m.team1Ids.includes(id) || m.team2Ids.includes(id)
    ).length;
  });

  // Track recency: higher index = more recent match
  const lastPlayedIndex: Record<string, number> = {};
  matches.forEach((m, idx) => {
    [...m.team1Ids, ...m.team2Ids].forEach(id => {
      lastPlayedIndex[id] = idx;
    });
  });

  // Sort by: fewest games first, then earliest last-played first
  const sorted = [...availableIds].sort((a, b) => {
    const countDiff = playCounts[a] - playCounts[b];
    if (countDiff !== 0) return countDiff;
    return (lastPlayedIndex[a] ?? -1) - (lastPlayedIndex[b] ?? -1);
  });

  const selected = sorted.slice(0, 4);

  // Avoid repeating the exact last matchup if possible
  if (matches.length > 0 && selected.length === 4) {
    const lastMatch = matches[matches.length - 1];
    const lastSet = new Set([...lastMatch.team1Ids, ...lastMatch.team2Ids]);
    const selectedSet = new Set(selected);

    // If the selected 4 are exactly the same people as the last match
    if (selected.every(id => lastSet.has(id)) && lastSet.size === selectedSet.size) {
      // Swap one selected player with next available player
      const remaining = sorted.slice(4);
      if (remaining.length > 0) {
        selected[3] = remaining[0];
      }
    }
  }

  return selected;
};

/**
 * Triggers a haptic feedback vibration.
 * Safe to call in any environment as it checks for browser support.
 */
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') => {
  if (typeof window === 'undefined' || !window.navigator || !window.navigator.vibrate) {
    return;
  }

  switch (type) {
    case 'light':
      window.navigator.vibrate(10);
      break;
    case 'medium':
      window.navigator.vibrate(25);
      break;
    case 'heavy':
      window.navigator.vibrate(60);
      break;
    case 'success':
      window.navigator.vibrate([15, 30, 15]);
      break;
    case 'error':
      window.navigator.vibrate([40, 60, 40, 60]);
      break;
  }
};

// ============================================
// SMART QUEUE SYSTEM
// ============================================

export interface QueuedPlayer {
  id: string;
  waitingSince: Date;
  currentlyPlaying: boolean;
  courtIndex?: number;
  position: number; // Queue position (1-indexed)
}

const POOL_SIZE = 6;
const RECENT_MATCH_THRESHOLD = 3;

/**
 * Calculate the queue of players sorted by wait time (longest waiting first)
 * Universal queue includes both players on court and those waiting
 */
export const calculateQueue = (session: Session): QueuedPlayer[] => {
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
        courtIndex: playingPlayers[pid].courtIndex,
        position: 0 // Will be set after sorting
      });
    } else {
      // Not playing - use check-in time
      const checkInTime = session.checkInTimes?.[pid];
      queue.push({
        id: pid,
        waitingSince: checkInTime ? new Date(checkInTime) : new Date(),
        currentlyPlaying: false,
        position: 0
      });
    }
  });

  // Sort by waitingSince (oldest first = highest priority)
  queue.sort((a, b) => a.waitingSince.getTime() - b.waitingSince.getTime());

  // Assign positions
  queue.forEach((player, index) => {
    player.position = index + 1;
  });

  return queue;
};

/**
 * Get available players (not currently on a court)
 */
export const getAvailablePlayers = (queue: QueuedPlayer[]): QueuedPlayer[] => {
  return queue.filter(p => !p.currentlyPlaying);
};

/**
 * Get the top N players from the available queue (Pool)
 */
export const getPool = (queue: QueuedPlayer[], size: number = POOL_SIZE): QueuedPlayer[] => {
  return getAvailablePlayers(queue).slice(0, size);
};

/**
 * Check if two players were teammates in recent matches
 */
export const wereRecentTeammates = (
  player1: string,
  player2: string,
  matches: MatchResult[],
  threshold: number = RECENT_MATCH_THRESHOLD
): boolean => {
  const recentMatches = matches.slice(-threshold);
  return recentMatches.some(m =>
    (m.team1Ids.includes(player1) && m.team1Ids.includes(player2)) ||
    (m.team2Ids.includes(player1) && m.team2Ids.includes(player2))
  );
};

/**
 * Get all recent teammate pairs from the pool
 */
export const getRecentTeammatePairs = (
  playerIds: string[],
  matches: MatchResult[],
  threshold: number = RECENT_MATCH_THRESHOLD
): [string, string][] => {
  const pairs: [string, string][] = [];
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      if (wereRecentTeammates(playerIds[i], playerIds[j], matches, threshold)) {
        pairs.push([playerIds[i], playerIds[j]]);
      }
    }
  }
  return pairs;
};

/**
 * Calculate variety score for a group of players
 * Lower score = more variety (fewer recent teammates)
 */
export const getVarietyScore = (
  playerIds: string[],
  matches: MatchResult[],
  threshold: number = RECENT_MATCH_THRESHOLD
): number => {
  let score = 0;
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      if (wereRecentTeammates(playerIds[i], playerIds[j], matches, threshold)) {
        score += 1;
      }
    }
  }
  return score;
};

/**
 * Generate all combinations of size k from an array
 */
const getCombinations = <T>(arr: T[], k: number): T[][] => {
  if (k === 0) return [[]];
  if (arr.length < k) return [];

  const result: T[][] = [];

  const combine = (start: number, combo: T[]) => {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  };

  combine(0, []);
  return result;
};

/**
 * Select the best 4 players from the pool that maximize variety
 * Uses combinatorial optimization to find the group with lowest variety score
 */
export const selectBestFourFromPool = (
  poolPlayerIds: string[],
  matches: MatchResult[]
): string[] => {
  if (poolPlayerIds.length <= 4) {
    return poolPlayerIds;
  }

  // Generate all combinations of 4 from pool
  const combinations = getCombinations(poolPlayerIds, 4);

  if (combinations.length === 0) {
    return poolPlayerIds.slice(0, 4);
  }

  // Find combination with lowest variety score
  let bestCombination = combinations[0];
  let bestScore = getVarietyScore(bestCombination, matches);

  for (const combo of combinations) {
    const score = getVarietyScore(combo, matches);
    if (score < bestScore) {
      bestScore = score;
      bestCombination = combo;
    }
  }

  return bestCombination;
};

/**
 * Smart match suggestion using the new queue-based Pool Selection algorithm
 * Replaces the old getSmartMatchSuggestion with improved variety handling
 */
export const getSmartMatchSuggestionV2 = (
  session: Session,
  courtIndex: number
): string[] => {
  const queue = calculateQueue(session);
  const pool = getPool(queue, POOL_SIZE);
  const poolIds = pool.map(p => p.id);

  if (poolIds.length < 4) {
    // Not enough players waiting, include players from other courts
    // (they're already in queue sorted by match start time)
    const allSorted = queue.map(p => p.id);

    // Exclude players on the court we're assigning to
    const currentCourtPlayers = session.courtAssignments?.[courtIndex] || [];
    const available = allSorted.filter(id => !currentCourtPlayers.includes(id));

    return selectBestFourFromPool(available.slice(0, POOL_SIZE), session.matches || []);
  }

  return selectBestFourFromPool(poolIds, session.matches || []);
};

/**
 * Format wait time as human readable string
 */
export const formatWaitTime = (waitingSince: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - waitingSince.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 min';
  if (diffMins < 60) return `${diffMins} mins`;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
};
