
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { User, Session } from '../types';
import { Pencil, Clock, Smartphone, Target, Trophy, Swords, Zap, ChevronRight, LogOut } from 'lucide-react';
import { getAvatarColor, formatTime, getRankFrameClass, getDateParts, getNextTierProgress, triggerHaptic } from '../utils';

interface ProfileProps {
    user: User;
    sessions: Session[];
    allUsers: User[];
    onOpenSettings: () => void;
    onSessionClick: (sessionId: string) => void;
    onOpenTiers: () => void;
    onOpenInstallGuide: () => void;
    onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, sessions, allUsers, onOpenSettings, onSessionClick, onOpenTiers, onOpenInstallGuide, onLogout }) => {
    const [isStandalone, setIsStandalone] = useState(true);

    useEffect(() => {
        const checkStandalone = () => {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true;
            setIsStandalone(isStandaloneMode);
        };
        checkStandalone();
    }, []);

    const stats = useMemo(() => {
        let played = 0;
        let wins = 0;
        let losses = 0;
        let totalDurationMinutes = 0;

        sessions.forEach(session => {
            if (session.matches) {
                session.matches.forEach(match => {
                    const winners = match.winningTeamIndex === 1 ? match.team1Ids : match.team2Ids;
                    const losers = match.winningTeamIndex === 1 ? match.team2Ids : match.team1Ids;
                    if (winners.includes(user.id)) { played++; wins++; }
                    if (losers.includes(user.id)) { played++; losses++; }
                });
            }
            if (session.finalBill) {
                const item = session.finalBill.items.find(i => i.userId === user.id);
                if (item) totalDurationMinutes += item.durationMinutes;
            }
        });
        return { played, wins, losses, hoursPlayed: Math.round(totalDurationMinutes / 60) };
    }, [user, sessions]);

    const rankProgression = useMemo(() => getNextTierProgress(user.points), [user.points]);

    const rank = useMemo(() => {
        const sorted = [...allUsers].sort((a, b) => b.points - a.points);
        return sorted.findIndex(u => u.id === user.id) + 1;
    }, [allUsers, user.id]);

    const rankInfo = useMemo(() => {
        const p = user.points;
        if (p >= 2000) return { name: 'The Ascended', color: 'text-yellow-400', dot: 'bg-yellow-400 shadow-[0_0_8px_gold]' };
        if (p >= 1600) return { name: 'The Void', color: 'text-purple-500', dot: 'bg-purple-900 shadow-[0_0_8px_#581c87]' };
        if (p >= 1300) return { name: 'The Combustion', color: 'text-orange-500', dot: 'bg-orange-600' };
        if (p >= 1100) return { name: 'The Spark', color: 'text-cyan-400', dot: 'bg-cyan-400 shadow-[0_0_5px_#22d3ee]' };
        return { name: 'The Unpolished', color: 'text-gray-400', dot: 'bg-gray-600' };
    }, [user.points]);

    const sessionHistory = useMemo(() => {
        const now = new Date();
        return sessions
            .filter(s => s.playerIds.includes(user.id))
            .filter(s => !!s.finalBill || new Date(s.endTime) < now)
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    }, [sessions, user.id]);

    const getSessionUserStats = useCallback((session: Session) => {
        let wins = 0; let losses = 0; let pointsChange = 0;
        if (session.matches) {
            session.matches.forEach(match => {
                const isTeam1 = match.team1Ids.includes(user.id);
                const isTeam2 = match.team2Ids.includes(user.id);
                if (!isTeam1 && !isTeam2) return;
                const isWin = (isTeam1 && match.winningTeamIndex === 1) || (isTeam2 && match.winningTeamIndex === 2);
                if (isWin) { wins++; pointsChange += match.pointsChange; } else { losses++; pointsChange -= match.pointsChange; }
            });
        }
        return { wins, losses, pointsChange };
    }, [user.id]);

    const handleLogoutWithHaptic = useCallback(() => {
        triggerHaptic('medium');
        onLogout();
    }, [onLogout]);

    return (
        <div className="space-y-6 animate-fade-in-up pb-10">
            {/* Compact Profile Card */}
            <div className="relative bg-[#001645] border border-[#002266] rounded-2xl overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#00FF41] rounded-full filter blur-[100px] opacity-5 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <div className="p-4 sm:p-5">
                    {/* Header Row: Avatar + Name/Rank + Actions */}
                    <div className="flex items-center gap-4 mb-5">
                        <div className="relative shrink-0">
                            <div className={`w-16 h-16 rounded-full p-0.5 shadow-lg transition-all duration-500 ${getRankFrameClass(user.rankFrame)}`}>
                                <img src={user.avatar} className="w-full h-full rounded-full border-2 border-[#000B29] object-cover relative z-10" style={{ backgroundColor: getAvatarColor(user.avatar) }} alt={user.name} />
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-black text-white italic tracking-tighter truncate leading-none mb-1">{user.name}</h2>
                            <div className={`flex items-center gap-1.5 ${rankInfo.color}`}>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] italic truncate">{rankInfo.name}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button onClick={onOpenSettings} className="p-2 bg-[#000B29] border border-[#002266] rounded-lg text-gray-400 hover:text-white transition-all active:scale-90">
                                <Pencil size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-3 mb-5">
                        <div className=" border-r border-[#002266] flex flex-col items-center">
                            <span className="text-sm font-black text-white italic">#{rank}</span>
                            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mt-1">Arena Rank</span>
                        </div>
                        <div className=" border-r border-[#002266] flex flex-col items-center">
                            <span className="text-sm font-black text-[#00FF41] font-mono">{user.points}</span>
                            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mt-1">Points</span>
                        </div>
                        <div className=" flex flex-col items-center">
                            <div className="text-sm font-black italic flex">
                                <span className="text-green-400">{stats.wins}</span>
                                <span className="text-gray-500 mx-0.5">/</span>
                                <span className="text-red-400">{stats.losses}</span>
                            </div>
                            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mt-1">W/L Record</span>
                        </div>
                    </div>

                    {/* Thin Progression Bar */}
                    <div
                        onClick={() => { triggerHaptic('light'); onOpenTiers(); }}
                        className="bg-[#000B29] border border-[#002266] hover:border-[#00FF41]/30 rounded-xl p-3 cursor-pointer transition-all active:scale-[0.98] group"
                    >
                        <div className="flex justify-between items-center mb-1.5 px-1">
                            <div className="flex items-center gap-1.5">
                                <Trophy size={10} className="text-[#00FF41] group-hover:scale-110 transition-transform" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">Next: {rankProgression.nextTierName}</span>
                                <ChevronRight size={10} className="text-gray-600 group-hover:text-[#00FF41] transition-colors" />
                            </div>
                            <span className="text-[8px] font-black text-[#00FF41] uppercase tracking-widest">{rankProgression.remaining} To Go</span>
                        </div>
                        <div className="relative h-1.5 bg-[#001645] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#00FF41] to-teal-400 transition-all duration-1000 shadow-[0_0_8px_rgba(0,255,65,0.3)]"
                                style={{ width: `${rankProgression.progress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-2">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-4 flex items-center gap-2">
                    Session <span className="text-[#00FF41]">History</span>
                    <span className="bg-[#002266] text-[#00FF41] text-[10px] px-2 py-0.5 rounded-full font-mono ml-2 not-italic tracking-normal">
                        {sessionHistory.length}
                    </span>
                </h3>
                {sessionHistory.length === 0 ? (
                    <div className="text-center py-10 bg-[#001645]/50 border border-[#002266] border-dashed rounded-xl">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No sessions logged yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {sessionHistory.map(session => {
                            const sStats = getSessionUserStats(session);
                            const isGain = sStats.pointsChange >= 0;
                            const { day, month } = getDateParts(session.startTime);
                            return (
                                <div key={session.id} onClick={() => onSessionClick(session.id)} className="cursor-pointer bg-[#001645] border border-[#002266] hover:border-[#00FF41]/40 rounded-lg p-3 transition-all hover:bg-[#001c55] group flex items-center gap-4 shadow-sm">
                                    <div className="flex flex-col items-center justify-center min-w-[36px] bg-[#000B29] rounded py-1.5 border border-[#002266] shadow-inner shrink-0">
                                        <span className="text-[7px] font-black uppercase tracking-widest text-gray-500 leading-none mb-0.5">{month}</span>
                                        <span className="text-sm font-black text-white leading-none tracking-tighter">{day}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-xs font-black text-white group-hover:text-[#00FF41] transition-colors truncate mb-0.5 uppercase tracking-tight">{session.title || session.location}</h4>
                                        <div className="flex items-center text-[9px] text-gray-400 font-bold uppercase tracking-[0.1em]">
                                            <Clock size={8} className="mr-1 text-[#00FF41]/40" />
                                            <span>{formatTime(session.startTime)}</span>
                                            <span className="mx-2 opacity-30">•</span>
                                            <span className="truncate">{session.location}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="flex items-center text-[10px] font-black italic">
                                            <span className="text-green-500">{sStats.wins}W</span>
                                            <span className="text-gray-500 mx-0.5">/</span>
                                            <span className="text-red-500">{sStats.losses}L</span>
                                        </div>
                                        <div className={`flex items-center justify-center w-[52px] py-1.5 rounded text-[9px] font-mono font-black ${isGain ? 'text-[#00FF41] bg-[#00FF41]/10 border border-[#00FF41]/20' : 'text-red-500 bg-red-500/10 border border-red-500/20'}`}>
                                            {isGain ? '+' : ''}{sStats.pointsChange}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
