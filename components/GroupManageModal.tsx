import React, { useMemo, useState } from 'react';
import { User, PlayerGroup } from '../types';
import { ArrowLeft, Search, Trash2, UserPlus, X } from 'lucide-react';
import { getAvatarColor, getRankFrameClass, triggerHaptic } from '../utils';
import ConfirmationModal from './ConfirmationModal';

interface GroupManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: PlayerGroup | null;
  allUsers: User[];
  currentUserId: string;
  onCreateGroup: (name: string) => Promise<void>;
  onAddMember: (groupId: string, userId: string) => Promise<void>;
  onRemoveMember: (groupId: string, userId: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
}

const GroupManageModal: React.FC<GroupManageModalProps> = ({
  isOpen,
  onClose,
  group,
  allUsers,
  currentUserId,
  onCreateGroup,
  onAddMember,
  onRemoveMember,
  onDeleteGroup,
}) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    action: () => void;
    isDestructive?: boolean;
    confirmLabel?: string;
  } | null>(null);

  const isCreateMode = !group;
  const isOwner = group ? group.ownerId === currentUserId : true;

  const usersMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

  const members = useMemo(() => {
    if (!group) return [];
    return group.memberIds.map(id => usersMap.get(id)).filter(Boolean) as User[];
  }, [group, usersMap]);

  const addableUsers = useMemo(() => {
    if (!group) return [];
    const memberSet = new Set(group.memberIds);
    return allUsers
      .filter(u => !memberSet.has(u.id))
      .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers, group, searchQuery]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    const name = groupName.trim();
    if (!name || isSubmitting) return;
    setIsSubmitting(true);
    triggerHaptic('medium');
    try {
      await onCreateGroup(name);
      setGroupName('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!group || isSubmitting) return;
    setIsSubmitting(true);
    triggerHaptic('success');
    try {
      await onAddMember(group.id, userId);
      setSearchQuery('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] bg-[#000B29] text-white overflow-y-auto animate-in fade-in duration-300">
      <div className="sticky top-0 z-50 w-full bg-[#000B29]/90 backdrop-blur border-b border-[#002266] pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 py-3 px-4 sm:px-6">
          <button onClick={() => { triggerHaptic('light'); onClose(); }} className="p-2 -ml-2 text-gray-400 rounded-full transition-colors active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-black italic uppercase text-white tracking-wider flex-1">
            {isCreateMode ? <>New <span className="text-[#00FF41]">Group</span></> : <>Manage <span className="text-[#00FF41]">Group</span></>}
          </h2>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6 pb-24">
        {isCreateMode ? (
          <div className="space-y-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Group Name</span>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Tuesday Crew"
                className="w-full bg-[#001645] px-4 py-3 text-white placeholder:text-gray-500 outline-none font-bold"
                autoFocus
              />
            </label>
            <button
              onClick={handleCreate}
              disabled={!groupName.trim() || isSubmitting}
              className={`w-full py-3.5 font-black uppercase tracking-widest text-sm rounded-none skew-x-[-6deg] transition-all active:scale-95 ${groupName.trim() ? 'bg-[#00FF41] text-[#000B29]' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
            >
              <span className="skew-x-[6deg] inline-block">Create Group</span>
            </button>
          </div>
        ) : (
          <>
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-1">{group.name}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{members.length} members</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Members</h4>
              </div>
              <div className="space-y-2">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-[#001645] rounded-none">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`rounded-full shrink-0 ${getRankFrameClass(member.rankFrame).replace('ring-4', 'ring-2')}`}>
                        <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full border border-[#000B29] object-cover" style={{ backgroundColor: getAvatarColor(member.avatar) }} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{member.name}</div>
                        <div className="text-[10px] font-mono text-yellow-500">{member.points} pts</div>
                      </div>
                    </div>
                    {isOwner && member.id !== group.ownerId && (
                      <button
                        onClick={() => setConfirmConfig({
                          title: 'Remove Member',
                          message: `Remove ${member.name} from ${group.name}?`,
                          isDestructive: true,
                          confirmLabel: 'Remove',
                          action: () => onRemoveMember(group.id, member.id),
                        })}
                        className="p-2 text-gray-500 active:text-red-400 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {isOwner && (
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Add Players</h4>
                <div className="flex items-center gap-2 bg-[#001645] px-3 py-2.5 mb-3">
                  <Search size={16} className="text-gray-500 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search players..."
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none font-medium"
                  />
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {addableUsers.slice(0, 20).map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleAddMember(user.id)}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-between p-3 bg-[#001030] rounded-none active:scale-[0.99] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-[#000B29] object-cover shrink-0" style={{ backgroundColor: getAvatarColor(user.avatar) }} />
                        <span className="text-sm font-bold text-white truncate">{user.name}</span>
                      </div>
                      <UserPlus size={16} className="text-[#00FF41] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isOwner && (
              <button
                onClick={() => setConfirmConfig({
                  title: 'Delete Group',
                  message: `Delete "${group.name}" permanently?`,
                  isDestructive: true,
                  confirmLabel: 'Delete',
                  action: async () => { await onDeleteGroup(group.id); onClose(); },
                })}
                className="w-full flex items-center justify-center gap-2 py-3 border border-red-900/50 bg-red-900/20 text-red-500 font-black uppercase tracking-wider text-xs rounded-none active:scale-95"
              >
                <Trash2 size={14} /> Delete Group
              </button>
            )}
          </>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!confirmConfig}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        confirmLabel={confirmConfig?.confirmLabel}
        isDestructive={confirmConfig?.isDestructive}
        onConfirm={() => { triggerHaptic('medium'); confirmConfig?.action(); setConfirmConfig(null); }}
        onCancel={() => { triggerHaptic('light'); setConfirmConfig(null); }}
      />
    </div>
  );
};

export default GroupManageModal;
