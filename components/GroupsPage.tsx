import React from 'react';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import { User, PlayerGroup } from '../types';
import { getAvatarColor, triggerHaptic } from '../utils';
import { Button } from './ui/Button';

interface GroupsPageProps {
  groups: PlayerGroup[];
  allUsers: User[];
  onClose: () => void;
  onCreateClick: () => void;
  onManageClick: (group: PlayerGroup) => void;
}

const GroupsPage: React.FC<GroupsPageProps> = ({
  groups,
  allUsers,
  onClose,
  onCreateClick,
  onManageClick,
}) => {
  const usersMap = new Map(allUsers.map((u) => [u.id, u]));

  return (
    <div className="relative w-full min-h-screen bg-navy-base text-white overflow-y-auto pb-8 font-sans">
      <div className="sticky top-0 z-50 w-full bg-navy-base/90 backdrop-blur pt-[env(safe-area-inset-top)] shrink-0">
        <div className="flex items-center gap-2 py-2 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 -ml-1.5 text-gray-400 rounded-full transition-colors active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center flex-1 min-w-0">
            <h2 className="text-base font-black italic uppercase text-white tracking-wider truncate">
              Player <span className="text-neon-primary">Groups</span>
            </h2>
          </div>
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
      </div>

      <div className="relative z-10 w-full max-w-xl mx-auto px-4 sm:px-6 pt-4 pb-4 animate-fade-in-up flex flex-col">
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
