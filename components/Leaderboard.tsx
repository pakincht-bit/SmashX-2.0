
import React, { useMemo, useCallback, useState } from 'react';
import { User, Session, MatchResult } from '../types';
import { Trophy, Flame, Frown, Crown, Swords, Target, Zap } from 'lucide-react';
import { getAvatarColor, getRankFrameClass, getWinRateColor, triggerHaptic } from '../utils';

type SortMode = 'points' | 'matches' | 'winrate';

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
 streak: {
 type: 'win' | 'loss' | 'none';
 count: number;
 };
}

interface StatCardProps {
 title: string;
 user: User | null;
 value: number | undefined;
 icon: React.ReactNode;
 colorClass: string;
 borderClass: string;
 unit: string;
 onPlayerClick?: (userId: string) => void;
}

// OPTIMIZATION: Extracted StatCard outside component and memoized to prevent recreation on every render
const StatCard = React.memo<StatCardProps>(({ title, user, value, icon, colorClass, borderClass, unit, onPlayerClick }) => {
 if (!user) return null;
 return (
 <div
 onClick={() => onPlayerClick?.(user.id)}
 className={`bg-[#001645] border ${borderClass} rounded-none p-3 flex flex-col items-center justify-center relative overflow-hidden group transition-transform active:scale-95 cursor-pointer `}
 >
 <div className={`absolute -right-3 -bottom-3 opacity-10 ${colorClass} transform rotate-12 scale-150 pointer-events-none`}>
 {icon}
 </div>

 <div className="relative z-10 flex flex-col items-center w-full">
 <div className={`text-[8px] font-black uppercase tracking-widest ${colorClass} mb-2 text-center h-5 flex items-center justify-center leading-tight`}>{title}</div>

 <div className="relative mb-3">
 <div className={`rounded-full transition-all duration-500 overflow-hidden ${getRankFrameClass(user.rankFrame).replace('ring-4', 'ring-2')}`}>
 <img
 src={user.avatar}
 className={`w-10 h-10 rounded-full border border-[#000B29] object-cover`}
 style={{ backgroundColor: getAvatarColor(user.avatar) }}
 />
 </div>
 </div>

 <div className="text-white font-bold text-[10px] mb-2 text-center truncate w-full px-1">{user.name}</div>

 <div className="text-center bg-[#000B29]/30 w-full rounded py-1 border border-white/5">
 <div className="text-xl font-black italic tracking-tighter text-white leading-none">
 <span key={value} className="animate-value-update">{value}</span>
 </div>
 <div className="text-[7px] text-gray-400 font-bold uppercase tracking-widest">{unit}</div>
 </div>
 </div>
 </div>
 );
});

interface LeaderboardRowProps {
 user: User;
 index: number;
 stats: UserStats;
 isMe: boolean;
 sortMode: SortMode;
 onPlayerClick?: (userId: string) => void;
}

// OPTIMIZATION: Extracted LeaderboardRow as memoized component to prevent re-renders of unchanged rows
const LeaderboardRow = React.memo<LeaderboardRowProps>(({ user, index, stats, isMe, sortMode, onPlayerClick }) => {
 const s = stats;
 let rankColor = "text-gray-400";
 if (index === 0) rankColor = "text-yellow-500";
 if (index === 1) rankColor = "text-gray-300";
 if (index === 2) rankColor = "text-orange-700";

 const renderValue = () => {
 switch (sortMode) {
 case 'points':
 return (
 <div className="text-[#00FF41] font-mono font-black text-lg transition-transform origin-right">
 <span key={user.points} className="animate-value-update">{user.points}</span>
 </div>
 );
 case 'matches':
 return (
 <div className="flex flex-col items-end">
 <div className="font-mono font-black text-lg text-white leading-none transition-transform origin-right">
 <span key={s.played} className="animate-value-update">{s.played}</span>
 </div>
 <div className="text-[9px] font-bold mt-0.5">
 <span className="text-green-500">{s.wins}W</span>
 <span className="text-gray-600 mx-0.5">-</span>
 <span className="text-red-500">{s.losses}L</span>
 </div>
 </div>
 );
 case 'winrate':
 return (
 <div className="flex flex-col items-end">
 <div className={`font-mono font-black text-lg leading-none transition-transform origin-right ${getWinRateColor(s.winRate)}`}>
 <span key={s.winRate} className="animate-value-update">{s.winRate}%</span>
 </div>
 <div className="text-[9px] text-gray-500 font-bold mt-0.5">
 {s.played} played
 </div>
 </div>
 );
 }
 };

 return (
 <div
 onClick={() => onPlayerClick?.(user.id)}
 className={`py-3 px-4 grid grid-cols-[28px_1fr_auto] gap-3 items-center transition-all relative group cursor-pointer
 ${isMe ? 'bg-[#00FF41]/10 border-y border-[#00FF41]/10 z-10' : ''}`}
 >
 <div className={`font-black text-sm italic text-center ${rankColor}`}>
 {index + 1}
 </div>
 <div className="flex items-center gap-4">
 <div className="relative shrink-0">
 <div className={`rounded-full transition-all duration-500 ${getRankFrameClass(user.rankFrame).replace('ring-4', 'ring-2')}`}>
 <img
 src={user.avatar}
 className="w-10 h-10 rounded-full border border-[#000B29] object-cover"
 style={{ backgroundColor: getAvatarColor(user.avatar) }}
 />
 </div>
 </div>
 <div className="min-w-0">
 <div className="text-sm font-bold text-white leading-none flex items-center gap-2">
 <span className="truncate">{user.name}</span>
 {isMe && <span className="text-[8px] bg-[#00FF41] text-[#000B29] px-1 rounded-none font-black uppercase tracking-widest italic animate-pulse">YOU</span>}
 </div>
 <div className="text-[9px] mt-1 flex items-center gap-2">
 {sortMode === 'points' ? (
 <>
 <span className="font-bold uppercase tracking-wider text-gray-400">{s.played} Matches</span>
 <span className="text-[#002266] font-bold">•</span>
 <span className={`font-black uppercase tracking-wider ${getWinRateColor(s.winRate)}`}>{s.winRate}% WR</span>
 </>
 ) : sortMode === 'matches' ? (
 <>
 <span className="font-bold uppercase tracking-wider text-[#00FF41]">{user.points} Pts</span>
 <span className="text-[#002266] font-bold">•</span>
 <span className={`font-black uppercase tracking-wider ${getWinRateColor(s.winRate)}`}>{s.winRate}% WR</span>
 </>
 ) : (
 <>
 <span className="font-bold uppercase tracking-wider text-[#00FF41]">{user.points} Pts</span>
 <span className="text-[#002266] font-bold">•</span>
 <span className="font-bold uppercase tracking-wider text-gray-400">{s.wins}W - {s.losses}L</span>
 </>
 )}
 </div>
 </div>
 </div>
 <div className="text-right">
 {renderValue()}
 </div>
 </div>
 );
});

const SORT_TABS: { key: SortMode; label: string; headerLabel: string }[] = [
 { key: 'points', label: 'Points', headerLabel: 'Points' },
 { key: 'matches', label: 'Matches', headerLabel: 'W-L' },
 { key: 'winrate', label: 'Win Rate', headerLabel: 'Win Rate' },
];

const Leaderboard: React.FC<LeaderboardProps> = ({ users, sessions, onPlayerClick, currentUser }) => {
 const [sortMode, setSortMode] = useState<SortMode>('points');

 const stats = useMemo(() => {
 const userStats: Record<string, UserStats> = {};

 // Use materialized wins/losses from profiles (always accurate)
 users.forEach(u => {
 const wins = u.wins;
 const losses = u.losses;
 const played = wins + losses;
 userStats[u.id] = {
 played,
 wins,
 losses,
 winRate: played > 0 ? Math.round((wins / played) * 100) : 0,
 streak: { type: 'none', count: 0 }
 };
 });

 // Still compute streaks from loaded sessions (streaks are inherently recent-only)
 const allMatches: { match: MatchResult; sessionTime: string }[] = [];
 sessions.forEach(session => {
 if (!session.matches) return;
 session.matches.forEach(match => {
 allMatches.push({ match, sessionTime: match.timestamp || session.startTime });
 });
 });

 allMatches.sort((a, b) => new Date(a.sessionTime).getTime() - new Date(b.sessionTime).getTime());

 users.forEach(user => {
 const userMatches = allMatches.filter(({ match }) =>
 match.team1Ids.includes(user.id) || match.team2Ids.includes(user.id)
 ).reverse();

 if (userMatches.length === 0) return;

 let currentStreakType: 'win' | 'loss' | 'none' = 'none';
 let count = 0;

 for (let i = 0; i < userMatches.length; i++) {
 const { match } = userMatches[i];
 const winners = match.winningTeamIndex === 1 ? match.team1Ids : match.team2Ids;
 const isWin = winners.includes(user.id);
 const type = isWin ? 'win' : 'loss';

 if (i === 0) {
 currentStreakType = type;
 count = 1;
 } else if (type === currentStreakType) {
 count++;
 } else {
 break;
 }
 }

 userStats[user.id].streak = { type: currentStreakType, count };
 });

 return userStats;
 }, [users, sessions]);

 // Optimized: Single O(n) pass instead of 3 separate sorts
 const { mostPlayed, mostWins, mostLosses } = useMemo(() => {
 if (users.length === 0) return { mostPlayed: null, mostWins: null, mostLosses: null };

 let played = users[0];
 let wins = users[0];
 let losses = users[0];

 for (const user of users) {
 const s = stats[user.id];
 if (s.played > stats[played.id].played) played = user;
 if (s.wins > stats[wins.id].wins) wins = user;
 if (s.losses > stats[losses.id].losses) losses = user;
 }

 return { mostPlayed: played, mostWins: wins, mostLosses: losses };
 }, [users, stats]);

 // Sort users based on the selected sort mode
 const sortedUsers = useMemo(() => {
 switch (sortMode) {
 case 'points':
 return [...users].sort((a, b) => b.points - a.points);
 case 'matches':
 return [...users].sort((a, b) => {
 const diff = stats[b.id].played - stats[a.id].played;
 return diff !== 0 ? diff : stats[b.id].wins - stats[a.id].wins;
 });
 case 'winrate':
 return [...users].sort((a, b) => {
 const diff = stats[b.id].winRate - stats[a.id].winRate;
 return diff !== 0 ? diff : stats[b.id].played - stats[a.id].played;
 });
 }
 }, [users, stats, sortMode]);

 // OPTIMIZATION: Stable callback reference for onPlayerClick
 const handlePlayerClick = useCallback((userId: string) => {
 onPlayerClick?.(userId);
 }, [onPlayerClick]);

 const activeTab = SORT_TABS.find(t => t.key === sortMode)!;

 return (
 <div className="space-y-6 animate-fade-in-up">


 <div className="space-y-3">
 <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-4 flex items-center gap-2">
 All <span className="text-[#00FF41]">Rankings</span>
 </h3>

 <div className="-mx-4 flex flex-col w-[calc(100%+2rem)] max-w-[calc(100%+2rem)] lg:-mx-0 lg:w-full lg:max-w-full">
 {/* Sort Tabs */}
 <div className="flex border-b border-white/10 mb-2 w-full px-4">
 {SORT_TABS.map(tab => (
 <button
 key={tab.key}
 onClick={() => { triggerHaptic('light'); setSortMode(tab.key); }}
 className={`flex-1 pb-3 pt-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 mb-[-1px]
 ${sortMode === tab.key
 ? 'text-[#00FF41] border-[#00FF41]'
 : 'text-gray-500 border-transparent '
 }`}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* Table Header */}
 <div className="py-2 px-4 border-b border-[#002266] grid grid-cols-[28px_1fr_auto] gap-3">
 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">#</span>
 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Player</span>
 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">{activeTab.headerLabel}</span>
 </div>

 <div className="divide-y divide-[#002266]">
 {sortedUsers.map((user, index) => (
 <LeaderboardRow
 key={user.id}
 user={user}
 index={index}
 stats={stats[user.id]}
 isMe={user.id === currentUser?.id}
 sortMode={sortMode}
 onPlayerClick={handlePlayerClick}
 />
 ))}
 </div>
 </div>
 </div>
 </div>
 );
};

export default Leaderboard;
