import React, { useState, useCallback } from 'react';
import { Session, User } from '../types';
import { formatTime, getDateParts, triggerHaptic } from '../utils';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from './ui/Button';

interface SessionCardProps {
    session: Session;
    currentUser: User;
    allUsers: User[]; // Keep this for compatibility if passed
    onDelete: (sessionId: string) => void;
    onClick: (sessionId: string) => void;
}

const AUTO_END_GRACE_PERIOD_MS = 30 * 60 * 1000;

const SessionCard: React.FC<SessionCardProps> = React.memo(({
    session,
    currentUser,
    allUsers = [], // Provide default empty array
    onClick
}) => {
    const { month, day, weekday } = getDateParts(session.startTime);
    const isJoined = session.playerIds.includes(currentUser.id);

    const getSessionStatus = () => {
        if (session.finalBill) return 'END';
        const now = new Date();
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        const endWithGrace = new Date(end.getTime() + AUTO_END_GRACE_PERIOD_MS);

        if (now > endWithGrace) return 'END';
        if (session.started || (now >= start && now <= endWithGrace)) return 'PLAYING';
        if (isJoined) return 'JOINED';
        return 'OPEN';
    };

    const status = getSessionStatus();

    const renderBouncingAvatars = () => {
        const joinedPlayers = session.playerIds.map(id => allUsers.find(u => u.id === id)).filter(Boolean) as User[];
        if (joinedPlayers.length === 0) return null;

        // Show up to 5 players
        const displayPlayers = joinedPlayers.slice(0, 5);

        // Scattered positions on the right side of the card
        const configs = [
            { top: '15%', right: '5%', size: 'w-10 h-10', delay: '0s', duration: '3s', zIndex: 10 },
            { top: '35%', right: '25%', size: 'w-12 h-12', delay: '0.4s', duration: '3.5s', zIndex: 12 },
            { top: '10%', right: '40%', size: 'w-8 h-8', delay: '0.8s', duration: '2.8s', zIndex: 8 },
            { top: '65%', right: '12%', size: 'w-10 h-10', delay: '0.2s', duration: '4s', zIndex: 11 },
            { top: '55%', right: '35%', size: 'w-9 h-9', delay: '0.6s', duration: '3.2s', zIndex: 9 },
        ];

        return (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {displayPlayers.map((player, index) => {
                    const conf = configs[index];
                    return (
                        <div
                            key={player.id}
                            className={`absolute animate-bounce rounded-full border-2 border-[#000B29] overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.5)] ${conf.size}`}
                            style={{
                                top: conf.top,
                                right: conf.right,
                                zIndex: conf.zIndex,
                                animationDuration: conf.duration,
                                animationDelay: conf.delay,
                            }}
                        >
                            <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderTopBadges = () => {
        const badges = [];

        if (status === 'END') {
            badges.push(
                <div key="end" className="px-3 py-1.5 rounded-full bg-gray-900/80 backdrop-blur text-gray-400 text-[11px] font-black uppercase flex items-center gap-1.5 shadow-lg border border-gray-700">
                    Ended
                </div>
            );
        } else if (status === 'PLAYING') {
            badges.push(
                <div key="live" className="px-3 py-1.5 rounded-full bg-red-500 text-white text-[11px] font-black uppercase flex items-center gap-1.5 shadow-lg shadow-red-500/30 border border-red-400">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div> Live
                </div>
            );
        }

        return badges;
    };



    return (
        <div
            onClick={() => {
                triggerHaptic('light');
                onClick(session.id);
            }}
            className="flex flex-col bg-[#1A1C23] rounded-none overflow-hidden cursor-pointer group hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300 w-full"
        >
            {/* Top Banner Area */}
            <div className="relative w-full bg-gradient-to-br from-[#002266] to-[#000B29] p-4 flex flex-col justify-between overflow-hidden">
                {/* Background Pattern / Texture */}
                <div className="absolute inset-0 bg-[#3b82f6] opacity-[0.05] mix-blend-overlay"></div>
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#3b82f6] opacity-10 blur-[50px] -translate-y-1/2 translate-x-1/3 rounded-full pointer-events-none"></div>

                {renderBouncingAvatars()}

                {/* Floating Badges (Top Right) */}
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                    {renderTopBadges()}
                </div>

                {/* Big Date Display acting as the "Image" cover */}
                <div className="relative z-10 flex flex-col items-start justify-end">
                    <div className="flex items-end gap-3 text-white drop-shadow-md">
                        <span className="text-7xl font-black italic tracking-tighter leading-none">{day}</span>
                        <div className="flex flex-col leading-none pb-2">
                            <span className="text-xl font-black uppercase text-[#00FF41] tracking-widest mb-0.5">{month}</span>
                            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">{weekday}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex flex-col p-5 gap-5 bg-[#18181b]">
                {/* Title and Location */}
                <div className="flex flex-col gap-1.5">
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tight leading-none line-clamp-1 group-hover:text-[#00FF41] transition-colors shadow-black drop-shadow-sm">
                        {session.title || 'Badminton Session'}
                    </h3>
                    <div className="flex items-center gap-2 text-[13px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        <span className="truncate">{session.location}</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 py-4 pb-0 border-t border-white/5">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-gray-500">
                            <span className="text-[10px] font-black uppercase tracking-widest">Time</span>
                        </div>
                        <span className="text-lg font-black text-white italic tracking-tighter shadow-black drop-shadow-sm">
                            {formatTime(session.startTime)} – {formatTime(session.endTime)}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1.5 pl-4 border-l border-white/5">
                        <div className="flex items-center gap-2 text-gray-500">
                            <span className="text-[10px] font-black uppercase tracking-widest">Players</span>
                        </div>
                        <span className="text-xl font-black text-white italic tracking-tighter shadow-black drop-shadow-sm">
                            {session.playerIds.length}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}, (prev, next) => {
    // Optimized comparison: Check specific fields instead of expensive JSON.stringify
    const s1 = prev.session;
    const s2 = next.session;
    return (
        s1.id === s2.id &&
        s1.playerIds.length === s2.playerIds.length &&
        s1.playerIds.join(',') === s2.playerIds.join(',') &&
        s1.started === s2.started &&
        s1.finalBill === s2.finalBill &&
        s1.title === s2.title &&
        s1.location === s2.location &&
        s1.startTime === s2.startTime &&
        s1.endTime === s2.endTime &&
        prev.currentUser.id === next.currentUser.id
    );
});

export default SessionCard;
