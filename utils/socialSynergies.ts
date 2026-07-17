import { Session, User } from '../types';

export type PartnerStat = {
  playedWith: number;
  wonWith: number;
  playedAgainst: number;
  lostAgainst: number;
};

export type SynergyPlayer = {
  user: User;
  stat: PartnerStat;
  winRate?: number;
};

type Ranked = { id: string; stat: PartnerStat; winRate?: number };

/**
 * Derive Social Synergies (Most Played, Best Duo, Most Wins, Most Losses)
 * from match history — same scoring as StatsPage.
 */
export function computeSocialSynergies(
  sessions: Session[],
  currentUserId: string,
  allUsers: User[]
): {
  frequentDuo: SynergyPlayer | null;
  duoPartner: SynergyPlayer | null;
  easyTarget: SynergyPlayer | null;
  archNemesis: SynergyPlayer | null;
} {
  const stats: Record<string, PartnerStat> = {};

  sessions.forEach((session) => {
    (session.matches || []).forEach((match) => {
      const isTeam1 = match.team1Ids.includes(currentUserId);
      const isTeam2 = match.team2Ids.includes(currentUserId);
      if (!isTeam1 && !isTeam2) return;

      const team1Won = match.winningTeamIndex === 1;
      const iWon = (isTeam1 && team1Won) || (isTeam2 && !team1Won);
      const myTeam = isTeam1 ? match.team1Ids : match.team2Ids;
      const enemyTeam = isTeam1 ? match.team2Ids : match.team1Ids;

      myTeam.forEach((id) => {
        if (id === currentUserId) return;
        if (!stats[id]) stats[id] = { playedWith: 0, wonWith: 0, playedAgainst: 0, lostAgainst: 0 };
        stats[id].playedWith++;
        if (iWon) stats[id].wonWith++;
      });

      enemyTeam.forEach((id) => {
        if (!stats[id]) stats[id] = { playedWith: 0, wonWith: 0, playedAgainst: 0, lostAgainst: 0 };
        stats[id].playedAgainst++;
        if (!iWon) stats[id].lostAgainst++;
      });
    });
  });

  let bestDuo: Ranked | null = null;
  let maxDuoScore = -1;
  let freqDuo: Ranked | null = null;
  let maxFreqPlayed = -1;
  let worstEnemy: Ranked | null = null;
  let maxNemesisScore = -1;
  let bestTarget: Ranked | null = null;
  let maxTargetWins = -1;

  for (const [id, s] of Object.entries(stats)) {
    if (s.playedWith > 0) {
      const winRate = s.wonWith / s.playedWith;
      const score = winRate * 100 + s.wonWith;
      if (score > maxDuoScore) {
        maxDuoScore = score;
        bestDuo = { id, stat: s, winRate };
      }
      if (s.playedWith > maxFreqPlayed) {
        maxFreqPlayed = s.playedWith;
        freqDuo = { id, stat: s, winRate };
      }
    }

    if (s.playedAgainst > 0) {
      if (s.lostAgainst > maxNemesisScore) {
        maxNemesisScore = s.lostAgainst;
        worstEnemy = { id, stat: s };
      }
      const wonAgainst = s.playedAgainst - s.lostAgainst;
      if (wonAgainst > maxTargetWins) {
        maxTargetWins = wonAgainst;
        bestTarget = {
          id,
          stat: s,
          winRate: s.playedAgainst > 0 ? wonAgainst / s.playedAgainst : 0,
        };
      }
    }
  }

  const resolve = (data: Ranked | null): SynergyPlayer | null => {
    if (!data) return null;
    const user = allUsers.find((u) => u.id === data.id);
    return user ? { user, stat: data.stat, winRate: data.winRate } : null;
  };

  return {
    frequentDuo: resolve(freqDuo),
    duoPartner: resolve(bestDuo),
    easyTarget: resolve(bestTarget),
    archNemesis: resolve(worstEnemy),
  };
}
