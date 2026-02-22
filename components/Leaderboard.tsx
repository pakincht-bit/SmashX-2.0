
import React, { useMemo, useCallback } from 'react';
import { User, Session, MatchResult } from '../types';
import { Trophy, Flame, Frown, Crown } from 'lucide-react';
import { getAvatarColor, getRankFrameClass, getWinRateColor } from '../utils';

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
            className={`bg-[#001645] border ${borderClass} rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden group transition-transform active:scale-95 cursor-pointer hover:bg-[#001c55]`}
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
    onPlayerClick?: (userId: string) => void;
}

// OPTIMIZATION: Extracted LeaderboardRow as memoized component to prevent re-renders of unchanged rows
const LeaderboardRow = React.memo<LeaderboardRowProps>(({ user, index, stats, isMe, onPlayerClick }) => {
    const s = stats;
    let rankColor = "text-gray-400";
    if (index === 0) rankColor = "text-yellow-500";
    if (index === 1) rankColor = "text-gray-300";
    if (index === 2) rankColor = "text-orange-700";

    return (
        <div
            onClick={() => onPlayerClick?.(user.id)}
            className={`p-3 grid grid-cols-[32px_1fr_100px] gap-4 items-center transition-all relative group cursor-pointer
                ${isMe ? 'bg-[#00FF41]/10 border-y border-[#00FF41]/30 z-10' : 'hover:bg-[#001c55]'}`}
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
                        {isMe && <span className="text-[8px] bg-[#00FF41] text-[#000B29] px-1 rounded-sm font-black uppercase tracking-widest italic animate-pulse">YOU</span>}
                    </div>
                    <div className="text-[9px] text-gray-400 mt-1 flex items-center gap-2">
                        <span className="font-bold uppercase tracking-wider">{s.played} Matches</span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-[#00FF41] font-mono font-black text-lg group-hover:scale-110 transition-transform origin-right">
                    <span key={user.points} className="animate-value-update">{user.points}</span>
                </div>
            </div>
        </div>
    );
});

const Leaderboard: React.FC<LeaderboardProps> = ({ users, sessions, onPlayerClick, currentUser }) => {

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

    // OPTIMIZATION: Memoized sortedByPoints to prevent recreation on every render
    const sortedByPoints = useMemo(() =>
        [...users].sort((a, b) => b.points - a.points)
        , [users]);

    // OPTIMIZATION: Stable callback reference for onPlayerClick
    const handlePlayerClick = useCallback((userId: string) => {
        onPlayerClick?.(userId);
    }, [onPlayerClick]);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-2">
                <Trophy className="text-[#00FF41]" size={28} />
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                    Leader<span className="text-[#00FF41]">board</span>
                </h2>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <StatCard
                    title="Most Played"
                    user={mostPlayed}
                    value={stats[mostPlayed?.id ?? '']?.played}
                    icon={<Flame size={40} />}
                    colorClass="text-orange-500"
                    borderClass="border-orange-500/30"
                    unit="Matches"
                    onPlayerClick={handlePlayerClick}
                />
                <StatCard
                    title="Most Wins"
                    user={mostWins}
                    value={stats[mostWins?.id ?? '']?.wins}
                    icon={<Crown size={40} />}
                    colorClass="text-yellow-500"
                    borderClass="border-yellow-500/30"
                    unit="Wins"
                    onPlayerClick={handlePlayerClick}
                />
                <StatCard
                    title="Needs Practice"
                    user={mostLosses}
                    value={stats[mostLosses?.id ?? '']?.losses}
                    icon={<Frown size={40} />}
                    colorClass="text-blue-400"
                    borderClass="border-blue-400/30"
                    unit="Losses"
                    onPlayerClick={handlePlayerClick}
                />
            </div>

            <div className="space-y-3">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-4 flex items-center gap-2">
                    All <span className="text-[#00FF41]">Rankings</span>
                </h3>

                <div className="bg-[#001645] border border-[#002266] rounded-xl overflow-hidden shadow-2xl">
                    <div className="bg-[#000B29] p-3 border-b border-[#002266] grid grid-cols-[32px_1fr_100px] gap-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">#</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Player</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Points</span>
                    </div>

                    <div className="divide-y divide-[#002266]">
                        {sortedByPoints.map((user, index) => (
                            <LeaderboardRow
                                key={user.id}
                                user={user}
                                index={index}
                                stats={stats[user.id]}
                                isMe={user.id === currentUser?.id}
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
