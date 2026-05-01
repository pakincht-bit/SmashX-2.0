import React, { useMemo, useState, useEffect } from 'react';
import { User, Session } from '../types';
import { Trophy, Activity, Swords, Users, ChevronRight, Loader2 } from 'lucide-react';
import { getAvatarColor, getNextTierProgress, getWinRateColor, triggerHaptic, mapSessionFromDB, getRankFrameClass } from '../utils';
import { supabase } from '../services/supabaseClient';

interface StatsPageProps {
    currentUser: User;
    allUsers: User[];
    sessions: Session[];
    onOpenTiers: () => void;
    onPlayerClick?: (userId: string) => void;
}

// Module-level cache for all-time sessions (offline-resilience pattern)
let globalAllTimeSessions: Session[] | null = null;
let globalAllTimeSessionsUserId: string | null = null;
let globalAllTimeSessionsFetchTime: number = 0;

const StatsPage: React.FC<StatsPageProps> = ({ currentUser, allUsers, sessions, onOpenTiers, onPlayerClick }) => {
    const rankProgression = useMemo(() => getNextTierProgress(currentUser.points), [currentUser.points]);

    const [allTimeSessions, setAllTimeSessions] = useState<Session[]>(
        globalAllTimeSessions && globalAllTimeSessionsUserId === currentUser.id ? globalAllTimeSessions : sessions
    );
    const [isLoadingData, setIsLoadingData] = useState<boolean>(
        !globalAllTimeSessions || globalAllTimeSessionsUserId !== currentUser.id
    );
    const [encounterTab, setEncounterTab] = useState<'teammates' | 'opponents'>('teammates');
    const [encounterSort, setEncounterSort] = useState<{ col: 'gp' | 'w' | 'l' | 'wr'; dir: 'desc' | 'asc' }>({ col: 'gp', dir: 'desc' });

    const handleEncounterSort = (col: 'gp' | 'w' | 'l' | 'wr') => {
        setEncounterSort(prev => prev.col === col ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' });
    };

    useEffect(() => {
        const fetchAllTimeHistory = async () => {
            const now = Date.now();
            const hasValidCache = globalAllTimeSessions && 
                                  globalAllTimeSessionsUserId === currentUser.id && 
                                  (now - globalAllTimeSessionsFetchTime < 5 * 60 * 1000);

            if (hasValidCache) return;

            if (!globalAllTimeSessions || globalAllTimeSessionsUserId !== currentUser.id) {
                setIsLoadingData(true);
            }
            try {
                const { data, error } = await supabase
                    .from('sessions')
                    .select('*')
                    .contains('player_ids', [currentUser.id]);

                if (data && !error) {
                    const mapped = data.map(mapSessionFromDB);
                    setAllTimeSessions(mapped);
                    globalAllTimeSessions = mapped;
                    globalAllTimeSessionsUserId = currentUser.id;
                    globalAllTimeSessionsFetchTime = Date.now();
                }
            } catch (err) {
                console.error("StatsPage: failed to fetch all time history", err);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchAllTimeHistory();
    }, [currentUser.id]);

    // Merge cached all-time sessions with live incoming sessions from App.tsx
    const mergedSessions = useMemo(() => {
        const sessionMap = new Map<string, Session>();
        allTimeSessions.forEach(s => sessionMap.set(s.id, s));
        sessions.forEach(s => sessionMap.set(s.id, s));
        return Array.from(sessionMap.values());
    }, [allTimeSessions, sessions]);

    // 2. Global Analytics Computation
    const {
        duoPartner, frequentDuo, archNemesis, easyTarget,
        last10Matches, currentStreak, maxWinStreak, allPlayerStats
    } = useMemo(() => {
        const stats: Record<string, { playedWith: number, wonWith: number, playedAgainst: number, lostAgainst: number }> = {};

        let allMyMatches: { match: any, won: boolean, timestamp: Date }[] = [];

        mergedSessions.forEach(session => {
            if (!session.matches) return;
            session.matches.forEach(match => {
                const isTeam1 = match.team1Ids.includes(currentUser.id);
                const isTeam2 = match.team2Ids.includes(currentUser.id);
                if (!isTeam1 && !isTeam2) return;

                const team1Won = match.winningTeamIndex === 1;
                const iWon = (isTeam1 && team1Won) || (isTeam2 && !team1Won);

                allMyMatches.push({
                    match,
                    won: iWon,
                    timestamp: new Date(match.timestamp || session.startTime)
                });

                const myTeam = isTeam1 ? match.team1Ids : match.team2Ids;
                const enemyTeam = isTeam1 ? match.team2Ids : match.team1Ids;

                myTeam.forEach((id: string) => {
                    if (id === currentUser.id) return;
                    if (!stats[id]) stats[id] = { playedWith: 0, wonWith: 0, playedAgainst: 0, lostAgainst: 0 };
                    stats[id].playedWith++;
                    if (iWon) stats[id].wonWith++;
                });

                enemyTeam.forEach((id: string) => {
                    if (!stats[id]) stats[id] = { playedWith: 0, wonWith: 0, playedAgainst: 0, lostAgainst: 0 };
                    stats[id].playedAgainst++;
                    if (!iWon) stats[id].lostAgainst++;
                });
            });
        });

        // Compute strengths
        let bestDuo = null;
        let maxDuoScore = -1;

        let freqDuo = null;
        let maxFreqPlayed = -1;

        let worstEnemy = null;
        let maxNemesisScore = -1;

        let bestTarget = null;
        let maxTargetWins = -1;

        for (const [id, s] of Object.entries(stats)) {
            // duo score: win rate + volume weighting
            if (s.playedWith > 0) {
                const winRate = s.wonWith / s.playedWith;
                // Simple score: winRate * 100 + wonWith (to break ties and reward volume)
                const score = (winRate * 100) + s.wonWith;
                if (score > maxDuoScore) {
                    maxDuoScore = score;
                    bestDuo = { id, stat: s, winRate };
                }

                if (s.playedWith > maxFreqPlayed) {
                    maxFreqPlayed = s.playedWith;
                    freqDuo = { id, stat: s, winRate };
                }
            }

            // nemesis score: we want the person who beat us the most. 
            if (s.playedAgainst > 0) {
                if (s.lostAgainst > maxNemesisScore) {
                    maxNemesisScore = s.lostAgainst;
                    worstEnemy = { id, stat: s };
                }

                const wonAgainst = s.playedAgainst - s.lostAgainst;
                if (wonAgainst > maxTargetWins) {
                    maxTargetWins = wonAgainst;
                    bestTarget = { id, stat: s, winRate: s.playedAgainst > 0 ? wonAgainst / s.playedAgainst : 0 };
                }
            }
        }

        allMyMatches.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        // Compute streaks
        let curStr = 0;
        let maxWStr = 0;
        let isWinStreak = true;
        let tempWinStr = 0;

        for (const m of allMyMatches) {
            if (m.won) {
                tempWinStr++;
                if (tempWinStr > maxWStr) maxWStr = tempWinStr;
            } else {
                tempWinStr = 0;
            }
        }

        // Current streak (working backwards)
        if (allMyMatches.length > 0) {
            isWinStreak = allMyMatches[allMyMatches.length - 1].won;
            for (let i = allMyMatches.length - 1; i >= 0; i--) {
                if (allMyMatches[i].won === isWinStreak) {
                    curStr++;
                } else {
                    break;
                }
            }
        }

        const last10 = allMyMatches.slice(-10).map(m => m.won);

        const getPlayerObj = (data: any) => {
            if (!data) return null;
            const u = allUsers.find(user => user.id === data.id);
            return u ? { user: u, stat: data.stat, winRate: data.winRate } : null;
        };

        const allPlayerStats = Object.entries(stats)
            .map(([id, stat]) => {
                const user = allUsers.find(u => u.id === id);
                return { user, stat };
            })
            .filter(item => item.user != null)
            .sort((a, b) => {
                const totalA = a.stat.playedWith + a.stat.playedAgainst;
                const totalB = b.stat.playedWith + b.stat.playedAgainst;
                return totalB - totalA;
            });

        return {
            duoPartner: getPlayerObj(bestDuo),
            frequentDuo: getPlayerObj(freqDuo),
            archNemesis: getPlayerObj(worstEnemy),
            easyTarget: getPlayerObj(bestTarget),
            last10Matches: last10,
            currentStreak: { count: curStr, type: isWinStreak ? 'W' : 'L' },
            maxWinStreak: maxWStr,
            allPlayerStats
        };
    }, [mergedSessions, currentUser.id, allUsers]);

    return (
        <div className="animate-fade-in-up space-y-8 pb-20">
            {isLoadingData ? (
                <div className="flex flex-col items-center justify-center py-32 min-h-[50vh] animate-pulse">
                    <Loader2 className="animate-spin text-[#00FF41] mb-6" size={40} />
                    <span className="text-xs text-[#00FF41] font-black uppercase tracking-widest text-center">Syncing True All-Time<br />Match Data...</span>
                    <p className="text-[10px] text-gray-500 font-bold mt-4 uppercase tracking-widest">Crunching the numbers</p>
                </div>
            ) : (
                <>
                    {/* Form & Streaks Section */}
                    <section className="space-y-1">


                        <div className="grid grid-cols-2 gap-1">
                            {/* Current Streak */}
                            <div className="bg-[#001030] rounded-none p-4 flex flex-col justify-center items-center relative overflow-hidden">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Current Streak</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-4xl font-black italic tracking-tighter ${currentStreak.type === 'W' && currentStreak.count > 0 ? 'text-[#00FF41]' : currentStreak.type === 'L' && currentStreak.count > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                        {currentStreak.count > 0 ? `${currentStreak.count}${currentStreak.type}` : '-'}
                                    </span>
                                </div>
                            </div>
                            {/* Max Win Streak */}
                            <div className="bg-[#001030] rounded-none p-4 flex flex-col justify-center items-center relative overflow-hidden">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#00FF41] mb-1">Best Win Streak</span>
                                <div className="flex items-center">
                                    <span className="text-4xl font-black italic tracking-tighter text-white">{maxWinStreak}</span>
                                </div>
                            </div>
                        </div>

                        {/* Last 10 Matches Form */}
                        <div className="bg-[#001030] rounded-none p-5 flex flex-col gap-3 relative overflow-hidden">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black uppercase tracking-widest text-gray-500">Last 10 Matches Form</span>
                                {/* Summary of L10 */}
                                <span className="text-xs font-bold text-white bg-[#000B29] px-2 py-1 rounded">
                                    {last10Matches.filter(w => w).length}W - {last10Matches.filter(w => !w).length}L
                                </span>
                            </div>
                            <div className="flex items-center gap-2 w-full">
                                {last10Matches.length === 0 ? (
                                    <span className="text-sm font-bold text-gray-600 italic">No matches played yet.</span>
                                ) : (
                                    last10Matches.map((won, idx) => (
                                        <div key={idx} className={`flex-1 h-2 rounded-full ${won ? 'bg-[#00FF41] shadow-[0_0_10px_rgba(0,255,65,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
                                    ))
                                )}
                                {/* Fill empty slots with gray if < 10 matches */}
                                {Array.from({ length: Math.max(0, 10 - last10Matches.length) }).map((_, idx) => (
                                    <div key={`empty-${idx}`} className="flex-1 h-2 rounded-full bg-gray-800" />
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Social Rivalries Section */}
                    <section className="space-y-4">
                        <h3 className="text-xl font-black italic uppercase tracking-tighter text-white m-0 flex items-center gap-2">
                            Social <span className="text-gray-500">Synergies</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                            {/* Frequent Duo */}
                            <div onClick={() => frequentDuo && onPlayerClick?.(frequentDuo.user.id)} className={`bg-gradient-to-r from-blue-500/10 to-transparent border-l-2 border-l-blue-500/50 rounded-none p-3.5 flex items-center justify-between relative overflow-hidden gap-2 ${frequentDuo ? 'cursor-pointer active:bg-blue-500/20 transition-colors' : ''}`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="relative shrink-0">
                                        {frequentDuo ? (
                                            <img src={frequentDuo.user.avatar} className="w-14 h-14 rounded-full border-2 border-[#000B29] object-cover bg-gray-600" alt={frequentDuo.user.name} />
                                        ) : (
                                            <div className="w-14 h-14 rounded-full border-2 border-[#002266] bg-[#000B29] flex justify-center items-center">
                                                <Users size={20} className="text-gray-600" />
                                            </div>
                                        )}

                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black uppercase tracking-tighter text-blue-400 leading-none italic mb-0.5">Most Played</span>
                                        {frequentDuo ? (
                                            <span className="text-sm font-bold text-white leading-none truncate max-w-[120px]">{frequentDuo.user.name}</span>
                                        ) : (
                                            <span className="text-sm font-bold text-gray-500 italic leading-none">No Data Yet</span>
                                        )}
                                    </div>
                                </div>

                                {frequentDuo && (
                                    <div className="flex items-center gap-3 z-10 shrink-0">
                                        <span className="text-xs font-bold text-[#00FF41] leading-none mr-1">{frequentDuo.stat.wonWith}W <span className="text-gray-500 mx-0.5">/</span> <span className="text-red-400">{frequentDuo.stat.playedWith - frequentDuo.stat.wonWith}L</span></span>
                                        <div className="border border-[#002266] bg-[#000B29] rounded-none px-3 py-2 flex flex-col items-center justify-center min-w-[65px]">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1.5">Matches</span>
                                            <span className="text-lg font-black text-white italic leading-none">{frequentDuo.stat.playedWith}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Duo Partner */}
                            <div onClick={() => duoPartner && onPlayerClick?.(duoPartner.user.id)} className={`bg-gradient-to-r from-[#00FF41]/10 to-transparent border-l-2 border-l-[#00FF41]/50 rounded-none p-3.5 flex items-center justify-between relative overflow-hidden gap-2 ${duoPartner ? 'cursor-pointer active:bg-[#00FF41]/20 transition-colors' : ''}`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF41]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="relative shrink-0">
                                        {duoPartner ? (
                                            <img src={duoPartner.user.avatar} className="w-14 h-14 rounded-full border-2 border-[#000B29] object-cover bg-gray-600" alt={duoPartner.user.name} />
                                        ) : (
                                            <div className="w-14 h-14 rounded-full border-2 border-[#002266] bg-[#000B29] flex justify-center items-center">
                                                <Users size={20} className="text-gray-600" />
                                            </div>
                                        )}

                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black uppercase tracking-tighter text-[#00FF41] leading-none italic mb-0.5">Best DUO</span>
                                        {duoPartner ? (
                                            <span className="text-sm font-bold text-white leading-none truncate max-w-[120px]">{duoPartner.user.name}</span>
                                        ) : (
                                            <span className="text-sm font-bold text-gray-500 italic leading-none">No Data Yet</span>
                                        )}
                                    </div>
                                </div>

                                {duoPartner && (
                                    <div className="flex items-center gap-3 z-10 shrink-0">
                                        <span className="text-xs font-bold text-[#00FF41] leading-none mr-1">{duoPartner.stat.wonWith}W <span className="text-gray-500 mx-0.5">/</span> <span className="text-red-400">{duoPartner.stat.playedWith - duoPartner.stat.wonWith}L</span></span>
                                        <div className="border border-[#002266] bg-[#000B29] rounded-none px-3 py-2 flex flex-col items-center justify-center min-w-[65px]">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1.5">Win Rate</span>
                                            <span className="text-lg font-black text-[#00FF41] italic leading-none">{(duoPartner.winRate * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Easy Target */}
                            <div onClick={() => easyTarget && onPlayerClick?.(easyTarget.user.id)} className={`bg-gradient-to-r from-orange-500/10 to-transparent border-l-2 border-l-orange-500/50 rounded-none p-3.5 flex items-center justify-between relative overflow-hidden gap-2 ${easyTarget ? 'cursor-pointer active:bg-orange-500/20 transition-colors' : ''}`}>
                                <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl translate-y-1/2 translate-x-1/2"></div>

                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="relative shrink-0">
                                        {easyTarget ? (
                                            <img src={easyTarget.user.avatar} className="w-14 h-14 rounded-full border-2 border-[#000B29] object-cover bg-gray-600" alt={easyTarget.user.name} />
                                        ) : (
                                            <div className="w-14 h-14 rounded-full border-2 border-[#002266] bg-[#000B29] flex justify-center items-center">
                                                <Swords size={20} className="text-gray-600" />
                                            </div>
                                        )}

                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black uppercase tracking-tighter text-orange-500 leading-none italic mb-0.5">Most Wins</span>
                                        {easyTarget ? (
                                            <span className="text-sm font-bold text-white leading-none truncate max-w-[120px]">{easyTarget.user.name}</span>
                                        ) : (
                                            <span className="text-sm font-bold text-gray-500 italic leading-none">No Enemies Yet</span>
                                        )}
                                    </div>
                                </div>

                                {easyTarget && (
                                    <div className="flex items-center gap-3 z-10 shrink-0">
                                        <span className="text-xs font-bold text-[#00FF41] leading-none mr-1">{easyTarget.stat.playedAgainst - easyTarget.stat.lostAgainst}W <span className="text-gray-500 mx-0.5">/</span> <span className="text-red-400">{easyTarget.stat.lostAgainst}L</span></span>
                                        <div className="border border-[#002266] bg-[#000B29] rounded-none px-3 py-2 flex flex-col items-center justify-center min-w-[65px]">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1.5">Win Rate</span>
                                            <span className="text-lg font-black text-[#00FF41] italic leading-none">{(easyTarget.winRate * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Arch Nemesis */}
                            <div onClick={() => archNemesis && onPlayerClick?.(archNemesis.user.id)} className={`bg-gradient-to-r from-red-500/10 to-transparent border-l-2 border-l-red-500/50 rounded-none p-3.5 flex items-center justify-between relative overflow-hidden gap-2 ${archNemesis ? 'cursor-pointer active:bg-red-500/20 transition-colors' : ''}`}>
                                <div className="absolute bottom-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl translate-y-1/2 translate-x-1/2"></div>

                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="relative shrink-0">
                                        {archNemesis ? (
                                            <img src={archNemesis.user.avatar} className="w-14 h-14 rounded-full border-2 border-[#000B29] object-cover bg-gray-600" alt={archNemesis.user.name} />
                                        ) : (
                                            <div className="w-14 h-14 rounded-full border-2 border-[#002266] bg-[#000B29] flex justify-center items-center">
                                                <Swords size={20} className="text-gray-600" />
                                            </div>
                                        )}

                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black uppercase tracking-tighter text-red-500 leading-none italic mb-0.5">Most Losses</span>
                                        {archNemesis ? (
                                            <span className="text-sm font-bold text-white leading-none truncate max-w-[120px]">{archNemesis.user.name}</span>
                                        ) : (
                                            <span className="text-sm font-bold text-gray-500 italic leading-none">No Enemies Yet</span>
                                        )}
                                    </div>
                                </div>

                                {archNemesis && (
                                    <div className="flex items-center gap-3 z-10 shrink-0">
                                        <span className="text-xs font-bold text-[#00FF41] leading-none mr-1">{archNemesis.stat.playedAgainst - archNemesis.stat.lostAgainst}W <span className="text-gray-500 mx-0.5">/</span> <span className="text-red-400">{archNemesis.stat.lostAgainst}L</span></span>
                                        <div className="border border-red-900/50 bg-[#000B29] rounded-none px-3 py-2 flex flex-col items-center justify-center min-w-[65px]">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1.5">Win Rate</span>
                                            <span className="text-lg font-black text-red-500 italic leading-none">{((1 - (archNemesis.stat.lostAgainst / archNemesis.stat.playedAgainst)) * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Player Encounters Section */}
                    <section className="-mx-4 sm:-mx-6 space-y-2 mt-8">
                        <div className="flex border-b border-navy-border w-full">
                            <button 
                                onClick={() => setEncounterTab('teammates')}
                                className={`flex-1 pb-3 pt-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 mb-[-1px] ${encounterTab === 'teammates' ? 'text-neon-primary border-neon-primary' : 'text-gray-500 border-transparent'}`}
                            >
                                Teammates
                            </button>
                            <button 
                                onClick={() => setEncounterTab('opponents')}
                                className={`flex-1 pb-3 pt-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 mb-[-1px] ${encounterTab === 'opponents' ? 'text-orange-500 border-orange-500' : 'text-gray-500 border-transparent'}`}
                            >
                                Opponents
                            </button>
                        </div>

                        <div className="flex flex-col gap-0">
                            {/* Column Headers */}
                            {allPlayerStats.filter(p => encounterTab === 'teammates' ? p.stat.playedWith > 0 : p.stat.playedAgainst > 0).length > 0 && (
                                <div className="flex items-center justify-between py-2 px-4 sm:px-6 border-b border-navy-border">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 flex-1">Player</span>
                                    <div className="flex items-center shrink-0">
                                        {([['gp', 'M', 'w-10'], ['w', 'W', 'w-10'], ['l', 'L', 'w-10'], ['wr', 'WR%', 'w-12']] as const).map(([key, label, width]) => (
                                            <button
                                                key={key}
                                                onClick={() => handleEncounterSort(key)}
                                                className={`text-[9px] font-black uppercase tracking-widest ${width} text-center transition-colors flex items-center justify-center gap-0.5 ${encounterSort.col === key ? (key === 'l' ? 'text-red-500' : key === 'gp' ? 'text-white' : 'text-neon-primary') : 'text-gray-600'}`}
                                            >
                                                {label}
                                                {encounterSort.col === key && (
                                                    <span className="text-[8px]">{encounterSort.dir === 'desc' ? '▼' : '▲'}</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {allPlayerStats
                                .filter(p => encounterTab === 'teammates' ? p.stat.playedWith > 0 : p.stat.playedAgainst > 0)
                                .sort((a, b) => {
                                    const isTeam = encounterTab === 'teammates';
                                    const getVal = (p: typeof a) => {
                                        const total = isTeam ? p.stat.playedWith : p.stat.playedAgainst;
                                        const wins = isTeam ? p.stat.wonWith : (p.stat.playedAgainst - p.stat.lostAgainst);
                                        const losses = isTeam ? (p.stat.playedWith - p.stat.wonWith) : p.stat.lostAgainst;
                                        const wr = total > 0 ? wins / total : 0;
                                        switch (encounterSort.col) {
                                            case 'gp': return total;
                                            case 'w': return wins;
                                            case 'l': return losses;
                                            case 'wr': return wr;
                                        }
                                    };
                                    const diff = getVal(b) - getVal(a);
                                    return encounterSort.dir === 'desc' ? diff : -diff;
                                })
                                .map(p => {
                                    const total = encounterTab === 'teammates' ? p.stat.playedWith : p.stat.playedAgainst;
                                    const wins = encounterTab === 'teammates' ? p.stat.wonWith : (p.stat.playedAgainst - p.stat.lostAgainst);
                                    const losses = encounterTab === 'teammates' ? (p.stat.playedWith - p.stat.wonWith) : p.stat.lostAgainst;
                                    const winRate = total > 0 ? ((wins / total) * 100).toFixed(0) : '0';
                                    
                                    return (
                                        <div key={p.user!.id} onClick={() => onPlayerClick?.(p.user!.id)} className={`py-3 px-4 sm:px-6 flex items-center justify-between cursor-pointer active:bg-white/5 transition-colors group ${encounterTab === 'teammates' ? 'bg-blue-500/[0.08]' : 'bg-orange-500/[0.10]'}`}>
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`relative shrink-0 rounded-full transition-all duration-500 ${getRankFrameClass(p.user!.rankFrame).replace('ring-4', 'ring-2')}`}>
                                                    <img src={p.user!.avatar} alt={p.user!.name} className="w-10 h-10 rounded-full border border-navy-border object-cover shrink-0 relative z-10" style={{ backgroundColor: getAvatarColor(p.user!.avatar) }} />
                                                </div>
                                                <span className="text-sm font-bold text-white leading-none truncate">{p.user!.name}</span>
                                            </div>
                                            
                                            <div className="flex items-center shrink-0">
                                                <span className="text-xs font-bold text-white w-10 text-center">{total}</span>
                                                <span className="text-xs font-bold text-neon-primary w-10 text-center">{wins}</span>
                                                <span className="text-xs font-bold text-red-500 w-10 text-center">{losses}</span>
                                                <span className={`text-xs font-black italic w-12 text-center ${parseInt(winRate) >= 50 ? 'text-neon-primary' : 'text-orange-500'}`}>{winRate}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {allPlayerStats.filter(p => encounterTab === 'teammates' ? p.stat.playedWith > 0 : p.stat.playedAgainst > 0).length === 0 && (
                                    <div className="text-center py-8 px-4 sm:px-6">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">No {encounterTab} found</span>
                                    </div>
                                )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default StatsPage;
