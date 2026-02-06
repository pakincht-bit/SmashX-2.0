
import React, { useState, useCallback } from 'react';
import { Session, User } from '../types';
import { formatTime, getDateParts, triggerHaptic } from '../utils';
import { Clock, Users, MapPin, Loader2, LogIn, LogOut } from 'lucide-react';

interface SessionCardProps {
    session: Session;
    currentUser: User;
    allUsers: User[]; // Keep this for compatibility if passed
    onJoin: (sessionId: string) => Promise<void>;
    onLeave: (sessionId: string) => Promise<void>;
    onDelete: (sessionId: string) => void;
    onClick: (sessionId: string) => void;
}

const AUTO_END_GRACE_PERIOD_MS = 30 * 60 * 1000;

const SessionCard: React.FC<SessionCardProps> = React.memo(({
    session,
    currentUser,
    onJoin,
    onLeave,
    onClick
}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const { month, day, weekday } = getDateParts(session.startTime);
    const isFull = session.playerIds.length >= session.maxPlayers;
    const isJoined = session.playerIds.includes(currentUser.id);

    const getSessionStatus = () => {
        if (session.finalBill) return 'END';
        const now = new Date();
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        const endWithGrace = new Date(end.getTime() + AUTO_END_GRACE_PERIOD_MS);

        // Transition to END only after grace period expires
        if (now > endWithGrace) return 'END';
        // Stay PLAYING during grace period
        if (session.started || (now >= start && now <= endWithGrace)) return 'PLAYING';
        if (isJoined) return 'JOINED';
        return 'OPEN';
    };

    const status = getSessionStatus();

    const handleAction = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isProcessing) return;

        setIsProcessing(true);
        try {
            if (status === 'JOINED') {
                await onLeave(session.id);
                triggerHaptic('medium');
            } else if (status === 'OPEN' && !isFull) {
                await onJoin(session.id);
                triggerHaptic('success');
            }
        } catch (error) {
            console.error("Action failed", error);
            triggerHaptic('error');
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing, status, isFull, onJoin, onLeave, session.id]);

    const renderStatusBadge = () => {
        // Common style for the skewed container
        const badgeClass = "px-2 py-1.5 rounded-sm -skew-x-12 flex items-center justify-center border transition-all";
        // Common style for the un-skewed text
        const textClass = "skew-x-12 text-[10px] font-black uppercase tracking-wider flex items-center gap-1";

        if (isProcessing) {
            return (
                <div className={`${badgeClass} bg-gray-800 border-gray-600 text-gray-400 cursor-wait`}>
                    <span className={textClass}>
                        <Loader2 size={12} className="animate-spin" /> Processing
                    </span>
                </div>
            );
        }

        switch (status) {
            case 'END':
                return (
                    <div className={`${badgeClass} bg-gray-900/50 border-gray-700 text-gray-400`}>
                        <span className={textClass}>Finished</span>
                    </div>
                );
            case 'PLAYING':
                return (
                    <div className={`${badgeClass} bg-[#00FF41]/10 border-[#00FF41]/30 text-[#00FF41] shadow-[0_0_10px_rgba(0,255,65,0.2)]`}>
                        <span className={textClass}>
                            <div className="w-1.5 h-1.5 bg-[#00FF41] rounded-full animate-pulse"></div> Live
                        </span>
                    </div>
                );
            case 'JOINED':
                return (
                    <button
                        onClick={handleAction}
                        className={`${badgeClass} bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 group/status`}
                    >
                        <span className={`${textClass} hidden group-hover/status:flex`}>
                            <LogOut size={12} /> Leave
                        </span>
                        <span className={`${textClass} group-hover/status:hidden`}>
                            Joined
                        </span>
                    </button>
                );
            default:
                if (isFull) {
                    return (
                        <div className={`${badgeClass} bg-red-500/10 border-red-500/30 text-red-500`}>
                            <span className={textClass}>Full</span>
                        </div>
                    );
                }
                return (
                    <button
                        onClick={handleAction}
                        className={`${badgeClass} bg-[#00FF41] border-[#00FF41] text-[#000B29] shadow-[0_0_10px_rgba(0,255,65,0.3)] hover:bg-white hover:text-[#000B29] active:scale-95`}
                    >
                        <span className={textClass}>
                            <LogIn size={12} strokeWidth={3} /> Join
                        </span>
                    </button>
                );
        }
    };

    return (
        <div
            onClick={() => {
                triggerHaptic('light');
                onClick(session.id);
            }}
            className="cursor-pointer group relative flex bg-[#001645] border border-[#002266] rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#00FF41]/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] active:scale-[0.99]"
        >
            {/* Date Section - Left Side */}
            <div className="bg-[#000B29] border-r border-[#002266] w-20 shrink-0 flex flex-col items-center justify-center p-2 relative overflow-hidden group-hover:bg-[#000F33] transition-colors">
                <div className="absolute top-0 right-0 w-12 h-12 bg-[#00FF41] opacity-5 -rotate-45 translate-x-6 -translate-y-6"></div>
                {/* Weekday moved to top and highlighted */}
                <span className="text-[10px] font-black text-[#00FF41] uppercase tracking-widest mb-0.5">{weekday}</span>
                <span className="text-4xl font-black text-white italic leading-none tracking-tighter">{day}</span>
                {/* Month moved to bottom */}
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{month}</span>
            </div>

            {/* Content Section */}
            <div className="flex-1 p-3 flex flex-col justify-between min-w-0 relative gap-3">
                {/* Header: Title & Status */}
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-black italic text-white uppercase tracking-tight leading-none group-hover:text-[#00FF41] transition-colors line-clamp-1 flex-1">
                        {session.title || 'Badminton Session'}
                    </h3>
                    {/* Status Badge */}
                    <div className="shrink-0 z-10">
                        {renderStatusBadge()}
                    </div>
                </div>

                {/* Meta Badges Row - Grid Layout for equal width */}
                <div className="grid grid-cols-3 gap-2 w-full">
                    {/* Location Badge */}
                    <div className="bg-[#001645] border border-[#00FF41]/30 text-white px-1 py-1.5 rounded-sm -skew-x-12 flex items-center justify-center w-full">
                        <span className="skew-x-12 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 truncate w-full">
                            <MapPin size={10} className="text-[#00FF41] shrink-0" />
                            <span className="truncate">{session.location}</span>
                        </span>
                    </div>

                    {/* Time Badge */}
                    <div className="bg-[#001645] border border-[#00FF41]/30 text-white px-1 py-1.5 rounded-sm -skew-x-12 flex items-center justify-center w-full">
                        <span className="skew-x-12 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 truncate w-full">
                            <Clock size={10} className="text-[#00FF41] shrink-0" />
                            <span className="truncate">{formatTime(session.startTime)}</span>
                        </span>
                    </div>

                    {/* Players Badge */}
                    <div className={`px-1 py-1.5 rounded-sm -skew-x-12 flex items-center justify-center border w-full ${isFull ? 'bg-red-500/5 border-red-500/30' : 'bg-[#001645] border-[#002266]'}`}>
                        <span className="skew-x-12 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 truncate w-full">
                            <Users size={10} strokeWidth={3} className={isFull ? "text-red-500" : "text-[#00FF41]"} />
                            <span className={isFull ? "text-red-500" : "text-white"}>{session.playerIds.length}</span>
                            <span className="text-gray-500">/</span>
                            <span className="text-gray-400">{session.maxPlayers}</span>
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
