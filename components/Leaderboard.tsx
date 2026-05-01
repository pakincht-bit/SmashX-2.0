
import React, { useMemo, useCallback, useState } from 'react';
import { User, Session, MatchResult } from '../types';
import { Trophy, Flame, Frown, Crown, Swords, Target, Zap } from 'lucide-react';
import { getAvatarColor, getRankFrameClass, getWinRateColor, triggerHaptic } from '../utils';

type TimeRange = 'alltime' | 'monthly';
type SortCol = 'pts' | 'w' | 'l' | 'wr';
type SortDir = 'desc' | 'asc';

interface LeaderboardProps {
  users: User[];
  sessions: Session[];
  onPlayerClick?: (userId: string) => void;
  currentUser: User | null;
}

interface UserStats {
  played: number;
  wins: number;
  losses: number;
  winRate: number;
  points: number;
}

interface LeaderboardRowProps {
  user: User;
  index: number;
  stats: UserStats;
  isMe: boolean;
  onPlayerClick?: (userId: string) => void;
  sortCol: SortCol;
}

// OPTIMIZATION: Extracted LeaderboardRow as memoized component to prevent re-renders of unchanged rows
const LeaderboardRow = React.memo<LeaderboardRowProps>(({ user, index, stats, isMe, onPlayerClick, sortCol }) => {
  const s = stats;
  let rankColor = "text-gray-400";
  if (index === 0) rankColor = "text-yellow-500";
  if (index === 1) rankColor = "text-gray-300";
  if (index === 2) rankColor = "text-orange-700";

  const winRateStr = s.winRate.toString();

  return (
    <div
      onClick={() => onPlayerClick?.(user.id)}
      className={`py-3 px-4 flex items-center justify-between cursor-pointer active:bg-white/5 transition-colors group
      ${isMe ? 'bg-[#00FF41]/10 z-10' : ''}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`font-black text-sm italic text-center w-6 shrink-0 ${rankColor}`}>
          {index + 1}
        </div>
        <div className={`relative shrink-0 rounded-full transition-all duration-500 ${getRankFrameClass(user.rankFrame).replace('ring-4', 'ring-2')}`}>
          <img
            src={user.avatar}
            className="w-10 h-10 rounded-full border border-[#000B29] object-cover shrink-0 relative z-10"
            style={{ backgroundColor: getAvatarColor(user.avatar) }}
          />
        </div>
        <div className="min-w-0 flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white leading-none truncate">{user.name}</span>
            {isMe && <span className="text-[8px] bg-[#00FF41] text-[#000B29] px-1 rounded-none font-black uppercase tracking-widest italic animate-pulse">YOU</span>}
          </div>
          <span className="text-[10px] font-bold text-gray-500 mt-1 leading-none">{s.played} matches</span>
        </div>
      </div>

      <div className="flex items-center shrink-0">
        <span className={`text-xs font-bold w-10 text-center ${sortCol === 'w' ? 'text-[#00FF41]' : 'text-white'}`}>{s.wins}</span>
        <span className={`text-xs font-bold w-10 text-center ${sortCol === 'l' ? 'text-red-500' : 'text-white'}`}>{s.losses}</span>
        <span className={`text-xs font-black italic w-12 text-center ${sortCol === 'wr' ? (s.winRate >= 50 ? 'text-[#00FF41]' : 'text-orange-500') : 'text-white'}`}>{winRateStr}%</span>
        <span className={`text-sm font-black italic w-14 text-right tabular-nums ${sortCol === 'pts' ? 'text-[#00FF41]' : 'text-white'}`}>{s.points}</span>
      </div>
    </div>
  );
});

const TIME_TABS: { key: TimeRange; label: string }[] = [
  { key: 'alltime', label: 'All Time' },
  { key: 'monthly', label: 'Monthly' },
];

const Leaderboard: React.FC<LeaderboardProps> = ({ users, sessions, onPlayerClick, currentUser }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('alltime');
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: 'pts', dir: 'desc' });

  const handleSort = useCallback((col: SortCol) => {
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' });
  }, []);

  // Filter sessions by time range
  const filteredSessions = useMemo(() => {
    if (timeRange === 'alltime') return sessions;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return sessions.filter(s => {
      const sessionDate = new Date(s.startTime);
      return sessionDate >= startOfMonth;
    });
  }, [sessions, timeRange]);

  const stats = useMemo(() => {
    const userStats: Record<string, UserStats> = {};

    if (timeRange === 'alltime') {
      // Use materialized wins/losses from profiles (always accurate for all-time)
      users.forEach(u => {
        const wins = u.wins;
        const losses = u.losses;
        const played = wins + losses;
        userStats[u.id] = {
          played,
          wins,
          losses,
          winRate: played > 0 ? Math.round((wins / played) * 100) : 0,
          points: u.points
        };
      });
    } else {
      // Monthly: compute from filtered sessions
      users.forEach(u => {
        userStats[u.id] = { played: 0, wins: 0, losses: 0, winRate: 0, points: u.points };
      });

      filteredSessions.forEach(session => {
        if (!session.matches) return;
        session.matches.forEach(match => {
          const team1Won = match.winningTeamIndex === 1;
          const winners = team1Won ? match.team1Ids : match.team2Ids;
          const losers = team1Won ? match.team2Ids : match.team1Ids;

          winners.forEach(id => {
            if (userStats[id]) {
              userStats[id].played++;
              userStats[id].wins++;
            }
          });
          losers.forEach(id => {
            if (userStats[id]) {
              userStats[id].played++;
              userStats[id].losses++;
            }
          });
        });
      });

      // Compute win rates
      Object.values(userStats).forEach(s => {
        s.winRate = s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0;
      });
    }

    return userStats;
  }, [users, filteredSessions, timeRange]);

  // Sort users based on the selected column
  const sortedUsers = useMemo(() => {
    const getVal = (u: User) => {
      const s = stats[u.id];
      if (!s) return 0;
      switch (sort.col) {
        case 'pts': return s.points;
        case 'w': return s.wins;
        case 'l': return s.losses;
        case 'wr': return s.winRate;
      }
    };

    const sorted = [...users].sort((a, b) => {
      const diff = getVal(b) - getVal(a);
      return sort.dir === 'desc' ? diff : -diff;
    });

    return sorted;
  }, [users, stats, sort]);

  // OPTIMIZATION: Stable callback reference for onPlayerClick
  const handlePlayerClick = useCallback((userId: string) => {
    onPlayerClick?.(userId);
  }, [onPlayerClick]);

  return (
    <div className="space-y-6 animate-fade-in-up">

      <div className="space-y-3">
        <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-4 flex items-center gap-2">
          All <span className="text-[#00FF41]">Rankings</span>
        </h3>

        <div className="-mx-4 flex flex-col w-[calc(100%+2rem)] max-w-[calc(100%+2rem)] lg:-mx-0 lg:w-full lg:max-w-full">
          {/* Time Range Tabs */}
          <div className="flex border-b border-white/10 mb-2 w-full px-4">
            {TIME_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { triggerHaptic('light'); setTimeRange(tab.key); }}
                className={`flex-1 pb-3 pt-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 mb-[-1px]
                ${timeRange === tab.key
                  ? 'text-[#00FF41] border-[#00FF41]'
                  : 'text-gray-500 border-transparent '
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div key={timeRange} className="animate-fade-in-up">
            {/* Column Headers */}
            <div className="flex items-center justify-between py-2 px-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 flex-1">Player</span>
              <div className="flex items-center shrink-0">
                {([['w', 'W', 'w-10'], ['l', 'L', 'w-10'], ['wr', 'WR%', 'w-12'], ['pts', 'PTS', 'w-14']] as const).map(([key, label, width]) => (
                  <button
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`text-[9px] font-black uppercase tracking-widest ${width} text-center transition-colors flex items-center justify-center gap-0.5 ${sort.col === key ? (key === 'l' ? 'text-red-500' : 'text-[#00FF41]') : 'text-gray-600'}`}
                  >
                    {label}
                    {sort.col === key && (
                      <span className="text-[8px]">{sort.dir === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              {sortedUsers.map((user, index) => (
                <LeaderboardRow
                  key={user.id}
                  user={user}
                  index={index}
                  stats={stats[user.id]}
                  isMe={user.id === currentUser?.id}
                  onPlayerClick={handlePlayerClick}
                  sortCol={sort.col}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
