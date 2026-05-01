
import React, { useMemo, useCallback, useState } from 'react';
import { User, Session, MatchResult } from '../types';
import { Trophy, Flame, Frown, Crown, Swords, Target, Zap, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { getAvatarColor, getRankFrameClass, getWinRateColor, triggerHaptic, mapSessionFromDB } from '../utils';
import { supabase } from '../services/supabaseClient';

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
  timeRange: TimeRange;
}

// OPTIMIZATION: Extracted LeaderboardRow as memoized component to prevent re-renders of unchanged rows
const LeaderboardRow = React.memo<LeaderboardRowProps>(({ user, index, stats, isMe, onPlayerClick, sortCol, timeRange }) => {
  const s = stats;
  let rankColor = "text-gray-400";
  if (index === 0) rankColor = "text-yellow-500";
  if (index === 1) rankColor = "text-gray-300";
  if (index === 2) rankColor = "text-orange-700";

  const winRateStr = s.winRate.toString();

  const pointsDisplay = timeRange === 'monthly' ? (s.points > 0 ? `+${s.points}` : s.points.toString()) : s.points.toString();
  const pointsColor = timeRange === 'monthly' 
    ? (s.points > 0 ? 'text-[#00FF41]' : s.points < 0 ? 'text-red-500' : 'text-white')
    : (sortCol === 'pts' ? 'text-[#00FF41]' : 'text-white');

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
        <span className={`text-sm font-black italic w-14 text-right tabular-nums ${pointsColor}`}>{pointsDisplay}</span>
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
  const [selectedMonthDate, setSelectedMonthDate] = useState(() => new Date());
  const [fetchedSessionsMap, setFetchedSessionsMap] = useState<Record<string, Session[]>>({});
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);

  const handlePrevMonth = useCallback(() => {
    triggerHaptic('light');
    setSelectedMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    triggerHaptic('light');
    setSelectedMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const handleSort = useCallback((col: SortCol) => {
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' });
  }, []);

  const now = new Date();
  const isCurrentMonth = selectedMonthDate.getFullYear() === now.getFullYear() && selectedMonthDate.getMonth() === now.getMonth();
  const isFirstMonth = selectedMonthDate.getFullYear() === 2026 && selectedMonthDate.getMonth() === 0; // Jan 2026
  const formattedMonth = selectedMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Fetch sessions for the selected month dynamically
  React.useEffect(() => {
    if (timeRange !== 'monthly') return;
    const monthKey = `${selectedMonthDate.getFullYear()}-${selectedMonthDate.getMonth()}`;
    if (fetchedSessionsMap[monthKey]) return; // Already fetched

    let isMounted = true;
    const fetchMonthSessions = async () => {
      setIsLoadingMonth(true);
      const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1).toISOString();
      const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .gte('start_time', startOfMonth)
          .lte('start_time', endOfMonth);

        if (!error && data && isMounted) {
          const mapped = data.map(mapSessionFromDB);
          setFetchedSessionsMap(prev => ({ ...prev, [monthKey]: mapped }));
        }
      } catch (err) {
        console.error("Failed to fetch monthly sessions", err);
      } finally {
        if (isMounted) setIsLoadingMonth(false);
      }
    };
    fetchMonthSessions();

    return () => { isMounted = false; };
  }, [selectedMonthDate, timeRange, fetchedSessionsMap]);

  // Filter sessions by time range
  const filteredSessions = useMemo(() => {
    if (timeRange === 'alltime') return sessions;

    const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
    const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthKey = `${selectedMonthDate.getFullYear()}-${selectedMonthDate.getMonth()}`;
    const fetched = fetchedSessionsMap[monthKey] || [];

    // Combine prop sessions (active/recent) with fetched historical sessions, deduping by id
    const allKnownSessions = [...sessions, ...fetched];
    const uniqueSessionsMap = new Map<string, Session>();
    allKnownSessions.forEach(s => uniqueSessionsMap.set(s.id, s));

    return Array.from(uniqueSessionsMap.values()).filter(s => {
      const sessionDate = new Date(s.startTime);
      return sessionDate >= startOfMonth && sessionDate <= endOfMonth;
    });
  }, [sessions, timeRange, selectedMonthDate, fetchedSessionsMap]);

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
        userStats[u.id] = { played: 0, wins: 0, losses: 0, winRate: 0, points: 0 };
      });

      filteredSessions.forEach(session => {
        if (!session.matches) return;
        session.matches.forEach(match => {
          const team1Won = match.winningTeamIndex === 1;
          const winners = team1Won ? match.team1Ids : match.team2Ids;
          const losers = team1Won ? match.team2Ids : match.team1Ids;
          const pc = match.pointsChange || 0;

          winners.forEach(id => {
            if (userStats[id]) {
              userStats[id].played++;
              userStats[id].wins++;
              userStats[id].points += pc;
            }
          });
          losers.forEach(id => {
            if (userStats[id]) {
              userStats[id].played++;
              userStats[id].losses++;
              userStats[id].points -= pc;
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

    // Only display players who have stats (played >= 1 match)
    const usersWithStats = users.filter(u => {
      const s = stats[u.id];
      return s && s.played >= 1;
    });

    const sorted = usersWithStats.sort((a, b) => {
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
            {/* Month Selector */}
            {timeRange === 'monthly' && (
              <div className="flex items-center justify-between px-4 py-2 mb-2 bg-white/5 rounded-lg mx-4">
                <button 
                  onClick={handlePrevMonth} 
                  disabled={isFirstMonth}
                  className={`p-2 transition-colors ${isFirstMonth ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white active:scale-95'}`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#00FF41]">{formattedMonth}</span>
                  {isLoadingMonth && <Loader2 className="w-3 h-3 text-[#00FF41] animate-spin" />}
                </div>
                <button 
                  onClick={handleNextMonth} 
                  disabled={isCurrentMonth} 
                  className={`p-2 transition-colors ${isCurrentMonth ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white active:scale-95'}`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Column Headers */}
            <div className="flex items-center justify-between py-2 px-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 flex-1">Player</span>
              <div className="flex items-center shrink-0">
                {([
                  ['w', 'W', 'w-10'],
                  ['l', 'L', 'w-10'],
                  ['wr', 'WR%', 'w-12'],
                  ['pts', timeRange === 'monthly' ? '+/-' : 'PTS', 'w-14']
                ] as [SortCol, string, string][]).map(([key, label, width]) => (
                  <button
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`text-[9px] font-black uppercase tracking-widest ${width} transition-colors flex items-center gap-0.5 ${
                      key === 'pts' ? 'justify-end text-right' : 'justify-center text-center'
                    } ${sort.col === key ? (key === 'l' ? 'text-red-500' : 'text-[#00FF41]') : 'text-gray-600'}`}
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
                  timeRange={timeRange}
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
