import { Session } from '../types';
import { mapSessionFromDB } from '../utils';
import { supabase } from './supabaseClient';

/** Module-level cache for all-time player sessions (shared by Stats + Profile). */
let globalAllTimeSessions: Session[] | null = null;
let globalAllTimeSessionsUserId: string | null = null;
let globalAllTimeSessionsFetchTime = 0;

const CACHE_TTL_MS = 5 * 60 * 1000;

export function getCachedAllTimeSessions(userId: string): Session[] | null {
  if (globalAllTimeSessions && globalAllTimeSessionsUserId === userId) {
    return globalAllTimeSessions;
  }
  return null;
}

export function isAllTimeSessionsCacheFresh(userId: string): boolean {
  return (
    !!globalAllTimeSessions &&
    globalAllTimeSessionsUserId === userId &&
    Date.now() - globalAllTimeSessionsFetchTime < CACHE_TTL_MS
  );
}

export async function fetchAllTimeSessions(userId: string): Promise<Session[]> {
  if (isAllTimeSessionsCacheFresh(userId) && globalAllTimeSessions) {
    return globalAllTimeSessions;
  }

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .contains('player_ids', [userId]);

  if (error) throw error;

  const mapped = (data || []).map(mapSessionFromDB);
  globalAllTimeSessions = mapped;
  globalAllTimeSessionsUserId = userId;
  globalAllTimeSessionsFetchTime = Date.now();
  return mapped;
}

/** Merge all-time history with live App sessions so recent matches aren't missed. */
export function mergeSessionsWithLive(
  allTimeSessions: Session[],
  liveSessions: Session[]
): Session[] {
  const sessionMap = new Map<string, Session>();
  allTimeSessions.forEach((s) => sessionMap.set(s.id, s));
  liveSessions.forEach((s) => sessionMap.set(s.id, s));
  return Array.from(sessionMap.values());
}
