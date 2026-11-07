import { MatchResult, User } from '../types';
import { getPlayerMatchDelta } from '../utils';

const DEFAULT_RATING = 1000;

export type Nemesis = {
  winnerId: string;
  victimId: string;
  wins: number;
  losses: number;
};

export type SessionAward = {
  title: string;
  userId: string;
  detail: string;
  /** Compact form for the scoreboard badges. */
  shortDetail: string;
};

export type MatchEvidence = {
  matchNumber: number;
  winnerIds: string[];
  loserIds: string[];
  /** Loser's average minus winner's, in points. */
  gap: number;
  /** The winners had the lower average. */
  upset: boolean;
};

export type PartnerEvidence = {
  partnerId: string;
  matchNumbers: number[];
};

export type SessionHighlights = {
  nemesis: Nemesis | null;
  awards: SessionAward[];
  evidence: {
    giantKiller: MatchEvidence[];
    carry: PartnerEvidence[];
    nemesis: MatchEvidence[];
  };
};

export type PlayerStanding = { wins: number; losses: number; pointsChange: number };

/**
 * The session ranking: most wins, then most points. The scoreboard and the Points Race both use
 * this, so they always agree. Tied players keep their playerIds order.
 */
export function computeStandings(matches: MatchResult[], playerIds: string[]) {
  const stats: Record<string, PlayerStanding> = {};
  // Initialize for all session players so stats persist after uncheck
  playerIds.forEach(id => { stats[id] = { wins: 0, losses: 0, pointsChange: 0 }; });

  matches.forEach(match => {
    const winnerIds = match.winningTeamIndex === 1 ? match.team1Ids : match.team2Ids;
    const loserIds = match.winningTeamIndex === 1 ? match.team2Ids : match.team1Ids;
    [...winnerIds, ...loserIds].forEach(id => {
      if (!stats[id]) stats[id] = { wins: 0, losses: 0, pointsChange: 0 };
      if (winnerIds.includes(id)) stats[id].wins += 1;
      else stats[id].losses += 1;
      stats[id].pointsChange += getPlayerMatchDelta(match, id);
    });
  });

  const order = Object.keys(stats).sort((a, b) => stats[b].wins - stats[a].wins || stats[b].pointsChange - stats[a].pointsChange);
  return { stats, order };
}

const increment = (counts: Map<string, number>, id: string) => counts.set(id, (counts.get(id) ?? 0) + 1);

/** Player with the highest count; ties go to whoever won more, then alphabetically. */
const topPlayer = (counts: Map<string, number>, wins: Map<string, number>, usersMap: Map<string, User>) =>
  [...counts.entries()]
    .filter(([id, count]) => count > 0 && usersMap.has(id))
    .sort(([a, countA], [b, countB]) =>
      countB - countA
      || (wins.get(b) ?? 0) - (wins.get(a) ?? 0)
      || usersMap.get(a)!.name.localeCompare(usersMap.get(b)!.name))[0];

/**
 * Derive the nemesis, awards and their evidence from a session's matches.
 * Matches don't store ratings, so each player's rating at match time is rebuilt by walking back
 * from their current points. That's exact for their latest session; older sessions are
 * approximate because points earned since then aren't subtracted.
 */
export function computeSessionHighlights(matches: MatchResult[], usersMap: Map<string, User>): SessionHighlights {
  const ratings = new Map<string, number>();
  const ratingOf = (id: string) => ratings.get(id) ?? usersMap.get(id)?.points ?? DEFAULT_RATING;
  const average = (ids: string[]) => ids.reduce((sum, id) => sum + ratingOf(id), 0) / ids.length;
  const teamIds = (match: MatchResult) => [...match.team1Ids, ...match.team2Ids];

  matches.forEach(match => teamIds(match).forEach(id => ratings.set(id, ratingOf(id) - getPlayerMatchDelta(match, id))));

  const wins = new Map<string, number>();
  const upsetWins = new Map<string, number>();
  const partners = new Map<string, Set<string>>();
  const headToHead = new Map<string, number>();
  const matchLog: MatchEvidence[] = [];

  matches.forEach((match, index) => {
    const winnerIds = match.winningTeamIndex === 1 ? match.team1Ids : match.team2Ids;
    const loserIds = match.winningTeamIndex === 1 ? match.team2Ids : match.team1Ids;
    const gap = average(loserIds) - average(winnerIds);
    matchLog.push({ matchNumber: index + 1, winnerIds, loserIds, gap: Math.round(gap), upset: gap > 0 });

    winnerIds.forEach(id => {
      increment(wins, id);
      if (gap > 0) increment(upsetWins, id);
      const wonWith = partners.get(id) ?? new Set<string>();
      winnerIds.filter(other => other !== id).forEach(other => wonWith.add(other));
      partners.set(id, wonWith);
      loserIds.forEach(loser => increment(headToHead, `${id}|${loser}`));
    });

    teamIds(match).forEach(id => ratings.set(id, ratingOf(id) + getPlayerMatchDelta(match, id)));
  });

  // A nemesis needs a real pattern: at least two wins, and ahead on the head-to-head
  let nemesis: Nemesis | null = null;
  headToHead.forEach((pairWins, key) => {
    const [winnerId, victimId] = key.split('|');
    if (!usersMap.has(winnerId) || !usersMap.has(victimId)) return;
    const losses = headToHead.get(`${victimId}|${winnerId}`) ?? 0;
    const lead = pairWins - losses;
    if (pairWins < 2 || lead < 1) return;
    const currentLead = nemesis ? nemesis.wins - nemesis.losses : 0;
    if (lead > currentLead || (lead === currentLead && pairWins > (nemesis?.wins ?? 0))) {
      nemesis = { winnerId, victimId, wins: pairWins, losses };
    }
  });

  const partnerCounts = new Map([...partners].map(([id, set]) => [id, set.size]));
  const awards: SessionAward[] = [];
  const addAward = (title: string, counts: Map<string, number>, describe: (count: number) => string, shorten: (count: number) => string) => {
    const top = topPlayer(counts, wins, usersMap);
    if (top) awards.push({ title, userId: top[0], detail: describe(top[1]), shortDetail: shorten(top[1]) });
  };
  const plural = (n: number, word: string, plural = `${word}s`) => `${n} ${n === 1 ? word : plural}`;

  addAward('Giant Killer', upsetWins, n => `${plural(n, 'win')} over higher-rated teams`, n => plural(n, 'upset'));
  addAward('Carry', partnerCounts, n => `Won with ${n} different ${n === 1 ? 'partner' : 'partners'}`, n => plural(n, 'partner'));

  const awardWinner = (title: string) => awards.find(award => award.title === title)?.userId;
  const giantKillerId = awardWinner('Giant Killer');
  const carryId = awardWinner('Carry');
  const rivals = nemesis as Nemesis | null;

  const carry = [...(carryId ? partners.get(carryId) ?? [] : [])]
    .map(partnerId => ({
      partnerId,
      matchNumbers: matchLog.filter(m => m.winnerIds.includes(carryId!) && m.winnerIds.includes(partnerId)).map(m => m.matchNumber),
    }))
    .sort((a, b) => b.matchNumbers.length - a.matchNumbers.length);

  return {
    nemesis,
    awards,
    evidence: {
      giantKiller: matchLog.filter(m => m.upset && m.winnerIds.includes(giantKillerId ?? '')),
      carry,
      nemesis: rivals
        ? matchLog.filter(m =>
            (m.winnerIds.includes(rivals.winnerId) && m.loserIds.includes(rivals.victimId))
            || (m.winnerIds.includes(rivals.victimId) && m.loserIds.includes(rivals.winnerId)))
        : [],
    },
  };
}
