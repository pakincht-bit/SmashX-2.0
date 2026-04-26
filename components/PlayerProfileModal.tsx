
import React, { useMemo, useState, useEffect } from 'react';
import { User, Session } from '../types';
import { X, Trophy, Target, History, Calendar, Users, Swords } from 'lucide-react';
import { getAvatarColor, getRankFrameClass, getWinRateColor, getDateParts, formatTime } from '../utils';

interface PlayerProfileModalProps {
 isOpen: boolean;
 onClose: () => void;
 userId: string | null;
 allUsers: User[];
 sessions: Session[];
}

const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({ isOpen, onClose, userId, allUsers, sessions }) => {
 const user = useMemo(() => allUsers.find(u => u.id === userId), [allUsers, userId]);

 const stats = useMemo(() => {
 if (!user) return { played: 0, wins: 0, losses: 0, winRate: 0 };
 const wins = user.wins;
 const losses = user.losses;
 const played = wins + losses;
 const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;

 return { played, wins, losses, winRate };
 }, [user]);

 const rank = useMemo(() => {
 if (!user) return 0;
 const sorted = [...allUsers].sort((a, b) => b.points - a.points);
 return sorted.findIndex(u => u.id === user.id) + 1;
 }, [allUsers, user]);

 const rankInfo = useMemo(() => {
 const p = user?.points || 1000;
 if (p >= 2000) return { name: 'The Emperor', color: 'text-yellow-400', dot: 'bg-yellow-400 shadow-[0_0_8px_gold]' };
 if (p >= 1600) return { name: 'The Monarch', color: 'text-purple-500', dot: 'bg-purple-900 shadow-[0_0_8px_#581c87]' };
 if (p >= 1300) return { name: 'The Emergence', color: 'text-orange-500', dot: 'bg-orange-600' };
 if (p >= 1100) return { name: 'The Chrysalis', color: 'text-cyan-400', dot: 'bg-cyan-400 shadow-[0_0_5px_#22d3ee]' };
 return { name: 'The Cocoon', color: 'text-gray-500', dot: 'bg-gray-700' };
 }, [user]);



 if (!isOpen || !user) return null;

 return (
 <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/90 backdrop-blur-[2px] animate-in fade-in duration-300">
 <div className="w-full max-w-md bg-[#001030] shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-none overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-in zoom-in slide-in-from-bottom-8 duration-300 relative">

 {/* Close Button */}
 <button
 onClick={onClose}
 className="absolute top-4 right-4 p-2 text-gray-400 rounded-full bg-[#000B29]/50 transition-colors z-20"
 >
 <X size={20} />
 </button>

 <div className="relative p-6 overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center w-full pb-6">
            <div className="relative mb-4">
                <div className={`absolute inset-0 ${rankInfo.dot} blur-[16px] opacity-20 transition-opacity duration-700 rounded-full`}></div>
                <div className={`w-28 h-28 relative rounded-full bg-[#001030] shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-transform ${getRankFrameClass(user.rankFrame)}`}>
                    <img
                        src={user.avatar}
                        className="w-full h-full rounded-full object-cover border-[3px] border-[#000B29]"
                        style={{ backgroundColor: getAvatarColor(user.avatar) }}
                        alt={user.name}
                    />
                </div>
            </div>

            <div className="flex flex-col items-center justify-center text-center">
                <h2 className="text-2xl font-black text-white italic tracking-tighter truncate max-w-[280px] mb-1 leading-none">{user.name}</h2>
                <div className="flex items-center gap-3">
                    <span className="text-gray-400"><span className="text-[9px] font-black uppercase tracking-[0.2em] italic">Rank </span><span className="text-sm font-black italic text-white">#{rank}</span></span>
                    <span className="text-[10px] text-[#00FF41]">•</span>
                    <span className="text-[#00FF41]"><span className="text-sm font-black italic">{user.points}</span> <span className="text-[9px] font-black uppercase tracking-[0.2em] italic">pts</span></span>
                </div>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="w-full relative z-10 mt-2">
          <div className="grid grid-cols-3 gap-1 relative z-10">
            {/* Played */}
            <div className="bg-[#001030] rounded-none p-3 flex flex-col justify-center items-center relative overflow-hidden">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Played</span>
              <span className="text-2xl tabular-nums font-black italic tracking-tighter text-white">{stats.played}</span>
            </div>
            {/* W-L */}
            <div className="bg-[#001030] rounded-none p-3 flex flex-col justify-center items-center relative overflow-hidden">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">W-L</span>
              <div className="flex items-center text-2xl font-black italic tracking-tighter">
                <span className="text-green-500">{stats.wins}</span>
                <span className="text-gray-600 mx-1.5">/</span>
                <span className="text-red-500">{stats.losses}</span>
              </div>
            </div>
            {/* Win Rate */}
            <div className="bg-[#001030] rounded-none p-3 flex flex-col justify-center items-center relative overflow-hidden">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Win Rate</span>
              <span className={`text-2xl tabular-nums font-black italic tracking-tighter ${getWinRateColor(stats.winRate)}`}>{stats.winRate}%</span>
            </div>
          </div>
        </div>


      </div>
    </div>
  </div>
  );
};

export default PlayerProfileModal;