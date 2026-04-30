import re

with open('components/PlayerProfileModal.tsx', 'r') as f:
    content = f.read()

# 1. Update imports
if 'import { Users, Swords }' not in content:
    content = content.replace('import { X, Trophy, Target, History, Calendar } from \'lucide-react\';', 
                              'import { X, Trophy, Target, History, Calendar, Users, Swords } from \'lucide-react\';')

# 2. Inject socialStats computation
social_stats_logic = """
  const socialStats = useMemo(() => {
    if (!user) return null;
    const stats: Record<string, { playedWith: number, wonWith: number, playedAgainst: number, lostAgainst: number }> = {};
    
    sessions.forEach(session => {
        if (!session.matches) return;
        session.matches.forEach(match => {
            const isTeam1 = match.team1Ids.includes(user.id);
            const isTeam2 = match.team2Ids.includes(user.id);
            if (!isTeam1 && !isTeam2) return;

            const team1Won = match.winningTeamIndex === 1;
            const iWon = (isTeam1 && team1Won) || (isTeam2 && !team1Won);

            const myTeam = isTeam1 ? match.team1Ids : match.team2Ids;
            const enemyTeam = isTeam1 ? match.team2Ids : match.team1Ids;

            myTeam.forEach((id: string) => {
                if (id === user.id) return;
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

    let bestDuo = null;
    let maxDuoScore = -1;
    let freqDuo = null;
    let maxFreqPlayed = -1;
    let worstEnemy = null;
    let maxNemesisScore = -1;
    let bestTarget = null;
    let maxTargetWins = -1;

    for (const [id, s] of Object.entries(stats)) {
        if (s.playedWith > 0) {
            const winRate = s.wonWith / s.playedWith;
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

    const getPlayerObj = (data: any) => {
        if (!data) return null;
        const u = allUsers.find(u => u.id === data.id);
        return u ? { user: u, stat: data.stat, winRate: data.winRate } : null;
    };

    return {
        duoPartner: getPlayerObj(bestDuo),
        frequentDuo: getPlayerObj(freqDuo),
        archNemesis: getPlayerObj(worstEnemy),
        easyTarget: getPlayerObj(bestTarget),
    };
  }, [user, sessions, allUsers]);

"""

if 'const socialStats =' not in content:
    content = content.replace('  if (!isOpen || !user) return null;', social_stats_logic + '  if (!isOpen || !user) return null;')

# 3. Modify Grid layout to 3 cols and remove points
grid_match = re.search(r'\{\/\* Stats Grid \*\/\}.*?<div className="relative z-10 grid grid-cols-4 gap-2 mt-2 pt-6 border-t border-white/5">\s*<div className="flex flex-col items-center justify-center py-2">\s*<span className="text-lg font-black text-\[#00FF41\] font-mono leading-none">\{user\.points\}<\/span>\s*<span className="text-\[8px\] text-gray-500 uppercase font-bold tracking-widest mt-1">Points<\/span>\s*<\/div>\s*<div className="flex flex-col items-center justify-center py-2 border-l border-white/5">', content, re.DOTALL)

if grid_match:
    new_grid = """{/* Stats Grid */}
        <div className="relative z-10 grid grid-cols-3 gap-2 mt-2 pt-6 border-t border-white/5">
          <div className="flex flex-col items-center justify-center py-2">"""
    content = content[:grid_match.start()] + new_grid + content[grid_match.end():]

# 4. Add synergies UI at the end
synergies_ui = """
        {/* Social Synergies */}
        {socialStats && (socialStats.frequentDuo || socialStats.duoPartner || socialStats.easyTarget || socialStats.archNemesis) && (
          <div className="relative z-10 mt-6 pt-6 border-t border-white/5">
            <h3 className="text-sm font-black italic uppercase tracking-tighter text-white mb-4 flex items-center gap-2">
                Social <span className="text-gray-500">Synergies</span>
            </h3>
            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {/* Frequent Duo */}
                {socialStats.frequentDuo && (
                    <div className="bg-gradient-to-r from-blue-500/10 to-transparent border-l-2 border-l-blue-500/50 rounded-none p-3 flex items-center justify-between relative overflow-hidden gap-2">
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="relative shrink-0">
                                <img src={socialStats.frequentDuo.user.avatar} className="w-10 h-10 rounded-full border border-[#000B29] object-cover bg-gray-600" alt={socialStats.frequentDuo.user.name} />
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[6px] font-black uppercase px-1 py-0.5 rounded shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                    PARTNER
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-tighter text-blue-400 leading-none italic mb-0.5">Most Played</span>
                                <span className="text-xs font-bold text-white leading-none truncate max-w-[100px]">{socialStats.frequentDuo.user.name}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end z-10 shrink-0">
                            <span className="text-[10px] font-bold text-[#00FF41] leading-none mb-1">{socialStats.frequentDuo.stat.wonWith}W <span className="text-gray-500">/</span> <span className="text-red-400">{socialStats.frequentDuo.stat.playedWith - socialStats.frequentDuo.stat.wonWith}L</span></span>
                            <span className="text-xs font-black text-white italic leading-none">{socialStats.frequentDuo.stat.playedWith} Matches</span>
                        </div>
                    </div>
                )}
                
                {/* Best Duo */}
                {socialStats.duoPartner && (
                    <div className="bg-gradient-to-r from-[#00FF41]/10 to-transparent border-l-2 border-l-[#00FF41]/50 rounded-none p-3 flex items-center justify-between relative overflow-hidden gap-2">
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="relative shrink-0">
                                <img src={socialStats.duoPartner.user.avatar} className="w-10 h-10 rounded-full border border-[#000B29] object-cover bg-gray-600" alt={socialStats.duoPartner.user.name} />
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#00FF41] text-[#000B29] text-[6px] font-black uppercase px-1 py-0.5 rounded shadow-[0_0_10px_rgba(0,255,65,0.5)]">
                                    DUO
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-tighter text-[#00FF41] leading-none italic mb-0.5">Best DUO</span>
                                <span className="text-xs font-bold text-white leading-none truncate max-w-[100px]">{socialStats.duoPartner.user.name}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end z-10 shrink-0">
                            <span className="text-[10px] font-bold text-[#00FF41] leading-none mb-1">{socialStats.duoPartner.stat.wonWith}W <span className="text-gray-500">/</span> <span className="text-red-400">{socialStats.duoPartner.stat.playedWith - socialStats.duoPartner.stat.wonWith}L</span></span>
                            <span className="text-xs font-black text-[#00FF41] italic leading-none">{(socialStats.duoPartner.winRate * 100).toFixed(0)}% WR</span>
                        </div>
                    </div>
                )}

                {/* Target */}
                {socialStats.easyTarget && (
                    <div className="bg-gradient-to-r from-orange-500/10 to-transparent border-l-2 border-l-orange-500/50 rounded-none p-3 flex items-center justify-between relative overflow-hidden gap-2">
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="relative shrink-0">
                                <img src={socialStats.easyTarget.user.avatar} className="w-10 h-10 rounded-full border border-[#000B29] object-cover bg-gray-600" alt={socialStats.easyTarget.user.name} />
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[6px] font-black uppercase px-1 py-0.5 rounded shadow-[0_0_10px_rgba(249,115,22,0.5)]">
                                    TARGET
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-tighter text-orange-500 leading-none italic mb-0.5">Most Wins</span>
                                <span className="text-xs font-bold text-white leading-none truncate max-w-[100px]">{socialStats.easyTarget.user.name}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end z-10 shrink-0">
                            <span className="text-[10px] font-bold text-[#00FF41] leading-none mb-1">{socialStats.easyTarget.stat.playedAgainst - socialStats.easyTarget.stat.lostAgainst}W <span className="text-gray-500">/</span> <span className="text-red-400">{socialStats.easyTarget.stat.lostAgainst}L</span></span>
                            <span className="text-xs font-black text-[#00FF41] italic leading-none">{(socialStats.easyTarget.winRate * 100).toFixed(0)}% WR</span>
                        </div>
                    </div>
                )}

                {/* Nemesis */}
                {socialStats.archNemesis && (
                    <div className="bg-gradient-to-r from-red-500/10 to-transparent border-l-2 border-l-red-500/50 rounded-none p-3 flex items-center justify-between relative overflow-hidden gap-2">
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="relative shrink-0">
                                <img src={socialStats.archNemesis.user.avatar} className="w-10 h-10 rounded-full border border-[#000B29] object-cover bg-gray-600" alt={socialStats.archNemesis.user.name} />
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[6px] font-black uppercase px-1 py-0.5 rounded shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                    NEMESIS
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-tighter text-red-500 leading-none italic mb-0.5">Most Losses</span>
                                <span className="text-xs font-bold text-white leading-none truncate max-w-[100px]">{socialStats.archNemesis.user.name}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end z-10 shrink-0">
                            <span className="text-[10px] font-bold text-[#00FF41] leading-none mb-1">{socialStats.archNemesis.stat.playedAgainst - socialStats.archNemesis.stat.lostAgainst}W <span className="text-gray-500">/</span> <span className="text-red-400">{socialStats.archNemesis.stat.lostAgainst}L</span></span>
                            <span className="text-xs font-black text-red-500 italic leading-none">{((1 - (socialStats.archNemesis.stat.lostAgainst / socialStats.archNemesis.stat.playedAgainst)) * 100).toFixed(0)}% WR</span>
                        </div>
                    </div>
                )}
            </div>
          </div>
        )}
"""

if '{/* Social Synergies */}' not in content:
    # insert before the final closing divs of Profile Card Content
    content = content.replace('      </div>\n    </div>\n  </div>\n  );\n};\n', synergies_ui + '      </div>\n    </div>\n  </div>\n  );\n};\n')

    # Also make sure the container allows scrolling if needed
    content = content.replace('<div className="relative p-6 overflow-hidden">', '<div className="relative p-6 overflow-hidden max-h-[85vh] overflow-y-auto custom-scrollbar">')

with open('components/PlayerProfileModal.tsx', 'w') as f:
    f.write(content)
