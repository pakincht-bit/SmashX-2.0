
import React, { useMemo } from 'react';
import { User, Session } from '../types';
import { X, Trophy, Target } from 'lucide-react';
import { getAvatarColor, getRankFrameClass, getWinRateColor, getNextTierProgress } from '../utils';

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
    let played = 0;
    let wins = 0;
    let losses = 0;

    sessions.forEach(session => {
      if (session.matches) {
        session.matches.forEach(match => {
          const winners = match.winningTeamIndex === 1 ? match.team1Ids : match.team2Ids;
          const losers = match.winningTeamIndex === 1 ? match.team2Ids : match.team1Ids;

          if (winners.includes(user.id)) {
            played++;
            wins++;
          }
          if (losers.includes(user.id)) {
            played++;
            losses++;
          }
        });
      }
    });

    const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
    return { played, wins, losses, winRate };
  }, [user, sessions]);

  const rank = useMemo(() => {
    if (!user) return 0;
    const sorted = [...allUsers].sort((a, b) => b.points - a.points);
    return sorted.findIndex(u => u.id === user.id) + 1;
  }, [allUsers, user]);

  const rankInfo = useMemo(() => {
    const p = user?.points || 1000;
    if (p >= 2000) return { name: 'The Ascended', color: 'text-yellow-400', dot: 'bg-yellow-400 shadow-[0_0_8px_gold]' };
    if (p >= 1600) return { name: 'The Void', color: 'text-purple-500', dot: 'bg-purple-900 shadow-[0_0_8px_#581c87]' };
    if (p >= 1300) return { name: 'The Combustion', color: 'text-orange-500', dot: 'bg-orange-600' };
    if (p >= 1100) return { name: 'The Spark', color: 'text-cyan-400', dot: 'bg-cyan-400 shadow-[0_0_5px_#22d3ee]' };
    return { name: 'The Unpolished', color: 'text-gray-500', dot: 'bg-gray-700' };
  }, [user]);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#001645] border border-[#002266] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-in zoom-in slide-in-from-bottom-8 duration-300 relative">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-[#000B29]/50 hover:bg-[#000B29] transition-colors z-20"
        >
          <X size={20} />
        </button>

        {/* Profile Card Content */}
        <div className="relative p-6 overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00FF41] rounded-full filter blur-[120px] opacity-10 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          <div className="relative z-10 flex flex-row items-center gap-6 mb-8">
            <div className="relative shrink-0">
              <div className={`w-24 h-24 rounded-full p-1 shadow-lg transition-all duration-500 ${getRankFrameClass(user.rankFrame)}`}>
                <img
                  src={user.avatar}
                  className="w-full h-full rounded-full border-4 border-[#000B29] object-cover relative z-10"
                  style={{ backgroundColor: getAvatarColor(user.avatar) }}
                  alt={user.name}
                />
              </div>
            </div>

            <div className="flex flex-col items-start min-w-0 flex-1">
              <h2 className="text-3xl font-black text-white italic tracking-tighter mb-0.5 truncate w-full">
                {user.name}
              </h2>

              <div className={`flex items-center gap-2 px-1 mb-2 ${rankInfo.color}`}>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] italic">
                  {rankInfo.name}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="relative z-10 grid grid-cols-3 gap-2 mt-2 pt-6 border-t border-[#002266]">
            <div className="flex flex-col items-center justify-center py-2">
              <span className="text-lg font-black text-white italic leading-none">#{rank}</span>
              <span className="text-[8px] text-gray-500 uppercase font-bold tracking-widest mt-1">Ranking</span>
            </div>

            <div className="flex flex-col items-center justify-center py-2 border-x border-[#002266]">
              <span className="text-lg font-black text-[#00FF41] font-mono leading-none">{user.points}</span>
              <span className="text-[8px] text-gray-500 uppercase font-bold tracking-widest mt-1">Points</span>
            </div>

            <div className="flex flex-col items-center justify-center py-2">
              <div className="text-lg font-black italic leading-none flex items-center">
                <span className="text-green-500">{stats.wins}</span>
                <span className="text-gray-600 mx-0.5">/</span>
                <span className="text-red-500">{stats.losses}</span>
              </div>
              <span className="text-[8px] text-gray-500 uppercase font-bold tracking-widest mt-1">W-L Record</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfileModal;
