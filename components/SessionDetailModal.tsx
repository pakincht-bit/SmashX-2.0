
import React, { useState, useEffect, useMemo } from 'react';
import { Session, User, MatchResult, NextMatchup } from '../types';
import { formatDate, formatTime, getDateParts, getSmartMatchSuggestion, getSmartMatchSuggestionV2, getAvatarColor, getRankFrameClass, triggerHaptic, wereRecentTeammates } from '../utils';
import { MapPin, Clock, Calendar, ArrowLeft, Users, Trash2, Play, LogOut, CheckCircle, Timer, Hash, Plus, Check, Trophy, X, Wand2, Scale, Dices, Square, Calculator, Receipt, TrendingUp, TrendingDown, Minus, Lock, GripVertical, Share2, Swords, RefreshCw, Activity, Pencil, AlertTriangle, ListPlus } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import PullToRefresh from './PullToRefresh';
import ShareReportModal from './ShareReportModal';

interface SessionDetailModalProps {
    session: Session | null;
    currentUser: User;
    allUsers: User[];
    onClose: () => void;
    onJoin: (sessionId: string) => void;
    onLeave: (sessionId: string) => void;
    onDelete: (sessionId: string) => void;
    onStart: (sessionId: string, initialCheckInIds?: string[]) => void;
    onEnd: (sessionId: string, costData: { shuttlesUsed: number; pricePerShuttle: number; totalCourtPrice: number; splitMode: 'EQUAL' | 'MATCHES' }) => void;
    onCheckInToggle: (sessionId: string, playerId: string) => void;
    onSkipTurn: (sessionId: string, playerId: string) => void;
    onCourtAssignment: (sessionId: string, courtIndex: number, playerIds: string[]) => void;
    onRecordMatchResult: (sessionId: string, courtIndex: number, winningTeamIndex: 1 | 2) => void;
    onPlayerClick?: (userId: string) => void;
    onRefresh: () => Promise<void>;
    onEdit?: (sessionId: string) => void;
    onQueueMatch?: (sessionId: string, playerIds: string[]) => void;
    onPromoteMatch?: (sessionId: string, matchupId: string, courtIndex: number) => void;
    onDeleteQueuedMatch?: (sessionId: string, matchupId: string) => void;
}

const START_THRESHOLD_MINUTES = 30; // Button is enabled 30 mins before start
const AUTO_END_GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes grace period

const MatchTimer: React.FC<{ startTime: string }> = ({ startTime }) => {
    const [elapsed, setElapsed] = useState('00:00');

    useEffect(() => {
        const interval = setInterval(() => {
            const start = new Date(startTime).getTime();
            const now = new Date().getTime();
            const diff = Math.max(0, Math.floor((now - start) / 1000));

            const m = Math.floor(diff / 60);
            const s = diff % 60;
            setElapsed(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    return (
        <div className="bg-[#000B29]/80 backdrop-blur border border-[#00FF41]/30 text-[#00FF41] font-mono font-bold text-xs px-2 py-1 rounded flex items-center shadow-lg">
            <div className="w-1.5 h-1.5 bg-[#00FF41] rounded-full mr-2 animate-pulse shadow-[0_0_5px_#00FF41]"></div>
            {elapsed}
        </div>
    );
};

const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
    session,
    currentUser,
    allUsers,
    onClose,
    onJoin,
    onLeave,
    onDelete,
    onStart,
    onEnd,
    onCheckInToggle,
    onSkipTurn,
    onCourtAssignment,
    onRecordMatchResult,
    onPlayerClick,
    onRefresh,
    onEdit,
    onQueueMatch,
    onPromoteMatch,
    onDeleteQueuedMatch
}) => {
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: () => void;
        isDestructive: boolean;
        confirmLabel: string;
    } | null>(null);

    const [editingCourt, setEditingCourt] = useState<number | null>(null);
    const [isQueueingMatch, setIsQueueingMatch] = useState(false);
    const [tempSelectedPlayers, setTempSelectedPlayers] = useState<(string | null)[]>([null, null, null, null]);
    const [finishingGameCourt, setFinishingGameCourt] = useState<number | null>(null);
    const [pendingWinner, setPendingWinner] = useState<1 | 2 | null>(null);

    const [isCopied, setIsCopied] = useState(false);
    const [isRefreshingManual, setIsRefreshingManual] = useState(false);
    const [isShareReportOpen, setIsShareReportOpen] = useState(false);

    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [startCheckInIds, setStartCheckInIds] = useState<string[]>([]);

    const [showEndSessionForm, setShowEndSessionForm] = useState(false);
    const [costForm, setCostForm] = useState({
        shuttlesUsed: 0,
        pricePerShuttle: 0,
        totalCourtPrice: 0
    });
    const [splitMode, setSplitMode] = useState<'EQUAL' | 'MATCHES'>('EQUAL');

    const [activeTab, setActiveTab] = useState<'scoreboard' | 'bill'>('scoreboard');

    // Watch for session updates from other users to ensure local modals are consistent with live state
    useEffect(() => {
        if (!session) return;

        // If we are editing/assigning a court, but it suddenly gets players (e.g., someone else assigned it)
        if (editingCourt !== null) {
            const playersOnCourt = session.courtAssignments?.[editingCourt] || [];
            if (playersOnCourt.length > 0) {
                setEditingCourt(null);
            }
        }

        // If we are finishing a match, but it suddenly has no players (e.g., someone else finished it)
        if (finishingGameCourt !== null) {
            const playersOnCourt = session.courtAssignments?.[finishingGameCourt] || [];
            if (playersOnCourt.length === 0) {
                setFinishingGameCourt(null);
                setPendingWinner(null);
            }
        }
    }, [session, editingCourt, finishingGameCourt]);

    const liveBillPreview = useMemo(() => {
        if (!session) return { totalCost: 0, playerCount: 0, avgCost: 0, minCost: 0, maxCost: 0 };

        const { shuttlesUsed, pricePerShuttle, totalCourtPrice } = costForm;
        const totalShuttlePrice = shuttlesUsed * pricePerShuttle;
        const totalCost = totalCourtPrice + totalShuttlePrice;

        const checkedInIds = session.checkedInPlayerIds || [];
        const playerCount = checkedInIds.length;
        if (playerCount === 0) return { totalCost, playerCount: 0, avgCost: 0, minCost: 0, maxCost: 0 };

        if (splitMode === 'EQUAL') {
            const cost = Math.round(totalCost / playerCount);
            return {
                totalCost,
                playerCount,
                avgCost: cost,
                minCost: cost,
                maxCost: cost
            };
        } else {
            // MATCHES
            const playerMatchCounts: Record<string, number> = {};
            checkedInIds.forEach(id => playerMatchCounts[id] = 0);
            (session.matches || []).forEach(m => {
                [...m.team1Ids, ...m.team2Ids].forEach(id => {
                    if (playerMatchCounts[id] !== undefined) playerMatchCounts[id]++;
                });
            });

            const totalParticipations = Object.values(playerMatchCounts).reduce((a, b) => a + b, 0);

            if (totalParticipations === 0) {
                // Fallback to equal
                const cost = Math.round(totalCost / playerCount);
                return {
                    totalCost,
                    playerCount,
                    avgCost: cost,
                    minCost: cost,
                    maxCost: cost
                };
            }

            const costs = checkedInIds.map(id => {
                const count = playerMatchCounts[id] || 0;
                return Math.round((count / totalParticipations) * totalCost);
            });

            return {
                totalCost,
                playerCount,
                avgCost: Math.round(totalCost / playerCount),
                minCost: Math.min(...costs),
                maxCost: Math.max(...costs)
            };
        }
    }, [costForm, session, splitMode]);

    const playerStats = useMemo(() => {
        const stats: Record<string, { played: number; wins: number; losses: number }> = {};
        if (!session) return stats;

        (session.checkedInPlayerIds || []).forEach(pid => {
            stats[pid] = { played: 0, wins: 0, losses: 0 };
        });

        (session.matches || []).forEach(match => {
            const winners = match.winningTeamIndex === 1 ? match.team1Ids : match.team2Ids;
            const losers = match.winningTeamIndex === 1 ? match.team2Ids : match.team1Ids;

            winners.forEach(pid => {
                if (stats[pid]) { stats[pid].played++; stats[pid].wins++; }
            });
            losers.forEach(pid => {
                if (stats[pid]) { stats[pid].played++; stats[pid].losses++; }
            });
        });
        return stats;
    }, [session]);

    const durationString = useMemo(() => {
        if (!session) return "0h";
        const diffMs = Math.max(0, new Date(session.endTime).getTime() - new Date(session.startTime).getTime());
        const totalMinutes = Math.floor(diffMs / 60000);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        if (h === 0 && m === 0 && diffMs > 0) return "1m";
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }, [session?.startTime, session?.endTime]);

    const personalReportStats = useMemo(() => {
        let wins = 0; let losses = 0; let pointsChange = 0;
        if (session?.matches) {
            session.matches.forEach(match => {
                const isTeam1 = match.team1Ids.includes(currentUser.id);
                const isTeam2 = match.team2Ids.includes(currentUser.id);
                if (!isTeam1 && !isTeam2) return;
                const isWin = (isTeam1 && match.winningTeamIndex === 1) || (isTeam2 && match.winningTeamIndex === 2);
                if (isWin) { wins++; pointsChange += match.pointsChange; } else { losses++; pointsChange -= match.pointsChange; }
            });
        }
        return { wins, losses, pointsChange };
    }, [session, currentUser.id]);

    if (!session) return null;

    const handleCopyLink = () => {
        const url = `${window.location.origin}${window.location.pathname}?session=${session.id}`;
        navigator.clipboard.writeText(url);
        setIsCopied(true);
        triggerHaptic('success');
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleManualRefresh = async () => {
        if (isRefreshingManual) return;
        setIsRefreshingManual(true);
        triggerHaptic('light');
        try {
            await onRefresh();
            triggerHaptic('success');
        } finally {
            setTimeout(() => setIsRefreshingManual(false), 1000);
        }
    };

    const isHost = session.hostId === currentUser.id;
    const isJoined = session.playerIds.includes(currentUser.id);
    const isFull = session.playerIds.length >= session.maxPlayers;
    const isCurrentUserCheckedIn = (session.checkedInPlayerIds || []).includes(currentUser.id);

    const { month, day, weekday } = getDateParts(session.startTime);

    const getSessionStatus = () => {
        if (session.finalBill) return 'END';
        const now = new Date();
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        const endWithGrace = new Date(end.getTime() + AUTO_END_GRACE_PERIOD_MS);

        // Final end check (after grace period)
        if (now > endWithGrace) return 'END';
        // Stay PLAYING if started or within active + grace time
        if (session.started || (now >= start && now <= endWithGrace)) return 'PLAYING';
        return 'OPEN';
    };
    const status = getSessionStatus();

    const now = new Date();
    const startTimeObj = new Date(session.startTime);
    const diffMinutes = (startTimeObj.getTime() - now.getTime()) / (1000 * 60);
    const isTooEarlyToStart = diffMinutes > START_THRESHOLD_MINUTES;

    const players = session.playerIds.map(id => allUsers.find(u => u.id === id)).filter(Boolean) as User[];

    const checkedInIds = session.checkedInPlayerIds || [];
    const assignments: Record<number, string[]> = session.courtAssignments || {};
    const startTimes: Record<number, string> = session.matchStartTimes || {};

    const getPlayerCourtIndex = (playerId: string): number | null => {
        for (const [courtIdx, pIds] of Object.entries(assignments)) {
            if ((pIds as string[]).includes(playerId)) return parseInt(courtIdx);
        }
        return null;
    };

    const handleOpenStartModal = () => {
        setStartCheckInIds([currentUser.id]);
        setIsStartModalOpen(true);
        triggerHaptic('light');
    };

    const handleToggleStartCheckIn = (playerId: string) => {
        setStartCheckInIds(prev => {
            const isRemoving = prev.includes(playerId);
            triggerHaptic(isRemoving ? 'light' : 'medium');
            if (isRemoving) return prev.filter(id => id !== playerId);
            return [...prev, playerId];
        });
    };

    const handleSelectAllStartCheckIn = () => {
        triggerHaptic('medium');
        if (startCheckInIds.length === players.length) { setStartCheckInIds([]); }
        else { setStartCheckInIds(players.map(p => p.id)); }
    };

    const confirmStartSession = () => {
        onStart(session.id, startCheckInIds);
        setIsStartModalOpen(false);
        triggerHaptic('success');
    };

    const handleStartQueueing = () => {
        setIsQueueingMatch(true);
        setEditingCourt(999); // Use dummy index
        triggerHaptic('light');
        const suggested = getSmartMatchSuggestionV2(session, 999);
        if (suggested && suggested.length > 0) {
            const newSlots = [null, null, null, null] as (string | null)[];
            suggested.forEach((id, i) => { if (i < 4) newSlots[i] = id; });
            setTempSelectedPlayers(newSlots);
        } else {
            setTempSelectedPlayers([null, null, null, null]);
        }
    };

    const handleOpenCourtEdit = (courtIndex: number) => {
        setIsQueueingMatch(false);
        setEditingCourt(courtIndex);
        triggerHaptic('light');
        const existingPlayers = assignments[courtIndex] || [];
        if (existingPlayers.length === 0) {
            // Use new V2 algorithm with Pool Selection for better variety
            const suggested = getSmartMatchSuggestionV2(session, courtIndex);
            if (suggested && suggested.length > 0) {
                const newSlots = [null, null, null, null] as (string | null)[];
                suggested.forEach((id, i) => { if (i < 4) newSlots[i] = id; });
                setTempSelectedPlayers(newSlots);
                return;
            }
        }
        const newSlots = [null, null, null, null] as (string | null)[];
        existingPlayers.forEach((pid, i) => { if (i < 4) newSlots[i] = pid; });
        setTempSelectedPlayers(newSlots);
    };

    const handleSelectAvailablePlayer = (playerId: string) => {
        if (tempSelectedPlayers.includes(playerId)) return;
        const emptyIndex = tempSelectedPlayers.findIndex(slot => slot === null);
        if (emptyIndex !== -1) {
            triggerHaptic('medium');
            setTempSelectedPlayers(prev => {
                const next = [...prev];
                next[emptyIndex] = playerId;
                return next;
            });
        }
    };

    const handleRemovePlayerFromSlot = (index: number) => {
        triggerHaptic('light');
        setTempSelectedPlayers(prev => {
            const next = [...prev];
            next[index] = null;
            return next;
        });
    };

    const saveCourtAssignment = () => {
        const finalPlayers = tempSelectedPlayers.filter((p): p is string => p !== null);

        if (isQueueingMatch) {
            if (onQueueMatch) {
                onQueueMatch(session.id, finalPlayers);
                setEditingCourt(null);
                setIsQueueingMatch(false);
                triggerHaptic('success');
            }
            return;
        }

        if (editingCourt !== null) {
            // Trigger parent handler - now optimistic
            onCourtAssignment(session.id, editingCourt, finalPlayers);
            setEditingCourt(null);
            triggerHaptic('success');
        }
    };

    const handleRandomize = () => {
        triggerHaptic('medium');

        // 1. Identify players on OTHER courts to exclude
        const busyPlayers = new Set<string>();
        Object.entries(assignments).forEach(([courtIdx, pIds]) => {
            if (parseInt(courtIdx) !== editingCourt) {
                (pIds as string[]).forEach(pid => busyPlayers.add(pid));
            }
        });

        // 2. Filter available checked-in players
        const availablePool = checkedInIds.filter(pid => !busyPlayers.has(pid));

        // 3. Shuffle the available pool
        const shuffled = [...availablePool];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // 4. Select top 4
        const selected = shuffled.slice(0, 4);

        const newSlots = [null, null, null, null] as (string | null)[];
        selected.forEach((pid, i) => {
            newSlots[i] = pid;
        });
        setTempSelectedPlayers(newSlots);
    };

    const getTempSelectionStats = () => {
        const t1Ids = [tempSelectedPlayers[0], tempSelectedPlayers[1]].filter(Boolean) as string[];
        const t1Users = t1Ids.map(id => allUsers.find(u => u.id === id)).filter(Boolean) as User[];
        const t2Ids = [tempSelectedPlayers[2], tempSelectedPlayers[3]].filter(Boolean) as string[];
        const t2Users = t2Ids.map(id => allUsers.find(u => u.id === id)).filter(Boolean) as User[];
        const t1Avg = t1Users.length ? Math.round(t1Users.reduce((sum, u) => sum + u.points, 0) / t1Users.length) : 0;
        const t2Avg = t2Users.length ? Math.round(t2Users.reduce((sum, u) => sum + u.points, 0) / t2Users.length) : 0;
        return { t1Avg, t2Avg, diff: Math.abs(t1Avg - t2Avg) };
    };

    const tempStats = getTempSelectionStats();
    const selectedCount = tempSelectedPlayers.filter(p => p !== null).length;
    const team1Count = [tempSelectedPlayers[0], tempSelectedPlayers[1]].filter(Boolean).length;
    const team2Count = [tempSelectedPlayers[2], tempSelectedPlayers[3]].filter(Boolean).length;
    const canStartMatch = team1Count > 0 && team2Count > 0;

    // Warning: Check if pair has played together recently
    const getVarietyWarning = () => {
        const pIds = tempSelectedPlayers.filter(Boolean) as string[];
        if (pIds.length < 2) return null;

        let warning = null;
        // Check T1 pair
        if (tempSelectedPlayers[0] && tempSelectedPlayers[1]) {
            if (wereRecentTeammates(tempSelectedPlayers[0], tempSelectedPlayers[1], session.matches || [])) {
                warning = "Team 1 pair has played together recently.";
            }
        }
        // Check T2 pair
        if (tempSelectedPlayers[2] && tempSelectedPlayers[3]) {
            if (wereRecentTeammates(tempSelectedPlayers[2], tempSelectedPlayers[3], session.matches || [])) {
                warning = "Team 2 pair has played together recently.";
            }
        }
        return warning;
    };

    const varietyWarning = getVarietyWarning();

    const getTeamsForCourt = (courtIndex: number) => {
        const pIds = assignments[courtIndex] || [];
        const mid = Math.ceil(pIds.length / 2);
        const team1 = pIds.slice(0, mid).map(id => allUsers.find(u => u.id === id)).filter(Boolean) as User[];
        const team2 = pIds.slice(mid).map(id => allUsers.find(u => u.id === id)).filter(Boolean) as User[];
        return { team1, team2 };
    };

    const renderNextMatchups = () => (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black italic text-white uppercase tracking-wider flex items-center">
                    <ListPlus size={20} className="mr-2 text-[#00FF41]" />
                    Next Match Up
                </h3>
                {/* REMOVED isHost CHECK for Add Match */}
                <button onClick={handleStartQueueing} className="bg-[#001645] hover:bg-[#00FF41] hover:text-[#000B29] text-[#00FF41] border border-[#00FF41] px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2">
                    <Plus size={14} /> Add Match
                </button>
            </div>

            {(session.nextMatchups || []).length === 0 ? (
                <div className="bg-[#001645]/50 border border-[#002266] border-dashed rounded-xl p-6 text-center">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No Matches Queued</p>
                </div>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide pr-12">
                    {(session.nextMatchups || []).map((matchup, idx) => {
                        const mid = Math.ceil(matchup.playerIds.length / 2);
                        const team1 = matchup.playerIds.slice(0, mid).map(id => allUsers.find(u => u.id === id)).filter(Boolean) as User[];
                        const team2 = matchup.playerIds.slice(mid).map(id => allUsers.find(u => u.id === id)).filter(Boolean) as User[];

                        return (
                            <div key={matchup.id} className="min-w-[280px] sm:min-w-[320px] bg-[#000B29] border border-[#002266] rounded-xl p-3 relative group snap-start shadow-lg">
                                {/* Header: Match Number + Delete */}
                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#001645]">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Match {idx + 1}</span>
                                    {/* REMOVED isHost CHECK for Delete Match */}
                                    <button onClick={() => {
                                        triggerHaptic('heavy');
                                        setConfirmConfig({
                                            isOpen: true,
                                            title: 'Cancel Match',
                                            message: 'Remove this matchup from queue?',
                                            action: () => { onDeleteQueuedMatch?.(session.id, matchup.id); },
                                            isDestructive: true,
                                            confirmLabel: 'Remove'
                                        });
                                    }} className="text-gray-500 hover:text-red-500 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {/* Teams Display */}
                                <div className="flex justify-between items-center gap-2 mb-4">
                                    {/* Team 1 (Blue) */}
                                    <div className="flex-1 space-y-2">
                                        {team1.map(u => (
                                            <div key={u.id} className="flex items-center gap-2 bg-[#001645]/50 rounded-lg p-1 pr-2 border border-[#002266]">
                                                <img src={u.avatar} className="w-6 h-6 rounded-full object-cover border border-[#000B29]" style={{ backgroundColor: getAvatarColor(u.avatar) }} />
                                                <span className="text-[10px] font-bold text-white truncate max-w-[70px]">{u.name.split(' ')[0]}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <div className="w-px h-6 bg-[#002266] mb-1"></div>
                                        <span className="text-[9px] font-black text-gray-500 bg-[#000B29] border border-[#002266] px-1.5 rounded">VS</span>
                                        <div className="w-px h-6 bg-[#002266] mt-1"></div>
                                    </div>

                                    {/* Team 2 (Red) */}
                                    <div className="flex-1 space-y-2 text-right">
                                        {team2.map(u => (
                                            <div key={u.id} className="flex items-center justify-end gap-2 bg-[#001645]/50 rounded-lg p-1 pl-2 border border-[#002266]">
                                                <span className="text-[10px] font-bold text-white truncate max-w-[70px]">{u.name.split(' ')[0]}</span>
                                                <img src={u.avatar} className="w-6 h-6 rounded-full object-cover border border-[#000B29]" style={{ backgroundColor: getAvatarColor(u.avatar) }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Promote Actions */}
                                {/* REMOVED isHost CHECK for Promote Match */}
                                <div className="grid grid-cols-2 gap-2 mt-auto">
                                    {Array.from({ length: session.courtCount }).map((_, cIdx) => {
                                        const isFree = (assignments[cIdx] || []).length === 0;
                                        return (
                                            <button
                                                key={cIdx}
                                                disabled={!isFree}
                                                onClick={() => { if (isFree) { triggerHaptic('success'); onPromoteMatch?.(session.id, matchup.id, cIdx); } }}
                                                className={`px-2 py-2 rounded text-[9px] font-black uppercase tracking-wider transition-all border ${isFree
                                                    ? 'bg-[#00FF41]/10 border-[#00FF41] text-[#00FF41] hover:bg-[#00FF41] hover:text-[#000B29]'
                                                    : 'bg-transparent border-gray-800 text-gray-600 cursor-not-allowed'
                                                    }`}
                                            >
                                                {isFree ? `Push Court ${cIdx + 1}` : `Court ${cIdx + 1} Busy`}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div >
    );

    const renderLiveCourts = () => (
        <div className="mb-8">
            <h3 className="text-lg font-black italic text-white uppercase tracking-wider flex items-center mb-4">
                <Hash size={20} className="mr-2 text-[#00FF41]" />
                Courts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: session.courtCount }).map((_, index) => {
                    const assignedPlayerIds = assignments[index] || [];
                    const assignedUsers = assignedPlayerIds.map(id => allUsers.find(u => u.id === id)).filter(Boolean) as User[];
                    const hasPlayers = assignedUsers.length > 0;
                    const startTime = startTimes[index];
                    const team1 = assignedUsers.slice(0, Math.ceil(assignedUsers.length / 2));
                    const team2 = assignedUsers.slice(Math.ceil(assignedUsers.length / 2));
                    return (
                        <div key={index} className={`rounded-xl overflow-hidden group relative flex flex-col transition-colors shadow-lg ${hasPlayers ? 'border border-[#00FF41]/50' : 'border border-[#003399]'}`} >
                            <div className={`aspect-[16/9] relative flex overflow-hidden bg-[#000B29] ${isCurrentUserCheckedIn ? 'cursor-pointer' : 'cursor-not-allowed opacity-90'}`} onClick={() => { if (!isCurrentUserCheckedIn) return; if (hasPlayers) { setFinishingGameCourt(index); setPendingWinner(null); triggerHaptic('medium'); } else { handleOpenCourtEdit(index); } }} >
                                <div className="absolute inset-0 flex">
                                    <div className={`w-1/2 h-full relative transition-opacity ${hasPlayers ? 'bg-gradient-to-br from-blue-900/60 to-blue-900/20' : 'bg-gradient-to-br from-blue-900/20 to-blue-900/5'}`}>
                                        <span className="absolute bottom-8 left-4 text-[4rem] font-black text-blue-500/10 leading-none select-none">BLUE</span>
                                    </div>
                                    <div className={`w-1/2 h-full relative transition-opacity ${hasPlayers ? 'bg-gradient-to-bl from-red-900/60 to-red-900/20' : 'bg-gradient-to-bl from-red-900/20 to-red-900/5'}`}>
                                        <span className="absolute bottom-8 right-4 text-[4rem] font-black text-red-500/10 leading-none select-none">RED</span>
                                    </div>
                                </div>
                                <div className="absolute inset-0 flex justify-center"><div className="w-px h-full bg-white/5"></div></div>
                                <div className="absolute inset-4 border border-white/5 opacity-50 pointer-events-none mb-12"></div>
                                <div className="absolute inset-0 z-10 flex pb-10 pointer-events-none">
                                    <div className="w-1/2 p-2 flex flex-col justify-center gap-2 items-center">
                                        {hasPlayers ? (
                                            team1.map(u => (
                                                <div key={u.id} onClick={(e) => { e.stopPropagation(); triggerHaptic('light'); onPlayerClick?.(u.id); }} className="flex items-center gap-2 bg-[#000B29]/90 px-2 py-1 rounded-full border border-blue-500/50 backdrop-blur-sm shadow-lg w-full max-w-[130px] cursor-pointer hover:bg-blue-900/40 pointer-events-auto">
                                                    <div className={`rounded-full transition-all duration-500 ${getRankFrameClass(u.rankFrame).replace('ring-4', 'ring-2')}`}>
                                                        <img src={u.avatar} className="w-6 h-6 rounded-full border border-blue-500 object-cover" style={{ backgroundColor: getAvatarColor(u.avatar) }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-white truncate">{u.name.split(' ')[0]}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-blue-500/30 font-black uppercase tracking-widest text-xs">Blue Team</div>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-10">
                                        {hasPlayers ? (<div className="bg-[#000B29] text-white/50 text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border border-white/10 z-20 shadow-xl">VS</div>) : (<div className="w-8 h-8 rounded-full border border-dashed border-white/20 flex items-center justify-center animate-pulse"><Plus size={16} className="text-white/20" /></div>)}
                                    </div>
                                    <div className="w-1/2 p-2 flex flex-col justify-center gap-2 items-center">
                                        {hasPlayers ? (
                                            team2.map(u => (
                                                <div key={u.id} onClick={(e) => { e.stopPropagation(); triggerHaptic('light'); onPlayerClick?.(u.id); }} className="flex items-center flex-row-reverse gap-2 bg-[#000B29]/90 px-2 py-1 rounded-full border border-red-500/50 backdrop-blur-sm shadow-lg w-full max-w-[130px] cursor-pointer hover:bg-red-900/40 pointer-events-auto">
                                                    <div className={`rounded-full transition-all duration-500 ${getRankFrameClass(u.rankFrame).replace('ring-4', 'ring-2')}`}>
                                                        {/* Fix: Changed user.avatar to u.avatar to fix ReferenceError */}
                                                        <img src={u.avatar} className="w-8 h-8 rounded-full border-red-500 object-cover" style={{ backgroundColor: getAvatarColor(u.avatar) }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-white truncate">{u.name.split(' ')[0]}</span>
                                                </div>
                                            ))
                                        ) : (<div className="text-red-500/30 font-black uppercase tracking-widest text-xs">Red Team</div>)}
                                    </div>
                                </div>
                                <div className="absolute inset-x-0 bottom-0 p-3 pt-12 bg-gradient-to-t from-[#000920] via-[#000920]/90 to-transparent z-20 flex justify-between items-end pointer-events-none">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center mb-0.5 ml-1 drop-shadow-md">Court {index + 1}</span>
                                    <div className="pointer-events-auto"> {hasPlayers ? (<div className="flex items-center">{startTime && <MatchTimer startTime={startTime} />}</div>) : (<div className={`text-[10px] text-white font-bold uppercase tracking-wider border border-white/20 px-3 py-1.5 rounded transition-all backdrop-blur-md bg-white/5 ${isCurrentUserCheckedIn ? 'hover:text-[#00FF41] hover:bg-[#00FF41]/10 hover:border-[#00FF41] cursor-pointer' : 'opacity-50'}`}>Assign</div>)} </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderCheckInList = () => (
        <div>
            <div className="flex justify-between items-end mb-4 border-b border-[#002266] pb-2">
                <h3 className="text-lg font-black italic text-white uppercase tracking-wider flex items-center">
                    <Users size={20} className="mr-2 text-[#00FF41]" /> Check In
                </h3>
                <span className="text-[#00FF41] font-bold text-sm">{checkedInIds.length} <span className="text-gray-500">Checked In</span></span>
            </div>
            <div className="space-y-2">
                {players.map(player => {
                    const isCheckedIn = checkedInIds.includes(player.id);
                    const currentCourt = getPlayerCourtIndex(player.id);
                    const isPlaying = currentCourt !== null;
                    const s = playerStats[player.id] || { played: 0, wins: 0, losses: 0 };
                    return (
                        <div key={player.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isCheckedIn ? 'bg-[#001645] border-[#00FF41]/30' : 'bg-[#000B29] border-[#002266] opacity-60'}`}>
                            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { triggerHaptic('light'); onPlayerClick?.(player.id); }}>
                                <div className="relative">
                                    <div className={`rounded-full transition-all duration-500 ${getRankFrameClass(player.rankFrame).replace('ring-4', 'ring-2')}`}>
                                        <img src={player.avatar} alt={player.name} className={`w-10 h-10 rounded-full border-2 object-cover ${isCheckedIn ? 'border-[#00FF41]' : 'border-gray-700'}`} style={{ backgroundColor: getAvatarColor(player.avatar) }} />
                                    </div>
                                    {isCheckedIn && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00FF41] rounded-full border-2 border-[#000B29] flex items-center justify-center"><Check size={8} className="text-[#000B29] stroke-[4]" /></div>}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white flex items-center group-hover:text-[#00FF41] transition-colors">{player.name} <span className="ml-2 text-[10px] font-mono text-yellow-500 font-bold">{player.points} Points</span> {isPlaying && (<span className="ml-2 text-[10px] text-[#000B29] bg-[#00FF41] font-black px-1.5 rounded uppercase tracking-wider animate-pulse"> Court {currentCourt + 1} </span>)} </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {isCheckedIn ? (<div className="flex items-center gap-2 bg-[#000B29]/50 px-1.5 py-0.5 rounded border border-[#002266]"><span className="text-[10px] font-bold text-gray-300">{s.played} Played</span><span className="w-px h-3 bg-gray-600"></span><span className="text-[10px] font-bold"><span className="text-green-400">{s.wins}W</span> - <span className="text-red-400">{s.losses}L</span></span></div>) : (<span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Not Checked In</span>)}
                                    </div>
                                </div>
                            </div>
                            {isHost && (<button onClick={() => { triggerHaptic(isCheckedIn ? 'light' : 'success'); onCheckInToggle(session.id, player.id); }} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors ${isCheckedIn ? 'bg-transparent border-red-500/50 text-red-500 hover:bg-red-500/10' : 'bg-[#00FF41]/10 border-[#00FF41] text-[#00FF41] hover:bg-[#00FF41] hover:text-[#000B29]'}`} > {isCheckedIn ? 'Undo' : 'Check In'} </button>)}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderNormalPlayerList = () => (
        <div>
            <div className="flex justify-between items-end mb-4 border-b border-[#002266] pb-2">
                <h3 className="text-lg font-black italic text-white uppercase tracking-wider flex items-center">
                    <Users size={20} className="mr-2 text-[#00FF41]" /> Players
                </h3>
                <span className="text-[#00FF41] font-bold text-sm">{players.length} <span className="text-gray-500">/ {session.maxPlayers}</span></span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {players.map((player) => (
                    <div key={player.id} onClick={() => { triggerHaptic('light'); onPlayerClick?.(player.id); }} className="flex items-center justify-between bg-[#001645] border border-[#002266] p-3 rounded-xl hover:border-[#00FF41]/30 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3">
                            <div className={`rounded-full transition-all duration-500 ${getRankFrameClass(player.rankFrame).replace('ring-4', 'ring-2')}`}>
                                <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full border-2 border-[#000B29] object-cover" style={{ backgroundColor: getAvatarColor(player.avatar) }} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white flex items-center group-hover:text-[#00FF41] transition-colors">{player.name} {player.id === currentUser.id && <span className="ml-2 text-[10px] text-[#00FF41] bg-[#00FF41]/10 px-1.5 rounded uppercase tracking-wider">You</span>}</div>
                                <div className="flex items-center gap-2 mt-0.5"><span className="text-[10px] font-mono text-yellow-500 font-bold">{player.points} Points</span><span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide border-l border-gray-700 pl-2">{player.id === session.hostId ? 'Organizer' : 'Player'}</span></div>
                            </div>
                        </div>
                        {player.id === session.hostId && (<div className="bg-[#00FF41] text-[#000B29] text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider -skew-x-12"> <span className="skew-x-12 inline-block">Host</span> </div>)}
                    </div>
                ))}
                {Array.from({ length: Math.max(0, session.maxPlayers - players.length) }).map((_, i) => (<div key={`empty-${i}`} className="flex items-center justify-center p-3 rounded-xl border border-dashed border-[#002266] bg-[#000B29]/30 text-gray-600 text-xs font-bold uppercase tracking-wider">Available Spot</div>))}
            </div>
        </div>
    );

    const renderBillSummary = () => {
        if (!session.finalBill) {
            return (
                <div className="flex flex-col items-center justify-center py-16 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-[#00FF41] blur-2xl opacity-10 rounded-full"></div>
                        <div className="w-20 h-20 bg-[#001645] border border-[#002266] rounded-2xl flex items-center justify-center relative shadow-xl transform -rotate-6">
                            <Receipt size={40} className="text-gray-500" />
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#000B29] border border-[#002266] rounded-full flex items-center justify-center">
                                <span className="text-[#00FF41] font-black text-xs">?</span>
                            </div>
                        </div>
                    </div>

                    <h3 className="text-xl font-black italic uppercase text-white tracking-tighter mb-2">
                        No <span className="text-gray-600">Bill</span> Yet
                    </h3>

                    <p className="text-xs font-bold text-gray-400 text-center max-w-[200px] uppercase tracking-wide mb-8">
                        Session expenses haven't been calculated.
                    </p>

                    {isHost ? (
                        <button
                            onClick={() => { triggerHaptic('medium'); setShowEndSessionForm(true); }}
                            className="group relative px-8 py-4 bg-[#00FF41] hover:bg-white text-[#000B29] font-black uppercase tracking-widest text-sm rounded-none -skew-x-12 shadow-[0_0_30px_rgba(0,255,65,0.2)] transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:-translate-y-1 active:translate-y-0 active:scale-95"
                        >
                            <span className="skew-x-12 flex items-center gap-2">
                                <Calculator size={16} strokeWidth={3} />
                                <span>Calculate Bill</span>
                            </span>
                        </button>
                    ) : (
                        <div className="px-4 py-2 bg-[#000B29] border border-[#002266] rounded text-[10px] text-gray-400 font-mono uppercase">
                            Waiting for Host
                        </div>
                    )}
                </div>
            );
        }

        // Determine what to show based on split mode
        const isMatchedSplit = session.finalBill.splitMode === 'MATCHES';

        return (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="bg-[#001645] border border-[#002266] rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Receipt size={100} className="text-[#00FF41]" /></div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-6 relative z-10">Session <span className="text-[#00FF41]">Bill</span></h3>
                    <div className="grid grid-cols-3 gap-4 mb-6 relative z-10">
                        <div className="bg-[#000B29] p-3 rounded-lg border border-[#002266] flex flex-col items-center"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Court</span><span className="text-lg font-mono font-bold text-white">${session.finalBill.totalCourtPrice}</span></div>
                        <div className="bg-[#000B29] p-3 rounded-lg border border-[#002266] flex flex-col items-center"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shuttles</span><span className="text-lg font-mono font-bold text-white">${session.finalBill.totalShuttlePrice}</span><span className="text-[9px] text-gray-600 font-bold">({session.finalBill.shuttlesUsed} x ${session.finalBill.pricePerShuttle})</span></div>
                        <div className="bg-[#000B29] p-3 rounded-lg border border-[#00FF41]/30 flex flex-col items-center shadow-[0_0_15px_rgba(0,255,65,0.1)]"><span className="text-[10px] font-bold text-[#00FF41] uppercase tracking-widest">Total</span><span className="text-xl font-mono font-black text-[#00FF41]">${session.finalBill.totalCost}</span></div>
                    </div>
                    <div className="space-y-2 relative z-10">
                        <div className="flex justify-between px-2 mb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Player</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{isMatchedSplit ? 'Games / Cost' : 'Time / Cost'}</span>
                        </div>
                        {session.finalBill.items.map(item => {
                            const user = allUsers.find(u => u.id === item.userId);
                            if (!user) return null;
                            const isHighest = item.amount === Math.max(...session.finalBill!.items.map(i => i.amount));
                            const pStats = playerStats[item.userId] || { played: 0 };

                            return (
                                <div key={item.userId} onClick={() => { triggerHaptic('light'); onPlayerClick?.(item.userId); }} className="flex items-center justify-between bg-[#000B29] border border-[#002266] p-3 rounded-lg cursor-pointer hover:border-[#00FF41]/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`rounded-full transition-all duration-500 ${getRankFrameClass(user.rankFrame).replace('ring-4', 'ring-2')}`}>
                                            <img src={user.avatar} className="w-8 h-8 rounded-full border border-gray-700 object-cover" style={{ backgroundColor: getAvatarColor(user.avatar) }} />
                                        </div>
                                        <div><span className="text-sm font-bold text-white block">{user.name}</span>{user.id === currentUser.id && <span className="text-[9px] text-[#00FF41] font-bold uppercase tracking-wider">You</span>}</div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`block font-mono font-bold ${isHighest ? 'text-yellow-500' : 'text-white'}`}>${item.amount}</span>
                                        <span className="text-[10px] text-gray-500 font-medium">
                                            {isMatchedSplit
                                                ? `${pStats.played} Matches`
                                                : `${Math.floor(item.durationMinutes / 60)}h ${item.durationMinutes % 60}m`
                                            }
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderScoreboard = () => {
        const stats: Record<string, { wins: number; losses: number; pointsChange: number }> = {};
        (session.checkedInPlayerIds || []).forEach(pid => { stats[pid] = { wins: 0, losses: 0, pointsChange: 0 }; });
        (session.matches || []).forEach(match => {
            const winners = match.winningTeamIndex === 1 ? match.team1Ids : match.team2Ids;
            const losers = match.winningTeamIndex === 1 ? match.team2Ids : match.team1Ids;
            const change = match.pointsChange || 25;
            winners.forEach(pid => { if (!stats[pid]) stats[pid] = { wins: 0, losses: 0, pointsChange: 0 }; stats[pid].wins += 1; stats[pid].pointsChange += change; });
            losers.forEach(pid => { if (!stats[pid]) stats[pid] = { wins: 0, losses: 0, pointsChange: 0 }; stats[pid].losses += 1; stats[pid].pointsChange -= change; });
        });
        const sortedPlayerIds = Object.keys(stats).sort((a, b) => { if (stats[b].wins !== stats[a].wins) return stats[b].wins - stats[a].wins; return stats[b].pointsChange - stats[a].pointsChange; });

        return (
            <div className="space-y-8 animate-in slide-in-from-left duration-300 pb-12">
                {/* Session Rankings */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#002266] pb-2">
                        <h4 className="text-xs font-black uppercase tracking-widest text-[#00FF41] flex items-center">
                            <Trophy size={14} className="mr-2" /> Session Rankings
                        </h4>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{sortedPlayerIds.length} Players</span>
                    </div>
                    {sortedPlayerIds.length === 0 ? (<div className="text-center py-10 text-gray-500 font-bold text-sm">No matches played this session.</div>) : (
                        <div className="space-y-2">
                            {sortedPlayerIds.map((pid, index) => {
                                const user = allUsers.find(u => u.id === pid);
                                if (!user) return null;
                                const s = stats[pid];
                                let rankStyle = "bg-[#000B29] border-[#002266] text-white";
                                let rankBadge = <span className="text-gray-500 font-mono text-xs w-6 text-center">{index + 1}</span>;
                                if (index === 0) { rankStyle = "bg-gradient-to-r from-[#000B29] to-[#001645] border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]"; rankBadge = <Trophy size={16} className="text-yellow-500 w-6" />; }
                                else if (index === 1) { rankStyle = "bg-[#000B29] border-gray-400/50"; rankBadge = <span className="text-gray-300 font-black text-xs w-6 text-center">2</span>; }
                                else if (index === 2) { rankStyle = "bg-[#000B29] border-orange-700/50"; rankBadge = <span className="text-orange-700 font-black text-xs w-6 text-center">3</span>; }
                                return (
                                    <div key={pid} onClick={() => { triggerHaptic('light'); onPlayerClick?.(pid); }} className={`flex items-center justify-between p-3 rounded-xl border ${rankStyle} transition-all cursor-pointer hover:scale-[1.01]`}>
                                        <div className="flex items-center gap-3">
                                            {rankBadge}
                                            <div className="relative">
                                                <div className={`rounded-full transition-all duration-500 ${getRankFrameClass(user.rankFrame).replace('ring-4', 'ring-2')}`}>
                                                    <img src={user.avatar} className="w-10 h-10 rounded-full border border-[#000B29] object-cover" style={{ backgroundColor: getAvatarColor(user.avatar) }} />
                                                </div>
                                                {index === 0 && <div className="absolute -top-1 -right-1 text-[8px] bg-yellow-500 text-black px-1 rounded-full font-black">MVP</div>}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold flex items-center">{user.name}{user.id === currentUser.id && <span className="ml-2 text-[8px] text-[#00FF41] bg-[#00FF41]/10 px-1 rounded uppercase tracking-wider">You</span>}</div>
                                                <div className="flex items-center gap-3 mt-1"><span className="text-[10px] font-bold text-green-400 flex items-center bg-green-900/20 px-1.5 rounded"><Plus size={8} className="mr-0.5" />{s.wins} W</span><span className="text-[10px] font-bold text-red-400 flex items-center bg-red-900/20 px-1.5 rounded"><Minus size={8} className="mr-0.5" />{s.losses} L</span></div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-xs font-mono font-black flex items-center justify-end ${s.pointsChange >= 0 ? 'text-[#00FF41]' : 'text-red-500'}`}>
                                                {s.pointsChange > 0 ? <TrendingUp size={12} className="mr-1" /> : (s.pointsChange < 0 ? <TrendingDown size={12} className="mr-1" /> : null)}
                                                {s.pointsChange > 0 ? '+' : ''}{s.pointsChange}
                                            </div>
                                            <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Points Change</div>
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

    return (
        <div className="fixed inset-0 z-[150] bg-[#000B29] text-white overflow-hidden animate-fade-in">
            <div className="h-[100dvh] flex flex-col max-w-2xl mx-auto bg-[#000B29] shadow-2xl shadow-black relative overflow-hidden">
                {/* Sticky Header with Safe Area Support */}
                <div className="sticky top-0 z-30 bg-[#000B29]/95 backdrop-blur-md border-b border-[#002266] pt-[env(safe-area-inset-top)]">
                    <div className="px-4 h-16 shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => { triggerHaptic('light'); onClose(); }} className="p-2 -ml-2 text-gray-400 hover:text-[#00FF41] hover:bg-[#001645] rounded-full transition-all"><ArrowLeft size={24} /></button>
                            <h1 className="text-sm font-bold uppercase tracking-widest text-gray-400"> {status === 'PLAYING' ? 'Live Session' : (status === 'END' ? 'Session Report' : 'Session Details')} </h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleManualRefresh} className={`p-2 rounded-full transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest ${isRefreshingManual ? 'text-[#00FF41] bg-[#001645]' : 'text-gray-400 hover:text-[#00FF41] hover:bg-[#001645]'}`}>
                                <RefreshCw size={18} className={isRefreshingManual ? "animate-spin" : ""} />
                                {isRefreshingManual && <span>Syncing</span>}
                            </button>
                            <button onClick={status === 'END' ? () => setIsShareReportOpen(true) : handleCopyLink} className={`p-2 rounded-full transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest ${isCopied ? 'bg-[#00FF41] text-[#000B29]' : 'text-gray-400 hover:text-[#00FF41] hover:bg-[#001645]'}`}>
                                <Share2 size={18} />
                                {isCopied && <span>Copied!</span>}
                            </button>
                            {isHost && status === 'PLAYING' && (<button onClick={() => { triggerHaptic('medium'); setShowEndSessionForm(true); }} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 px-3 py-1.5 rounded-sm text-xs font-black uppercase tracking-wider transition-all"><Square size={14} fill="currentColor" /><span>End Session</span></button>)}
                            {isHost && status === 'OPEN' && onEdit && (
                                <button onClick={() => { triggerHaptic('medium'); onEdit(session.id); }} className="p-2 text-gray-400 hover:text-white hover:bg-[#001645] rounded-full transition-all">
                                    <Pencil size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <PullToRefresh onRefresh={onRefresh} className="flex-1 min-h-0 overflow-y-auto">
                    {status === 'PLAYING' ? (
                        <div className="bg-[#001645] border-b border-[#002266] h-12 overflow-hidden relative flex items-center shadow-lg z-10">
                            <style>{` @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } } .animate-marquee { animation: marquee 20s linear infinite; will-change: transform; } `}</style>
                            <div className="animate-marquee whitespace-nowrap font-black uppercase tracking-widest text-sm flex items-center min-w-full">
                                <span className="mx-4 text-[#00FF41] flex items-center"><span className="w-2 h-2 bg-[#00FF41] rounded-full mr-2 animate-pulse shadow-[0_0_10px_#00FF41]"></span>Playing Now</span>
                                <span className="text-gray-600 mx-2 text-[10px]">•</span>
                                <span className="mx-4 text-white flex items-center"><MapPin size={14} className="mr-2 text-gray-400" />{session.location}</span>
                                <span className="text-gray-600 mx-2 text-[10px]">•</span>
                                <span className="mx-4 text-white flex items-center"><Clock size={14} className="mr-2 text-gray-400" />{formatTime(session.startTime)} - {formatTime(session.endTime)}</span>
                            </div>
                            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#001645] to-transparent z-20 pointer-events-none"></div>
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#001645] to-transparent z-20 pointer-events-none"></div>
                        </div>
                    ) : (
                        <div className="bg-[#001645] border-b border-[#002266] p-6 pb-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF41] opacity-5 transform rotate-45 translate-x-10 -translate-y-10 blur-3xl pointer-events-none"></div>
                            <div className="flex items-start gap-5 relative z-10">
                                <div className="bg-[#000B29] border border-[#002266] p-2 w-20 h-24 rounded-lg flex flex-col items-center justify-center shrink-0 shadow-xl group">
                                    <span className="text-[10px] font-bold text-[#00FF41] uppercase tracking-widest mb-1">{weekday}</span>
                                    <span className="text-4xl font-black text-white leading-none tracking-tighter group-hover:scale-110 transition-transform">{day}</span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase mt-1">{month}</span>
                                </div>
                                <div className="flex-1 pt-1 min-w-0">
                                    <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter text-white leading-tight mb-1 break-words">{session.title || session.location}</h2>

                                    {session.title && (
                                        <div className="flex items-center text-xs text-gray-400 font-bold uppercase tracking-widest mb-2 ml-0.5">
                                            <MapPin size={12} className="mr-1.5 text-[#00FF41]" />
                                            {session.location}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        {status === 'END' && <span className="inline-flex items-center px-2.5 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-[#002266] text-gray-400 border border-[#003399]">Done</span>}
                                        <div className="flex items-center text-xs text-gray-300 font-bold bg-[#000B29]/50 px-2.5 py-1.5 rounded-sm border border-[#002266]"><Clock size={12} className="mr-1.5 text-[#00FF41]" />{formatTime(session.startTime)} - {formatTime(session.endTime)}</div>
                                        <div className="flex items-center text-xs text-gray-300 font-bold bg-[#000B29]/50 px-2.5 py-1.5 rounded-sm border border-[#002266]"><Timer size={12} className="mr-1.5 text-[#00FF41]" />{durationString}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'END' && (<div className="px-4 pt-4 -mb-2"> <div className="flex p-1 bg-[#000F33] border border-[#002266] rounded-lg"> <button onClick={() => { triggerHaptic('light'); setActiveTab('scoreboard'); }} className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-md transition-all ${activeTab === 'scoreboard' ? 'bg-[#00FF41] text-[#000B29] shadow-md' : 'text-gray-500 hover:text-white'}`}>Scoreboard</button> <button onClick={() => { triggerHaptic('light'); setActiveTab('bill'); }} className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-md transition-all ${activeTab === 'bill' ? 'bg-[#00FF41] text-[#000B29] shadow-md' : 'text-gray-500 hover:text-white'}`}>Session Bill</button> </div> </div>)}
                    <div className="p-4 sm:p-6 space-y-6"> {status === 'PLAYING' ? <>{renderNextMatchups()}{renderLiveCourts()}{renderCheckInList()}</> : status === 'END' ? (activeTab === 'scoreboard' ? renderScoreboard() : renderBillSummary()) : renderNormalPlayerList()} </div>
                </PullToRefresh>

                {/* Fixed Action Bar at Bottom */}
                <div className="shrink-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-[#000B29]/95 backdrop-blur-xl border-t border-[#002266] z-40">
                    {isHost ? (
                        <div className={`grid gap-4 ${status === 'OPEN' ? 'grid-cols-[1fr_2fr]' : 'grid-cols-1'}`}>
                            {status === 'OPEN' && <button onClick={() => setConfirmConfig({ isOpen: true, title: 'Delete Session', message: 'This action is permanent and will remove the session from the arena. Proceed?', action: () => { triggerHaptic('heavy'); onDelete(session.id); }, isDestructive: true, confirmLabel: 'Delete Session' })} className="flex items-center justify-center py-3.5 rounded-none skew-x-[-6deg] bg-red-900/20 border border-red-900/50 text-red-500 hover:bg-red-900/40 transition-colors font-black uppercase tracking-wider text-sm"><span className="skew-x-[6deg] flex items-center"><Trash2 size={16} className="mr-2" />Delete</span></button>}
                            {status === 'OPEN' && <button onClick={handleOpenStartModal} disabled={isTooEarlyToStart} className={`flex items-center justify-center py-3.5 rounded-none skew-x-[-6deg] font-black uppercase tracking-widest text-sm shadow-lg transition-all ${isTooEarlyToStart ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' : 'bg-[#00FF41] text-[#000B29] hover:bg-white hover:shadow-[0_0_20px_rgba(0,255,65,0.4)]'}`}><div className="skew-x-[6deg] flex items-center">{isTooEarlyToStart ? <><Lock size={16} className="mr-2" />Wait until {formatTime(new Date(startTimeObj.getTime() - START_THRESHOLD_MINUTES * 60000).toISOString())}</> : <><Play size={18} className="mr-2 fill-current" />Start Session</>}</div></button>}
                            {status === 'END' && (
                                <div className="flex flex-col gap-3">
                                    <button onClick={() => setIsShareReportOpen(true)} className="w-full flex items-center justify-center py-3.5 rounded-none skew-x-[-6deg] bg-[#00FF41] text-[#000B29] hover:bg-white transition-colors font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(0,255,65,0.3)]"><span className="skew-x-[6deg] flex items-center gap-2"><Share2 size={18} />Share Results</span></button>
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="w-full">
                            {isJoined ? (
                                <div className="flex flex-col gap-3">
                                    {status === 'END' ? (
                                        <button onClick={() => setIsShareReportOpen(true)} className="w-full flex items-center justify-center py-4 rounded-none skew-x-[-6deg] bg-[#00FF41] text-[#000B29] hover:bg-white transition-colors font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(0,255,65,0.3)]"><span className="skew-x-[6deg] flex items-center gap-2"><Share2 size={18} />Share Results</span></button>
                                    ) : (
                                        <button onClick={() => setConfirmConfig({ isOpen: true, title: 'Leave Session', message: 'Are you sure?', action: () => { triggerHaptic('medium'); onLeave(session.id); onClose(); }, isDestructive: true, confirmLabel: 'Leave' })} className="w-full flex items-center justify-center py-4 rounded-none skew-x-[-6deg] border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors font-black uppercase tracking-widest text-sm"><span className="skew-x-[6deg] flex items-center"><LogOut size={16} className="mr-2" />Leave Session</span></button>
                                    )}
                                </div>
                            ) : <button onClick={() => { triggerHaptic('success'); onJoin(session.id); }} disabled={isFull || status === 'END'} className={`w-full flex items-center justify-center py-4 rounded-none skew-x-[-6deg] font-black uppercase tracking-widest text-sm shadow-lg transition-all ${isFull || status === 'END' ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' : 'bg-[#00FF41] text-[#000B29] hover:bg-white hover:shadow-[0_0_20px_rgba(0,255,65,0.4)]'}`}><div className="skew-x-[6deg] flex items-center">{isFull ? 'Session Full' : (status === 'END' ? 'Session Ended' : 'Join Session')}</div></button>}
                        </div>
                    )}
                </div>

                {/* Modals */}
                <ShareReportModal
                    isOpen={isShareReportOpen}
                    onClose={() => setIsShareReportOpen(false)}
                    user={currentUser}
                    session={session}
                    stats={personalReportStats}
                />

                {isStartModalOpen && (<div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200"> <div className="bg-[#001645] border border-[#002266] w-full max-sm:max-w-xs max-w-sm rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"> <div className="bg-[#000B29] p-4 border-b border-[#002266] flex justify-between items-center"><h3 className="text-white font-bold uppercase tracking-wider flex items-center gap-2"><CheckCircle size={18} className="text-[#00FF41]" />Check-in Players</h3><button onClick={() => { triggerHaptic('light'); setIsStartModalOpen(false); }} className="p-1 text-gray-400 hover:text-white"><X size={20} /></button></div> <div className="p-2 border-b border-[#002266] bg-[#000F33]"><button onClick={handleSelectAllStartCheckIn} className="w-full py-2 text-xs font-bold uppercase tracking-wider text-[#00FF41] hover:bg-[#001645] rounded transition-colors">{startCheckInIds.length === players.length ? 'Deselect All' : 'Select All'}</button></div> <div className="p-4 overflow-y-auto flex-1 space-y-2">{players.map(player => { const isChecked = startCheckInIds.includes(player.id); return (<div key={player.id} onClick={() => handleToggleStartCheckIn(player.id)} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-[#002266] border-[#00FF41]' : 'bg-[#000B29] border-[#002266] hover:border-gray-500'}`}><div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${isChecked ? 'bg-[#00FF41]' : 'bg-transparent border-gray-500'}`}>{isChecked && <Check size={14} className="text-[#000B29] stroke-[4]" />}</div><div className={`rounded-full transition-all duration-500 ${getRankFrameClass(player.rankFrame).replace('ring-4', 'ring-2')}`}> <img src={player.avatar} className="w-8 h-8 rounded-full border border-[#000B29] object-cover" style={{ backgroundColor: getAvatarColor(player.avatar) }} /> </div> <span className={`text-sm font-bold ml-3 ${isChecked ? 'text-white' : 'text-gray-400'}`}>{player.name}</span></div>) })}</div> <div className="p-4 border-t border-[#002266] bg-[#000B29]">
                    <button
                        onClick={confirmStartSession}
                        disabled={startCheckInIds.length === 0}
                        className={`w-full py-3.5 font-black uppercase tracking-wider text-xs rounded-none skew-x-[-6deg] shadow-lg transition-all ${startCheckInIds.length === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-[#00FF41] text-[#000B29] hover:bg-white hover:shadow-[0_0_20px_rgba(0,255,65,0.4)]'}`}
                    >
                        <span className="skew-x-12">{startCheckInIds.length === 0 ? 'Select Players' : 'Confirm & Start'}</span>
                    </button>
                </div> </div> </div>)}

                {editingCourt !== null && (
                    <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-[#001645] border border-[#002266] w-full max-w-md rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                            <div className="p-4 border-b border-[#002266] flex justify-between items-center bg-[#000B29]"> <h3 className="text-white font-bold uppercase tracking-wider flex items-center gap-2"> {isQueueingMatch ? 'Queue Next Match' : `Assign Court ${editingCourt + 1}`} </h3> </div>
                            <div className="bg-[#00123a] p-4 border-b border-[#002266]">
                                <div className="bg-[#000B29] border border-[#002266] rounded-xl p-3 relative overflow-hidden">
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"><div className="bg-[#000B29] border border-[#002266] text-gray-500 text-[10px] font-black w-8 h-8 flex items-center justify-center rounded-full shadow-lg">VS</div></div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="text-center">
                                            <div className="mb-2 flex flex-col items-center"> <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Blue Team</span> <span className="text-[9px] font-mono text-gray-500">{tempStats.t1Avg > 0 ? `${tempStats.t1Avg} RP` : '0 RP'}</span> </div>
                                            <div className="space-y-2"> {[0, 1].map(i => { const playerId = tempSelectedPlayers[i]; const user = allUsers.find(u => u.id === playerId); return (<div key={i} onClick={() => playerId && handleRemovePlayerFromSlot(i)} className={`h-12 border rounded transition-all flex items-center justify-center relative group cursor-pointer ${playerId ? 'bg-[#001645] border-blue-500/30 hover:border-red-500/50 hover:bg-red-500/10' : 'border-dashed border-[#002266] bg-[#000B29]/50 text-[10px] text-gray-600'}`} > {playerId && user ? (<div className="flex items-center gap-2 text-left w-full px-2"> <div className={`rounded-full transition-all duration-500 ${getRankFrameClass(user.rankFrame).replace('ring-4', 'ring-2')}`}> <img src={user.avatar} className="w-6 h-6 rounded-full border border-[#000B29] object-cover shrink-0" style={{ backgroundColor: getAvatarColor(user.avatar) }} /> </div> <div className="min-w-0 flex-1"> <p className="text-[10px] font-bold text-white truncate leading-none">{user.name.split(' ')[0]}</p> </div> <div className="p-1 text-gray-500 group-hover:text-red-500 transition-colors"> <X size={12} /> </div> </div>) : (<span>Slot {i + 1}</span>)} </div>); })} </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="mb-2 flex flex-col items-center"> <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Red Team</span> <span className="text-[9px] font-mono text-gray-500">{tempStats.t2Avg > 0 ? `${tempStats.t2Avg} RP` : '0 RP'}</span> </div>
                                            <div className="space-y-2"> {[2, 3].map(i => { const playerId = tempSelectedPlayers[i]; const user = allUsers.find(u => u.id === playerId); return (<div key={i} onClick={() => playerId && handleRemovePlayerFromSlot(i)} className={`h-12 border rounded transition-all flex items-center justify-center relative group cursor-pointer ${playerId ? 'bg-[#001645] border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10' : 'border-dashed border-[#002266] bg-[#000B29]/50 text-[10px] text-gray-600'}`} > {playerId && user ? (<div className="flex items-center flex-row-reverse gap-2 text-right w-full px-2"> <div className={`rounded-full transition-all duration-500 ${getRankFrameClass(user.rankFrame).replace('ring-4', 'ring-2')}`}> <img src={user.avatar} className="w-8 h-8 rounded-full border-red-500 object-cover shrink-0" style={{ backgroundColor: getAvatarColor(user.avatar) }} /> </div> <div className="min-w-0 flex-1"> <p className="text-[10px] font-bold text-white truncate leading-none">{user.name.split(' ')[0]}</p> </div> <div className="p-1 text-gray-500 group-hover:text-red-500 transition-colors"> <X size={12} /> </div> </div>) : (<span>Slot {i + 1}</span>)} </div>); })} </div>
                                        </div>
                                    </div>
                                    {tempStats && selectedCount === 4 && <div className="absolute bottom-1 left-0 right-0 text-center pointer-events-none"><span className={`text-[9px] font-black px-1.5 py-0.5 rounded backdrop-blur ${tempStats.diff < 50 ? 'bg-[#00FF41]/20 text-[#00FF41]' : 'bg-yellow-500/20 text-yellow-500'}`}>RP Diff: {tempStats.diff}</span></div>}
                                </div>
                                {varietyWarning && (
                                    <div className="mt-3 flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-500 text-[10px] font-bold">
                                        <AlertTriangle size={14} className="shrink-0 animate-bounce" />
                                        <span>{varietyWarning} Consider swapping players for variety.</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 overflow-y-auto flex-1">
                                <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center"><Users size={12} className="mr-2" /> Available Players</h4>
                                <div className="space-y-2">{checkedInIds.filter(pid => { if (tempSelectedPlayers.includes(pid)) return false; const currentCourt = getPlayerCourtIndex(pid); if (currentCourt !== null && currentCourt !== editingCourt && !isQueueingMatch) return false; return true; }).map(playerId => { const user = allUsers.find(u => u.id === playerId); if (!user) return null; const pStats = playerStats[playerId] || { played: 0 }; return (<button key={playerId} onClick={() => handleSelectAvailablePlayer(playerId)} className="w-full flex items-center justify-between p-3 rounded-lg border bg-[#000B29] border-[#002266] hover:border-gray-500 transition-all group"><div className="flex items-center gap-3"><div className={`rounded-full transition-all duration-500 ${getRankFrameClass(user.rankFrame).replace('ring-4', 'ring-2')}`}><img src={user.avatar} className="w-8 h-8 rounded-full border border-[#000B29] object-cover" style={{ backgroundColor: getAvatarColor(user.avatar) }} /></div><div className="text-left"><span className="text-sm font-bold text-white block">{user.name}</span><div className="flex items-center gap-2"><span className="text-[10px] text-yellow-500 font-mono font-bold">{user.points} RP</span><span className="text-[10px] text-gray-500 font-bold">•</span><span className="text-[10px] text-blue-400 font-bold">{pStats.played} Played</span></div></div></div><div className="w-6 h-6 rounded-full bg-[#00FF41]/10 flex items-center justify-center group-hover:bg-[#00FF41] transition-colors"><Plus size={14} className="text-[#00FF41] group-hover:text-[#000B29]" /></div></button>); })}</div>
                            </div>
                            <div className="p-4 bg-[#000B29] border-t border-[#002266] flex gap-3">
                                <button onClick={() => { triggerHaptic('light'); setEditingCourt(null); setIsQueueingMatch(false); }} className="py-3.5 px-3 border border-[#002266] hover:bg-[#001645] text-gray-400 hover:text-white transition-colors font-black uppercase tracking-wider text-xs rounded-none skew-x-[-6deg]"><span className="skew-x-[6deg] inline-block">Cancel</span></button>
                                <button onClick={handleRandomize} className="flex-1 py-3.5 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white transition-colors font-black uppercase tracking-wider text-xs rounded-none skew-x-[-6deg]"><span className="skew-x-[6deg] flex items-center justify-center gap-2"><Dices size={14} /> Random</span></button>
                                <button onClick={saveCourtAssignment} disabled={!canStartMatch} className={`flex-1 py-3.5 font-black uppercase tracking-wider text-xs rounded-none skew-x-[-6deg] shadow-lg flex items-center justify-center transition-all ${canStartMatch ? (isQueueingMatch ? 'bg-[#003399] hover:bg-blue-600 text-white' : 'bg-[#00FF41] hover:bg-white text-[#000B29]') : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'}`}><span className="skew-x-[6deg] flex items-center">{canStartMatch && (isQueueingMatch ? <ListPlus size={14} className="mr-2" /> : <Play size={14} className="mr-2 fill-current" />)}{isQueueingMatch ? 'Queue Match' : 'Start Match'}</span></button>
                            </div>
                        </div>
                    </div>
                )}

                {showEndSessionForm && (
                    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                        <div className="bg-[#001645] border border-[#002266] w-full max-sm:max-w-xs max-w-sm rounded-xl overflow-hidden shadow-2xl flex flex-col">
                            <div className="bg-[#000B29] p-6 border-b border-[#002266]">
                                <h3 className="text-xl font-black italic uppercase text-white tracking-wider flex items-center"><Calculator size={20} className="mr-2 text-[#00FF41]" />Expenses</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-[#00FF41] uppercase tracking-wider mb-1">Total Court Price</label>
                                    <input type="number" className="w-full bg-[#000B29] border border-[#002266] text-white p-3 rounded focus:border-[#00FF41] outline-none font-mono font-bold" value={costForm.totalCourtPrice || ''} onChange={e => setCostForm({ ...costForm, totalCourtPrice: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-[#00FF41] uppercase tracking-wider mb-1">Shuttles Used</label>
                                        <input type="number" className="w-full bg-[#000B29] border border-[#002266] text-white p-3 rounded focus:border-[#00FF41] outline-none font-mono font-bold" value={costForm.shuttlesUsed || ''} onChange={e => setCostForm({ ...costForm, shuttlesUsed: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-[#00FF41] uppercase tracking-wider mb-1">Price / Shuttle</label>
                                        <input type="number" className="w-full bg-[#000B29] border border-[#002266] text-white p-3 rounded focus:border-[#00FF41] outline-none font-mono font-bold" value={costForm.pricePerShuttle || ''} onChange={e => setCostForm({ ...costForm, pricePerShuttle: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>

                                {/* Split Mode Toggle */}
                                <div className="bg-[#000B29] p-1 rounded-lg border border-[#002266] flex">
                                    <button
                                        onClick={() => { triggerHaptic('light'); setSplitMode('EQUAL'); }}
                                        className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1.5 ${splitMode === 'EQUAL' ? 'bg-[#001645] text-white shadow-md border border-[#002266]' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        <Users size={12} /> Equal Split
                                    </button>
                                    <button
                                        onClick={() => { triggerHaptic('light'); setSplitMode('MATCHES'); }}
                                        className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1.5 ${splitMode === 'MATCHES' ? 'bg-[#001645] text-white shadow-md border border-[#002266]' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        <Swords size={12} /> By Matches
                                    </button>
                                </div>

                                <div className="bg-[#000B29] p-4 rounded border border-dashed border-[#00FF41]/30 mt-4">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-xs text-gray-400 uppercase font-bold">Total Cost</span>
                                        <span className="text-xl text-[#00FF41] font-mono font-black">${liveBillPreview.totalCost}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex border-t border-[#002266]">
                                <button onClick={() => { triggerHaptic('light'); setShowEndSessionForm(false); }} className="flex-1 py-4 bg-[#000F33] hover:bg-[#001645] text-gray-400 hover:text-white font-bold uppercase tracking-wider text-xs transition-colors border-r border-[#002266]">Cancel</button>
                                <button onClick={() => { triggerHaptic('heavy'); onEnd(session.id, { ...costForm, splitMode }); setShowEndSessionForm(false); }} className="flex-1 py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-black uppercase tracking-wider text-xs transition-all">Calculate & End</button>
                            </div>
                        </div>
                    </div>
                )}

                {finishingGameCourt !== null && (<div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200"> <div className="bg-[#001645] border border-[#002266] w-full max-sm:max-w-xs max-w-sm rounded-xl overflow-hidden shadow-2xl flex flex-col"> <div className="bg-[#000B29] p-4 border-b border-[#002266] flex justify-between items-center"><h3 className="text-white font-bold uppercase tracking-wider">Match Result</h3><button onClick={() => { triggerHaptic('light'); setFinishingGameCourt(null); }} className="p-1 text-gray-400 hover:text-white"><X size={20} /></button></div>
                    <div className="p-6">
                        <p className="text-center text-gray-400 text-xs font-bold uppercase tracking-wider mb-6">Who won the match?</p>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {/* Blue Team Selection */}
                            <button
                                onClick={() => { triggerHaptic('light'); setPendingWinner(1); }}
                                className={`relative p-4 rounded-xl flex flex-col items-center gap-3 transition-all overflow-hidden group
                        ${pendingWinner === 1
                                        ? 'bg-blue-600 border border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.5)] scale-[1.02]'
                                        : 'bg-[#000B29] border border-blue-500/30 hover:border-blue-500 hover:bg-blue-900/20'
                                    }`}
                            >
                                {pendingWinner === 1 && (
                                    <div className="absolute top-2 right-2 bg-white text-blue-600 rounded-full p-0.5 shadow-sm animate-in zoom-in duration-200">
                                        <Check size={12} strokeWidth={4} />
                                    </div>
                                )}
                                <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${pendingWinner === 1 ? 'text-blue-100' : 'text-blue-500'}`}>Blue Team</span>
                                {/* Avatars */}
                                <div className="flex -space-x-2">
                                    {getTeamsForCourt(finishingGameCourt).team1.map(p => (
                                        <div key={p.id} className={`rounded-full transition-all duration-500 ${getRankFrameClass(p.rankFrame).replace('ring-4', 'ring-2')}`}>
                                            <img src={p.avatar} className={`w-8 h-8 rounded-full border-2 object-cover ${pendingWinner === 1 ? 'border-white' : 'border-[#000B29]'}`} style={{ backgroundColor: getAvatarColor(p.avatar) }} />
                                        </div>
                                    ))}
                                </div>
                                <span className={`text-xs font-bold mt-1 text-center truncate w-full px-1 ${pendingWinner === 1 ? 'text-white' : 'text-white'}`}>
                                    {getTeamsForCourt(finishingGameCourt).team1.map(p => p.name.split(' ')[0]).join(' & ')}
                                </span>
                            </button>

                            {/* Red Team Selection */}
                            <button
                                onClick={() => { triggerHaptic('light'); setPendingWinner(2); }}
                                className={`relative p-4 rounded-xl flex flex-col items-center gap-3 transition-all overflow-hidden group
                        ${pendingWinner === 2
                                        ? 'bg-red-600 border border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.5)] scale-[1.02]'
                                        : 'bg-[#001645] border border-red-500/30 hover:border-red-500 hover:bg-red-900/20'
                                    }`}
                            >
                                {pendingWinner === 2 && (
                                    <div className="absolute top-2 right-2 bg-white text-red-600 rounded-full p-0.5 shadow-sm animate-in zoom-in duration-200">
                                        <Check size={12} strokeWidth={4} />
                                    </div>
                                )}
                                <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${pendingWinner === 2 ? 'text-red-100' : 'text-red-500'}`}>Red Team</span>
                                {/* Avatars */}
                                <div className="flex -space-x-2">
                                    {getTeamsForCourt(finishingGameCourt).team2.map(p => (
                                        <div key={p.id} className={`rounded-full transition-all duration-500 ${getRankFrameClass(p.rankFrame).replace('ring-4', 'ring-2')}`}>
                                            <img src={p.avatar} className={`w-8 h-8 rounded-full border-2 object-cover ${pendingWinner === 2 ? 'border-white' : 'border-[#000B29]'}`} style={{ backgroundColor: getAvatarColor(p.avatar) }} />
                                        </div>
                                    ))}
                                </div>
                                <span className={`text-xs font-bold mt-1 text-center truncate w-full px-1 ${pendingWinner === 2 ? 'text-white' : 'text-white'}`}>
                                    {getTeamsForCourt(finishingGameCourt).team2.map(p => p.name.split(' ')[0]).join(' & ')}
                                </span>
                            </button>
                        </div>

                        {/* Confirm Button */}
                        <button
                            disabled={!pendingWinner}
                            onClick={() => {
                                if (pendingWinner) {
                                    triggerHaptic('success');
                                    // No await, immediate UI update
                                    onRecordMatchResult(session.id, finishingGameCourt, pendingWinner);
                                    setFinishingGameCourt(null);
                                    setPendingWinner(null);
                                }
                            }}
                            className={`w-full py-4 mb-4 font-black uppercase tracking-widest text-sm rounded transition-all shadow-lg
                    ${pendingWinner
                                    ? 'bg-[#00FF41] text-[#000B29] hover:bg-white hover:shadow-[0_0_30px_rgba(0,255,65,0.4)] transform hover:-translate-y-1'
                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                                }`}
                        >
                            Confirm Result
                        </button>

                        <div className="pt-4 border-t border-[#002266]"><button onClick={() => { triggerHaptic('heavy'); onCourtAssignment(session.id, finishingGameCourt, []); setFinishingGameCourt(null); setPendingWinner(null); }} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white border border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)] font-black uppercase tracking-widest text-xs transition-all rounded hover:shadow-[0_0_25px_rgba(220,38,38,0.6)]">Cancel Match (No Result)</button></div>
                    </div>
                </div> </div>)}

                <ConfirmationModal isOpen={!!confirmConfig} title={confirmConfig?.title || ''} message={confirmConfig?.message || ''} confirmLabel={confirmConfig?.confirmLabel} isDestructive={confirmConfig?.isDestructive} onConfirm={() => { triggerHaptic('medium'); confirmConfig?.action(); setConfirmConfig(null); }} onCancel={() => { triggerHaptic('light'); setConfirmConfig(null); }} />
            </div>
        </div>
    );
};

export default SessionDetailModal;
