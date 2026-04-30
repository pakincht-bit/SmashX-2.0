import re

with open('components/PlayerProfileModal.tsx', 'r') as f:
    content = f.read()

synergies_ui = """
        {/* Social Synergies */}
        {socialStats && (socialStats.frequentDuo || socialStats.duoPartner || socialStats.easyTarget || socialStats.archNemesis) && (
          <div className="relative z-10 mt-6 pt-6 border-t border-white/5 pb-2">
            <h3 className="text-sm font-black italic uppercase tracking-tighter text-white mb-4 flex items-center gap-2">
                Social <span className="text-gray-500">Synergies</span>
            </h3>
            <div className="grid grid-cols-1 gap-2 max-h-[300px] pr-2 custom-scrollbar">
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

      </div>
    </div>
  </div>
  );
};

export default PlayerProfileModal;"""

match = re.search(r'(\s*</div>\s*</div>\s*</div>\s*\);\s*};\s*export default PlayerProfileModal;\s*)$', content)
if match:
    content = content[:match.start()] + synergies_ui
    with open('components/PlayerProfileModal.tsx', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("MATCH NOT FOUND")
