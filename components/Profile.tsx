import React, { useMemo } from 'react';
import { User, Session } from '../types';
import { Settings, Trophy, ChevronRight, LogOut, ArrowLeft } from 'lucide-react';
import { getAvatarColor, getNextTierProgress, triggerHaptic, getWinRateColor, getRankFrameClass } from '../utils';
import { Button } from './ui/Button';

interface ProfileProps {
    user: User;
    sessions: Session[];
    allUsers: User[];
    onOpenSettings: () => void;
    onSessionClick: (sessionId: string) => void;
    onOpenTiers: () => void;
    onOpenInstallGuide: () => void;
    onLogout: () => void;
    onClose: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, sessions, allUsers, onOpenSettings, onOpenTiers, onLogout, onClose }) => {
    const stats = useMemo(() => {
        const wins = user.wins;
        const losses = user.losses;
        const played = wins + losses;
        const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
        let totalDurationMinutes = 0;

        sessions.forEach(session => {
            if (session.finalBill) {
                const item = session.finalBill.items.find(i => i.userId === user.id);
                if (item) totalDurationMinutes += item.durationMinutes;
            }
        });
        return { played, wins, losses, winRate, hoursPlayed: Math.round(totalDurationMinutes / 60) };
    }, [user, sessions]);

    const rankProgression = useMemo(() => getNextTierProgress(user.points), [user.points]);

    const rank = useMemo(() => {
        const sorted = [...allUsers].sort((a, b) => b.points - a.points);
        return sorted.findIndex(u => u.id === user.id) + 1;
    }, [allUsers, user.id]);

    const rankInfo = useMemo(() => {
        const p = user.points;
        const baseClass = "text-[10px] font-bold uppercase tracking-[0.2em]";
        if (p >= 2000) return { name: 'The Ascended', color: `text-yellow-400 ${baseClass}`, dot: 'bg-yellow-400 shadow-[0_0_12px_gold]' };
        if (p >= 1600) return { name: 'The Void', color: `text-purple-400 ${baseClass}`, dot: 'bg-purple-500 shadow-[0_0_12px_#a855f7]' };
        if (p >= 1300) return { name: 'The Combustion', color: `text-orange-400 ${baseClass}`, dot: 'bg-orange-500 shadow-[0_0_12px_#f97316]' };
        if (p >= 1100) return { name: 'The Spark', color: `text-cyan-400 ${baseClass}`, dot: 'bg-cyan-400 shadow-[0_0_12px_#22d3ee]' };
        return { name: 'The Unpolished', color: `text-gray-400 ${baseClass}`, dot: 'bg-gray-500' };
    }, [user.points]);



    return (
        <div className="relative w-full min-h-screen bg-[#000B29] text-white overflow-y-auto pb-20 font-sans">

            {/* Sticky Navigation Header */}
            <div className="sticky top-0 z-50 w-full bg-[#000B29]/90 backdrop-blur border-b border-[#002266] pt-[env(safe-area-inset-top)]">
                <div className="flex items-center gap-3 py-3 px-4 sm:px-6">
                    <button onClick={() => { triggerHaptic('light'); onClose(); }} className="p-2 -ml-2 text-gray-400 hover:text-white rounded-full transition-colors active:scale-95">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center flex-1">
                        <h2 className="text-lg font-black italic uppercase text-white tracking-wider">Player <span className="text-[#00FF41]">Profile</span></h2>
                    </div>
                </div>
            </div>

            {/* Elegant Ambient Background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg aspect-square bg-[#00FF41] rounded-full blur-[160px] opacity-[0.05] pointer-events-none z-0"></div>

            <div className="relative z-10 w-full max-w-xl mx-auto px-6 sm:px-8 pt-8 md:pt-12 animate-fade-in-up flex flex-col items-center min-h-[calc(100dvh-80px)]">

                {/* Header Section with Integrated Progression Border */}
                {/* Avatar Section */}
                <div className="flex flex-col items-center justify-center w-full pb-8 relative">

                    <div className="relative group/avatar mb-4">
                        {/* Dot / Glow */}
                        <div className={`absolute inset-0 ${rankInfo.dot} blur-[16px] opacity-20 transition-opacity duration-700 rounded-full group-hover/avatar:opacity-40`}></div>

                        {/* Avatar */}
                        <div className={`w-28 h-28 relative rounded-full bg-[#001030] shadow-[0_8px_32px_rgba(0,0,0,0.4)] group-hover/avatar:scale-105 transition-transform ${getRankFrameClass(user.rankFrame)}`}>
                            <img
                                src={user.avatar}
                                className="w-full h-full rounded-full object-cover border-[3px] border-[#000B29]"
                                style={{ backgroundColor: getAvatarColor(user.avatar) }}
                                alt={user.name}
                            />
                        </div>

                        {/* Settings Button Overlay */}
                        <button
                            onClick={(e) => { e.stopPropagation(); triggerHaptic('light'); onOpenSettings(); }}
                            className="absolute -top-1 -right-1 p-2.5 bg-[#001645] text-gray-400 hover:text-[#00FF41] hover:bg-[#001030] rounded-full transition-all shadow-[0_8px_32px_rgba(0,0,0,0.6)] active:scale-95 z-20 hover:rotate-45 border-[3px] border-[#000B29]"
                        >
                            <Settings size={18} strokeWidth={2} />
                        </button>
                    </div>

                    {/* Name and Rank */}
                    <div className="flex flex-col items-center justify-center text-center">
                        <h1 className="text-2xl font-black text-white italic tracking-tighter truncate max-w-[280px] mb-1 leading-none">{user.name}</h1>
                        <span className="text-xs font-black uppercase tracking-[0.2em] italic text-gray-400">Rank #{rank}</span>
                    </div>
                </div>

                {/* Clickable Progress Row Card */}
                <div
                    onClick={() => { triggerHaptic('light'); onOpenTiers(); }}
                    className="w-full relative p-5 px-6 mb-6 bg-[#001645] rounded-none border border-white/5 cursor-pointer group active:scale-95 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_32px_rgba(0,255,65,0.15)] flex flex-col gap-4"
                >
                    <style>{`
                        @keyframes pan-stripes {
                            0% { transform: translateX(-40px); }
                            100% { transform: translateX(0); }
                        }
                        .cyber-gauge-container {
                            position: relative;
                            overflow: hidden;
                        }
                        .cyber-gauge-pattern {
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: -40px;
                            bottom: 0;
                            background-image: repeating-linear-gradient(
                                -45deg,
                                rgba(0,0,0,0.3),
                                rgba(0,0,0,0.3) 10px,
                                transparent 10px,
                                transparent 20px
                            );
                            animation: pan-stripes 2s linear infinite;
                            will-change: transform;
                        }
                    `}</style>
                    <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${rankInfo.dot}`}></div>
                            <div className="flex flex-col">
                                <span className={`${rankInfo.color} text-xs leading-none mb-1`}>{rankInfo.name}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic leading-none">
                                    Next: {rankProgression.nextTierName}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black uppercase tracking-widest text-[#00FF41]">
                                {rankProgression.remaining} RP
                            </span>
                            <ChevronRight size={18} className="text-gray-500 group-hover:text-[#00FF41] group-hover:translate-x-1 transition-all" />
                        </div>
                    </div>
                    <div className="w-full h-[14px] bg-[#000B29] rounded-full overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] relative z-0">
                        <div
                            className="h-full bg-gradient-to-r from-[#00A82B] to-[#00FF41] cyber-gauge-container transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(0,255,65,0.4)]"
                            style={{ width: `${Math.max(1, rankProgression.progress)}%` }}
                        >
                            <div className="cyber-gauge-pattern pointer-events-none"></div>
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white blur-[1px] opacity-90 z-10 pointer-events-none"></div>
                        </div>
                    </div>
                </div>

                {/* Static Stats Overview */}
                <div className="w-full mb-12 relative">
                    <div className="grid grid-cols-2 gap-1 relative z-10">
                        {/* Played */}
                        <div className="bg-[#001030] rounded-none p-4 flex flex-col justify-center items-center relative overflow-hidden">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Played</span>
                            <span className="text-4xl tabular-nums font-black italic tracking-tighter text-white">{stats.played}</span>
                        </div>
                        {/* W-L */}
                        <div className="bg-[#001030] rounded-none p-4 flex flex-col justify-center items-center relative overflow-hidden">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">W-L</span>
                            <div className="flex items-center text-4xl font-black italic tracking-tighter leading-none">
                                <span className="text-green-500">{stats.wins}</span>
                                <span className="text-gray-600 mx-1.5">-</span>
                                <span className="text-red-500">{stats.losses}</span>
                            </div>
                        </div>
                        {/* Total Points */}
                        <div className="bg-[#001030] rounded-none p-4 flex flex-col justify-center items-center relative overflow-hidden">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#00FF41] mb-1">Points</span>
                            <span className="text-4xl tabular-nums font-black italic tracking-tighter text-[#00FF41]">{user.points}</span>
                        </div>
                        {/* Win Rate */}
                        <div className="bg-[#001030] rounded-none p-4 flex flex-col justify-center items-center relative overflow-hidden">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#00FF41] mb-1">Win Rate</span>
                            <span className={`text-4xl tabular-nums font-black italic tracking-tighter ${getWinRateColor(stats.winRate)}`}>{stats.winRate}%</span>
                        </div>
                    </div>
                </div>




                {/* Logout Button */}
                <div className="w-full pb-10 flex justify-center mt-auto">
                    <Button
                        type="button"
                        variant="danger"
                        size="md"
                        skewed
                        className="w-full py-4"
                        onClick={() => { triggerHaptic('medium'); onLogout(); }}
                    >
                        <LogOut size={16} /> Log Out
                    </Button>
                </div>

            </div>
        </div>
    );
};

export default Profile;
