import React from 'react';
import { User, PlayerGroup } from '../types';
import { Plus, Users } from 'lucide-react';
import { getAvatarColor, triggerHaptic } from '../utils';

interface PlayerGroupsSectionProps {
  groups: PlayerGroup[];
  allUsers: User[];
  onCreateClick: () => void;
  onManageClick: (group: PlayerGroup) => void;
}

const PlayerGroupsSection: React.FC<PlayerGroupsSectionProps> = ({
  groups,
  allUsers,
  onCreateClick,
  onManageClick,
}) => {
  const usersMap = new Map(allUsers.map(u => [u.id, u]));

  return (
    <section className="mb-10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-black italic uppercase tracking-tighter text-white m-0">
          Player <span className="text-[#00FF41]">Groups</span>
        </h3>
        <button
          onClick={() => { triggerHaptic('medium'); onCreateClick(); }}
          className="bg-[#001645] text-[#00FF41] border border-[#00FF41]/30 px-3 py-2 rounded-none text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5"
        >
          <Plus size={14} strokeWidth={3} />
          New Group
        </button>
      </div>

      {groups.length === 0 ? (
        <button
          onClick={() => { triggerHaptic('light'); onCreateClick(); }}
          className="w-full py-8 border border-dashed border-[#00FF41]/20 bg-[#001030] rounded-none flex flex-col items-center justify-center gap-3 active:scale-[0.99] transition-all"
        >
          <Users size={28} className="text-[#00FF41]/60" />
          <div className="text-center px-6">
            <p className="text-sm font-black uppercase tracking-wider text-white mb-1">Create Your Crew</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Group friends, invite together, track group ranks</p>
          </div>
        </button>
      ) : (
        <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-3 pb-2 -mx-4 px-4 scroll-px-4 after:content-[''] after:w-px after:shrink-0">
          {groups.map(group => {
            const previewMembers = group.memberIds
              .map(id => usersMap.get(id))
              .filter(Boolean)
              .slice(0, 4) as User[];
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => { triggerHaptic('light'); onManageClick(group); }}
                className="w-[72vw] sm:w-[280px] shrink-0 snap-start bg-[#001645] p-4 rounded-none flex flex-col gap-4 text-left active:scale-[0.99] transition-all"
              >
                <div className="min-w-0">
                  <h4 className="text-base font-black italic uppercase text-white truncate tracking-tight">{group.name}</h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1 tabular-nums">{group.memberIds.length} players</p>
                </div>

                <div className="flex -space-x-2">
                  {previewMembers.map(member => (
                    <img
                      key={member.id}
                      src={member.avatar}
                      alt={member.name}
                      className="w-9 h-9 rounded-full border-2 border-[#001645] object-cover"
                      style={{ backgroundColor: getAvatarColor(member.avatar) }}
                    />
                  ))}
                  {group.memberIds.length > 4 && (
                    <div className="w-9 h-9 rounded-full border-2 border-[#001645] bg-[#000B29] flex items-center justify-center text-[10px] font-black text-gray-400">
                      +{group.memberIds.length - 4}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default PlayerGroupsSection;
