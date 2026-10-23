import React, { useMemo, useState, useEffect } from 'react';
import { User, Session } from '../types';
import { Trophy, Activity, Swords, Users, ChevronRight, Loader2 } from 'lucide-react';
import { getAvatarColor, getNextTierProgress, getWinRateColor, triggerHaptic, getRankFrameClass } from '../utils';
import {
    fetchAllTimeSessions,
    getCachedAllTimeSessions,
    isAllTimeSessionsCacheFresh,
    mergeSessionsWithLive,
} from '../services/allTimeSessions';

interface StatsPageProps {
    currentUser: User;
    allUsers: User[];
    sessions: Session[];
    onOpenTiers: () => void;
    onPlayerClick?: (userId: string) => void;
}

const StatsPage: React.FC<StatsPageProps> = ({ currentUser, allUsers, sessions, onOpenTiers, onPlayerClick }) => {
    const rankProgression = useMemo(() => getNextTierProgress(currentUser.points), [currentUser.points]);

    const cached = getCachedAllTimeSessions(currentUser.id);
    const [allTimeSessions, setAllTimeSessions] = useState<Session[]>(cached ?? sessions);
    const [isLoadingData, setIsLoadingData] = useState<boolean>(!cached);
    const [encounterTab, setEncounterTab] = useState<'teammates' | 'opponents'>('teammates');
    const [encounterSort, setEncounterSort] = useState<{ col: 'gp' | 'w' | 'l' | 'wr'; dir: 'desc' | 'asc' }>({ col: 'gp', dir: 'desc' });

    const handleEncounterSort = (col: 'gp' | 'w' | 'l' | 'wr') => {
        setEncounterSort(prev => prev.col === col ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' });
    };

    useEffect(() => {
        const fetchAllTimeHistory = async () => {
            if (isAllTimeSessionsCacheFresh(currentUser.id)) return;

            if (!getCachedAllTimeSessions(currentUser.id)) {
                setIsLoadingData(true);
            }
            try {
                const mapped = await fetchAllTimeSessions(currentUser.id);
                setAllTimeSessions(mapped);
            } catch (err) {
                console.error("StatsPage: failed to fetch all time history", err);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchAllTimeHistory();
    }, [currentUser.id]);

    // Merge cached all-time sessions with live incoming sessions from App.tsx
    const mergedSessions = useMemo(
        () => mergeSessionsWithLive(allTimeSessions, sessions),
        [allTimeSessions, sessions]
    );
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
                    {/* Player Encounters Section */}
                    <section className="-mx-4 sm:-mx-6 space-y-2">
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
