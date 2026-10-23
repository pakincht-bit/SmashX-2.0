import React from 'react';
import { Plus, Users } from 'lucide-react';
import { User, PlayerGroup } from '../types';
import { getAvatarColor, triggerHaptic } from '../utils';
import { Button } from './ui/Button';

interface GroupsPageProps {
  groups: PlayerGroup[];
  allUsers: User[];
  onCreateClick: () => void;
  onManageClick: (group: PlayerGroup) => void;
}

const GroupsPage: React.FC<GroupsPageProps> = ({
  groups,
  allUsers,
  onCreateClick,
  onManageClick,
}) => {
  const usersMap = new Map(allUsers.map((u) => [u.id, u]));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-black italic uppercase tracking-tighter text-white truncate">
          Player <span className="text-[#00FF41]">Groups</span>
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          skewed={false}
          onClick={() => {
            triggerHaptic('medium');
            onCreateClick();
          }}
          className="!border-neon-primary/30 !text-neon-primary !bg-navy-card shrink-0"
        >
          <Plus size={14} strokeWidth={3} />
          New
        </Button>
      </div>

      <div className="flex flex-col">
        {groups.length === 0 ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onCreateClick();
            }}
            className="w-full py-10 bg-navy-struct rounded-none flex flex-col items-center justify-center gap-3 active:scale-[0.99] transition-all"
          >
            <Users size={28} className="text-neon-primary/60" />
            <div className="text-center px-6">
              <p className="text-sm font-black uppercase tracking-wider text-white mb-1">
                Create Your Crew
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Group friends, invite together, track group ranks
              </p>
            </div>
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => {
              const previewMembers = group.memberIds
                .map((id) => usersMap.get(id))
                .filter(Boolean)
                .slice(0, 4) as User[];

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onManageClick(group);
                  }}
                  className="w-full bg-navy-card p-4 rounded-none flex items-center gap-4 text-left active:scale-[0.99] transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black italic uppercase text-white truncate tracking-tight">
                      {group.name}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1 tabular-nums">
                      {group.memberIds.length} players
                    </p>
                  </div>

                  <div className="flex -space-x-2 shrink-0">
                    {previewMembers.map((member) => (
                      <img
                        key={member.id}
                        src={member.avatar}
                        alt={member.name}
                        className="w-9 h-9 rounded-full border-2 border-navy-card object-cover"
                        style={{ backgroundColor: getAvatarColor(member.avatar) }}
                      />
                    ))}
                    {group.memberIds.length > 4 && (
                      <div className="w-9 h-9 rounded-full border-2 border-navy-card bg-navy-base flex items-center justify-center text-[10px] font-black text-gray-400">
                        +{group.memberIds.length - 4}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupsPage;
