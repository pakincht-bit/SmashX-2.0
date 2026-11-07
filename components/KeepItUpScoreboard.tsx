import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import { User } from '../types';
import { getAvatarColor, getRankFrameClass, triggerHaptic } from '../utils';
import { fetchKeepItUpScores, KeepItUpScore } from '../services/keepItUpScores';

interface KeepItUpScoreboardProps {
  onClose: () => void;
  allUsers: User[];
  currentUserId: string;
}

const KeepItUpScoreboard: React.FC<KeepItUpScoreboardProps> = ({ onClose, allUsers, currentUserId }) => {
  const [scores, setScores] = useState<KeepItUpScore[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    setFailed(false);
    setScores(null);
    try {
      setScores(await fetchKeepItUpScores());
    } catch (err: any) {
      console.error('SX: Failed to load Keep It Up scores:', err.message);
      setFailed(true);
    }
  };

  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => {
    const usersMap = new Map(allUsers.map(u => [u.id, u]));
    return (scores || []).flatMap(score => {
      const user = usersMap.get(score.userId);
      return user ? [{ user, bestScore: score.bestScore }] : [];
    });
  }, [scores, allUsers]);

  return (
    <div className="fixed inset-0 z-10 bg-navy-base text-white overflow-y-auto animate-in fade-in duration-300">
      <div className="sticky top-0 z-50 w-full bg-navy-base/90 backdrop-blur pt-safe-top">
        <div className="flex items-center gap-2 py-2 px-4 sm:px-6">
          <button type="button" onClick={() => { triggerHaptic('light'); onClose(); }} className="p-1.5 -ml-1.5 text-gray-400 rounded-full transition-colors active:scale-95" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <h2 className="flex-1 text-base font-black italic uppercase text-white tracking-wider">Keep It Up <span className="text-neon-primary">Ranks</span></h2>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {failed ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Couldn't load the scoreboard</p>
            <button type="button" onClick={() => { triggerHaptic('light'); void load(); }} className="px-4 py-2 bg-[#00FF41] text-[#000B29] font-black italic uppercase tracking-widest text-xs -skew-x-12 rounded-none active:scale-95 transition-transform">
              <span className="inline-block skew-x-12">Try Again</span>
            </button>
          </div>
        ) : scores === null ? (
          <div className="flex justify-center py-16"><Loader2 size={20} className="text-neon-primary animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Trophy size={24} className="text-gray-600" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No scores yet. Be the first on the board.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Rank</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Best</span>
            </div>
            <div className="space-y-1">
              {rows.map(({ user, bestScore }, index) => {
                let rankColor = 'text-gray-400';
                if (index === 0) rankColor = 'text-yellow-500';
                if (index === 1) rankColor = 'text-gray-300';
                if (index === 2) rankColor = 'text-orange-700';

                return (
                  <div key={user.id} className={`flex items-center justify-between py-3 px-3 rounded-none ${user.id === currentUserId ? 'bg-[#00FF41]/10' : 'bg-[#001645]'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`font-black text-sm italic w-6 text-center shrink-0 ${rankColor}`}>{index + 1}</span>
                      <div className={`rounded-full shrink-0 ${getRankFrameClass(user.rankFrame).replace('ring-4', 'ring-2')}`}>
                        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-[#000B29] object-cover" style={{ backgroundColor: getAvatarColor(user.avatar) }} />
                      </div>
                      <span className="text-sm font-bold text-white truncate">{user.name}</span>
                    </div>
                    <span className="text-sm font-black italic tabular-nums text-[#00FF41] shrink-0">{bestScore}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default KeepItUpScoreboard;
