import React, { useMemo } from 'react';
import { User, PlayerGroup } from '../types';
import { ArrowLeft, Trophy } from 'lucide-react';
import { getAvatarColor, getRankFrameClass, triggerHaptic } from '../utils';

interface GroupLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: PlayerGroup | null;
  allUsers: User[];
  currentUserId: string;
  onPlayerClick?: (userId: string) => void;
}

const GroupLeaderboardModal: React.FC<GroupLeaderboardModalProps> = ({
  isOpen,
  onClose,
  group,
  allUsers,
  currentUserId,
  onPlayerClick,
}) => {
  const rankedMembers = useMemo(() => {
    if (!group) return [];
    const usersMap = new Map(allUsers.map(u => [u.id, u]));
    return group.memberIds
      .map(id => usersMap.get(id))
      .filter(Boolean)
      .sort((a, b) => (b!.points - a!.points) || a!.name.localeCompare(b!.name)) as User[];
  }, [group, allUsers]);

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 z-[220] bg-[#000B29] text-white overflow-y-auto animate-in fade-in duration-300">
      <div className="sticky top-0 z-50 w-full bg-[#000B29]/90 backdrop-blur border-b border-[#002266] pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 py-3 px-4 sm:px-6">
          <button onClick={() => { triggerHaptic('light'); onClose(); }} className="p-2 -ml-2 text-gray-400 rounded-full transition-colors active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center flex-1 min-w-0">
            <h2 className="text-lg font-black italic uppercase text-white tracking-wider truncate">
              {group.name} <span className="text-[#00FF41]">Ranks</span>
            </h2>
          </div>
          <Trophy size={18} className="text-[#00FF41] shrink-0" />
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Rank</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Points</span>
        </div>
        <div className="space-y-1">
          {rankedMembers.map((user, index) => {
            let rankColor = 'text-gray-400';
            if (index === 0) rankColor = 'text-yellow-500';
            if (index === 1) rankColor = 'text-gray-300';
            if (index === 2) rankColor = 'text-orange-700';
            const isMe = user.id === currentUserId;

            return (
              <button
                key={user.id}
                onClick={() => { triggerHaptic('light'); onPlayerClick?.(user.id); }}
                className={`w-full flex items-center justify-between py-3 px-3 rounded-none transition-all active:scale-[0.99] ${isMe ? 'bg-[#00FF41]/10' : 'bg-[#001645]'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`font-black text-sm italic w-6 text-center shrink-0 ${rankColor}`}>{index + 1}</span>
                  <div className={`rounded-full shrink-0 ${getRankFrameClass(user.rankFrame).replace('ring-4', 'ring-2')}`}>
                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-[#000B29] object-cover" style={{ backgroundColor: getAvatarColor(user.avatar) }} />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-sm font-bold text-white truncate">{user.name}</div>
                    <div className="text-[10px] font-mono text-gray-500">{user.wins}W · {user.losses}L</div>
                  </div>
                </div>
                <span className="text-sm font-black italic tabular-nums text-[#00FF41] shrink-0">{user.points}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GroupLeaderboardModal;
