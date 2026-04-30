import React, { useMemo, useRef, useEffect, useState } from 'react';
import { User, Session } from '../types';
import { Settings, Trophy, ChevronRight, LogOut, ArrowLeft } from 'lucide-react';
import { getAvatarColor, getNextTierProgress, triggerHaptic, getWinRateColor, getRankFrameClass } from '../utils';
import { Button } from './ui/Button';
import { RANK_TIERS } from './ArenaTiersModal';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentTierIndex, setCurrentTierIndex] = useState(0);

  useEffect(() => {
    const p = user.points;
    let currentId = 'unpolished';
    if (p >= 2000) currentId = 'ascended';
    else if (p >= 1600) currentId = 'void';
    else if (p >= 1300) currentId = 'combustion';
    else if (p >= 1100) currentId = 'spark';

    const index = RANK_TIERS.findIndex(t => t.id === currentId);
    setCurrentTierIndex(index !== -1 ? index : 0);

    const timeoutId = setTimeout(() => {
      if (scrollContainerRef.current) {
        const activeEl = scrollContainerRef.current.querySelector(`[data-tier-index="${index !== -1 ? index : 0}"]`) as HTMLElement;
        if (activeEl) {
          const container = scrollContainerRef.current;
          const scrollLeft = activeEl.offsetLeft - (container.offsetWidth / 2) + (activeEl.offsetWidth / 2);
          container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
        }
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [user.points]);

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
 if (p >= 2000) return { name: 'The Emperor', color: `text-yellow-400 ${baseClass}`, dot: 'bg-yellow-400 shadow-[0_0_12px_gold]' };
 if (p >= 1600) return { name: 'The Monarch', color: `text-purple-400 ${baseClass}`, dot: 'bg-purple-500 shadow-[0_0_12px_#a855f7]' };
 if (p >= 1300) return { name: 'The Emergence', color: `text-orange-400 ${baseClass}`, dot: 'bg-orange-500 shadow-[0_0_12px_#f97316]' };
 if (p >= 1100) return { name: 'The Chrysalis', color: `text-cyan-400 ${baseClass}`, dot: 'bg-cyan-400 shadow-[0_0_12px_#22d3ee]' };
 return { name: 'The Cocoon', color: `text-gray-400 ${baseClass}`, dot: 'bg-gray-500' };
 }, [user.points]);



 return (
 <div className="relative w-full min-h-screen bg-[#000B29] text-white overflow-y-auto pb-20 font-sans">

 {/* Sticky Navigation Header */}
 <div className="sticky top-0 z-50 w-full bg-[#000B29]/90 backdrop-blur border-b border-[#002266] pt-[env(safe-area-inset-top)]">
 <div className="flex items-center gap-3 py-3 px-4 sm:px-6">
 <button onClick={() => { triggerHaptic('light'); onClose(); }} className="p-2 -ml-2 text-gray-400 rounded-full transition-colors active:scale-95">
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
 className="absolute -top-1 -right-1 p-2.5 bg-[#001645] text-gray-400 rounded-full transition-all shadow-[0_8px_32px_rgba(0,0,0,0.6)] active:scale-95 z-20 border-[3px] border-[#000B29]"
 >
 <Settings size={18} strokeWidth={2} />
 </button>
 </div>

 {/* Name and Rank */}
 <div className="flex flex-col items-center justify-center text-center">
 <h1 className="text-2xl font-black text-white italic tracking-tighter truncate max-w-[280px] mb-1 leading-none">{user.name}</h1>
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold uppercase tracking-[0.2em] italic text-gray-400">Rank #{rank}</span>
 <span className="text-[10px] text-[#00FF41]">•</span>
 <span className="text-xs font-bold uppercase tracking-[0.2em] italic text-[#00FF41]">{user.points} pts</span>
 </div>
 </div>
 </div>

        {/* Static Stats Overview */}
        <div className="w-full mb-8 relative">
          <div className="grid grid-cols-3 gap-1 relative z-10">
            {/* Played */}
            <div className="rounded-none p-3 sm:p-4 flex flex-col justify-center items-center relative overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Played</span>
              <span className="text-2xl sm:text-4xl tabular-nums font-black italic tracking-tighter text-white">{stats.played}</span>
            </div>
            {/* W-L */}
            <div className="rounded-none p-3 sm:p-4 flex flex-col justify-center items-center relative overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">W-L</span>
              <div className="flex items-center text-2xl sm:text-4xl font-black italic tracking-tighter">
                <span className="text-green-500">{stats.wins}</span>
                <span className="text-gray-600 mx-1.5">/</span>
                <span className="text-red-500">{stats.losses}</span>
              </div>
            </div>
            {/* Win Rate */}
            <div className="rounded-none p-3 sm:p-4 flex flex-col justify-center items-center relative overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Win Rate</span>
              <span className={`text-2xl sm:text-4xl tabular-nums font-black italic tracking-tighter ${getWinRateColor(stats.winRate)}`}>{stats.winRate}%</span>
            </div>
          </div>
        </div>

        {/* Rank Progression Timeline */}
        <div className="w-full mb-12 relative">
          <div className="flex justify-between items-end relative z-10 mb-4">
            <div className="flex flex-col">
              <h3 className="text-lg font-black italic uppercase text-white tracking-widest leading-none">Progress<span className="text-[#00FF41]">ion</span></h3>
            </div>
          </div>

          {/* Edge-to-edge scroll container */}
          <div className="w-[calc(100%+48px)] sm:w-[calc(100%+64px)] -ml-6 sm:-ml-8 overflow-x-auto hide-scrollbar snap-x snap-mandatory" ref={scrollContainerRef}>
            <div className="flex items-start min-w-max relative gap-32 pb-4 pt-4 px-6 sm:px-8">
              {/* Connecting Background Line */}
              <div className="absolute top-[52px] left-[60px] sm:left-[68px] right-[60px] sm:right-[68px] h-1 bg-[#001645] z-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] rounded-full">
                {/* Active Progress Line */}
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00A82B] to-[#00FF41] z-0 transition-all duration-1000 shadow-[0_0_10px_#00FF41] rounded-full"
                  style={{ width: `${(currentTierIndex / (Math.max(1, RANK_TIERS.length - 1))) * 100}%` }} 
                />
              </div>

              {RANK_TIERS.map((tier, idx) => {
                const isReached = user.points >= tier.min;
                const isCurrent = idx === currentTierIndex;
                
                return (
                  <div key={tier.id} data-tier-index={idx} className="relative z-10 flex flex-col items-center snap-center w-[72px]">
                    {/* Avatar Frame */}
                    <div className={`w-[72px] h-[72px] rounded-full p-1 relative transition-all duration-500 bg-[#001030] shadow-lg ${getRankFrameClass(tier.id)} ${!isReached ? 'opacity-40 grayscale' : ''} ${isCurrent ? 'scale-110 shadow-[0_0_30px_rgba(0,255,65,0.3)] ring-2 ring-[#00FF41] ring-offset-2 ring-offset-[#001645]' : ''}`}>
                      <img 
                        src={user.avatar} 
                        className="w-full h-full rounded-full border-2 border-[#000B29] object-cover bg-black"
                        style={{ backgroundColor: getAvatarColor(user.avatar) }}
                        alt={tier.name}
                      />
                    </div>

                    {/* Tier Info */}
                    <div className={`mt-5 flex flex-col items-center text-center w-32 ${isCurrent ? 'scale-110' : ''} transition-transform`}>
                      <span className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 ${isReached ? tier.color : 'text-gray-600'}`}>
                        {tier.name}
                      </span>
                      <span className="text-[9px] font-mono font-medium text-gray-500 tracking-widest">
                        {tier.range} pts
                      </span>
                    </div>
                  </div>
                );
              })}
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
