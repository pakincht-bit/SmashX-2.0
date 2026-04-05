import React, { useMemo, useState, useEffect } from 'react';
import { User, Session } from '../types';
import { Trophy, Activity, Swords, Users, ChevronRight, Loader2 } from 'lucide-react';
import { getAvatarColor, getNextTierProgress, getWinRateColor, triggerHaptic, mapSessionFromDB } from '../utils';
import { supabase } from '../services/supabaseClient';

interface StatsPageProps {
    currentUser: User;
    allUsers: User[];
    sessions: Session[];
    onOpenTiers: () => void;
}

const StatsPage: React.FC<StatsPageProps> = ({ currentUser, allUsers, sessions, onOpenTiers }) => {
    const rankProgression = useMemo(() => getNextTierProgress(currentUser.points), [currentUser.points]);

    const [allTimeSessions, setAllTimeSessions] = useState<Session[]>(sessions);
    const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

    useEffect(() => {
        const fetchAllTimeHistory = async () => {
            setIsLoadingData(true);
            try {
                const { data, error } = await supabase
                    .from('sessions')
                    .select('*')
                    .contains('player_ids', [currentUser.id]);

                if (data && !error) {
                    setAllTimeSessions(data.map(mapSessionFromDB));
                }
            } catch (err) {
                console.error("StatsPage: failed to fetch all time history", err);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchAllTimeHistory();
    }, [currentUser.id]);

    // 2. Global Analytics Computation
    const {
        duoPartner, frequentDuo, archNemesis, easyTarget,
        last10Matches, currentStreak, maxWinStreak
    } = useMemo(() => {
        const stats: Record<string, { playedWith: number, wonWith: number, playedAgainst: number, lostAgainst: number }> = {};

        let allMyMatches: { match: any, won: boolean, timestamp: Date }[] = [];

        allTimeSessions.forEach(session => {
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

        return {
            duoPartner: getPlayerObj(bestDuo),
            frequentDuo: getPlayerObj(freqDuo),
            archNemesis: getPlayerObj(worstEnemy),
            easyTarget: getPlayerObj(bestTarget),
            last10Matches: last10,
            currentStreak: { count: curStr, type: isWinStreak ? 'W' : 'L' },
            maxWinStreak: maxWStr
        };
    }, [allTimeSessions, currentUser.id, allUsers]);

    return (
        <div className="animate-fade-in-up space-y-8 pb-32">
            {isLoadingData && (
                <div className="bg-[#000B29] border-b border-[#002266]/50 flex items-center justify-center p-4">
                    <Loader2 className="animate-spin text-[#00FF41]" size={20} />
                    <span className="ml-2 text-xs text-gray-400 font-bold uppercase tracking-wider">Syncing True All-Time Match Data...</span>
                </div>
            )}


            {/* Form & Streaks Section */}
            <section className="space-y-1 pt-4">
                <h3 className="text-xl mb-4 font-black italic uppercase tracking-tighter text-white m-0 flex items-center gap-2">
                    Form & <span className="text-gray-500">Streaks</span>
                </h3>

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
            <section className="space-y-4 pt-4 border-t border-[#002266]/50">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-white m-0 flex items-center gap-2">
                    Social <span className="text-gray-500">Synergies</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {/* Frequent Duo */}
                    <div className="bg-gradient-to-r from-blue-500/10 to-transparent border-l-2 border-l-blue-500/50 rounded-none p-3.5 flex items-center justify-between relative overflow-hidden gap-2">
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
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                    PARTNER
                                </div>
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
                    <div className="bg-gradient-to-r from-[#00FF41]/10 to-transparent border-l-2 border-l-[#00FF41]/50 rounded-none p-3.5 flex items-center justify-between relative overflow-hidden gap-2">
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
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#00FF41] text-[#000B29] text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(0,255,65,0.5)] whitespace-nowrap">
                                    DUO
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black uppercase tracking-tighter text-[#00FF41] leading-none italic mb-0.5">Highest WR</span>
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
                    <div className="bg-gradient-to-r from-orange-500/10 to-transparent border-l-2 border-l-orange-500/50 rounded-none p-3.5 flex items-center justify-between relative overflow-hidden gap-2">
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
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(249,115,22,0.5)]">
                                    TARGET
                                </div>
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
                    <div className="bg-gradient-to-r from-red-500/10 to-transparent border-l-2 border-l-red-500/50 rounded-none p-3.5 flex items-center justify-between relative overflow-hidden gap-2">
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
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(239,68,68,0.5)] whitespace-nowrap">
                                    KRYPTONITE
                                </div>
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
        </div>
    );
};

export default StatsPage;
