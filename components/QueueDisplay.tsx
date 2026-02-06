import React, { useMemo } from 'react';
import { Session, User, MatchResult } from '../types';
import {
    calculateQueue,
    getPool,
    getAvailablePlayers,
    getRecentTeammatePairs,
    formatWaitTime,
    getAvatarColor,
    getRankFrameClass,
    triggerHaptic
} from '../utils';
import { Clock, Users, AlertTriangle, Play, SkipForward, Hourglass } from 'lucide-react';

interface QueueDisplayProps {
    session: Session;
    allUsers: User[];
    currentUser: User;
    isHost: boolean;
    onPlayerClick?: (userId: string) => void;
    onSkipTurn?: (userId: string) => void;
    onAutoAssign?: (playerIds: string[]) => void;
}

const QueueDisplay: React.FC<QueueDisplayProps> = ({
    session,
    allUsers,
    currentUser,
    isHost,
    onPlayerClick,
    onSkipTurn,
    onAutoAssign
}) => {
    const queue = useMemo(() => calculateQueue(session), [session]);
    const availablePlayers = useMemo(() => getAvailablePlayers(queue), [queue]);
    const pool = useMemo(() => getPool(queue, 6), [queue]);

    // Find current user's position
    const currentUserPosition = useMemo(() => {
        const found = queue.find(p => p.id === currentUser.id);
        return found?.position || null;
    }, [queue, currentUser.id]);

    const currentUserInQueue = useMemo(() => {
        return availablePlayers.some(p => p.id === currentUser.id);
    }, [availablePlayers, currentUser.id]);

    // Check for recent teammate warnings in the pool
    const poolIds = useMemo(() => pool.map(p => p.id), [pool]);
    const recentTeammatePairs = useMemo(() =>
        getRecentTeammatePairs(poolIds, session.matches || []),
        [poolIds, session.matches]
    );

    // Get users outside the pool
    const waitingOutsidePool = useMemo(() =>
        availablePlayers.slice(6),
        [availablePlayers]
    );

    if (availablePlayers.length === 0) {
        return null; // No one waiting, don't show queue
    }

    const getUserById = (id: string): User | undefined =>
        allUsers.find(u => u.id === id);

    return (
        <div className="mb-8">
            <div className="flex justify-between items-end mb-4 border-b border-[#002266] pb-2">
                <h3 className="text-lg font-black italic text-white uppercase tracking-wider flex items-center">
                    <Hourglass size={20} className="mr-2 text-[#00FF41]" />
                    Up Next
                </h3>
                <span className="text-[#00FF41] font-bold text-sm">
                    {availablePlayers.length} <span className="text-gray-500">waiting</span>
                </span>
            </div>

            {/* Current user's queue position (for non-hosts) */}
            {currentUserInQueue && currentUserPosition && (
                <div className="bg-[#001645] border border-[#00FF41]/30 rounded-lg p-3 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#00FF41] text-[#000B29] rounded-full flex items-center justify-center font-black text-sm">
                            #{currentUserPosition}
                        </div>
                        <span className="text-sm font-bold text-white">Your queue position</span>
                    </div>
                    {currentUserPosition <= 6 && (
                        <span className="text-[10px] font-bold text-[#00FF41] uppercase tracking-wider bg-[#00FF41]/10 px-2 py-1 rounded">
                            In Pool
                        </span>
                    )}
                </div>
            )}

            {/* Pool Section - Top 6 */}
            <div className="bg-[#001645] border border-[#002266] rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
                        <Users size={12} className="mr-1.5" />
                        Next Match Pool
                    </span>
                    <span className="text-[10px] font-bold text-[#00FF41] bg-[#00FF41]/10 px-2 py-0.5 rounded">
                        Top {Math.min(6, pool.length)}
                    </span>
                </div>

                {/* Warning for recent teammates */}
                {recentTeammatePairs.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 mb-3 flex items-start gap-2">
                        <AlertTriangle size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-yellow-500">
                            <span className="font-bold">Recent teammates: </span>
                            {recentTeammatePairs.map(([p1, p2], i) => {
                                const u1 = getUserById(p1);
                                const u2 = getUserById(p2);
                                return (
                                    <span key={i}>
                                        {u1?.name.split(' ')[0]} & {u2?.name.split(' ')[0]}
                                        {i < recentTeammatePairs.length - 1 ? ', ' : ''}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Pool players grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {pool.map((queuedPlayer, index) => {
                        const user = getUserById(queuedPlayer.id);
                        if (!user) return null;

                        const isInRecentPair = recentTeammatePairs.some(
                            pair => pair.includes(queuedPlayer.id)
                        );

                        return (
                            <div
                                key={queuedPlayer.id}
                                className={`
                  flex items-center gap-2 p-2 rounded-lg border transition-all
                  ${isInRecentPair
                                        ? 'bg-yellow-500/5 border-yellow-500/30'
                                        : 'bg-[#000B29] border-[#002266] hover:border-[#00FF41]/30'
                                    }
                  ${onPlayerClick ? 'cursor-pointer' : ''}
                `}
                                onClick={() => {
                                    triggerHaptic('light');
                                    onPlayerClick?.(user.id);
                                }}
                            >
                                <div className="relative">
                                    <div className={`rounded-full transition-all duration-500 ${getRankFrameClass(user.rankFrame).replace('ring-4', 'ring-2')}`}>
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            className="w-8 h-8 rounded-full border border-[#000B29] object-cover"
                                            style={{ backgroundColor: getAvatarColor(user.avatar) }}
                                        />
                                    </div>
                                    <div className="absolute -top-1 -left-1 w-4 h-4 bg-[#00FF41] text-[#000B29] rounded-full flex items-center justify-center text-[8px] font-black">
                                        {index + 1}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-white truncate flex items-center">
                                        {user.name.split(' ')[0]}
                                        {user.id === currentUser.id && (
                                            <span className="ml-1 text-[8px] text-[#00FF41]">You</span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-gray-500 flex items-center">
                                        <Clock size={8} className="mr-1" />
                                        {formatWaitTime(queuedPlayer.waitingSince)}
                                    </div>
                                </div>

                                {/* Skip button for the player themselves or host */}
                                {(user.id === currentUser.id || isHost) && onSkipTurn && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            triggerHaptic('medium');
                                            onSkipTurn(user.id);
                                        }}
                                        className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                                        title="Skip turn"
                                    >
                                        <SkipForward size={12} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Auto assign button (host only) */}
                {isHost && pool.length >= 4 && onAutoAssign && (
                    <button
                        onClick={() => {
                            triggerHaptic('success');
                            const topFourIds = pool.slice(0, 4).map(p => p.id);
                            onAutoAssign(topFourIds);
                        }}
                        className="w-full mt-4 py-3 bg-[#00FF41] hover:bg-white text-[#000B29] font-black uppercase tracking-widest text-sm rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]"
                    >
                        <Play size={16} fill="currentColor" />
                        <span>Assign Top 4 to Court</span>
                    </button>
                )}
            </div>

            {/* Players waiting outside pool */}
            {waitingOutsidePool.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-bold text-gray-600 uppercase tracking-widest px-1 flex items-center">
                        <span className="flex-1 border-t border-gray-800 mr-2"></span>
                        Also waiting
                        <span className="flex-1 border-t border-gray-800 ml-2"></span>
                    </div>

                    <div className="space-y-1">
                        {waitingOutsidePool.map((queuedPlayer) => {
                            const user = getUserById(queuedPlayer.id);
                            if (!user) return null;

                            return (
                                <div
                                    key={queuedPlayer.id}
                                    onClick={() => {
                                        triggerHaptic('light');
                                        onPlayerClick?.(user.id);
                                    }}
                                    className={`
                    flex items-center gap-3 p-2 rounded-lg bg-[#000B29]/50 
                    ${onPlayerClick ? 'cursor-pointer hover:bg-[#001645]' : ''}
                    transition-colors
                  `}
                                >
                                    <span className="text-xs font-mono text-gray-600 w-5">
                                        {queuedPlayer.position}.
                                    </span>
                                    <div className={`rounded-full transition-all duration-500 ${getRankFrameClass(user.rankFrame).replace('ring-4', 'ring-2')}`}>
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            className="w-6 h-6 rounded-full border border-gray-700 object-cover"
                                            style={{ backgroundColor: getAvatarColor(user.avatar) }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 flex-1">
                                        {user.name}
                                        {user.id === currentUser.id && (
                                            <span className="ml-1 text-[10px] text-[#00FF41]">(You)</span>
                                        )}
                                    </span>
                                    <span className="text-[10px] text-gray-600 flex items-center">
                                        <Clock size={8} className="mr-1" />
                                        {formatWaitTime(queuedPlayer.waitingSince)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QueueDisplay;
