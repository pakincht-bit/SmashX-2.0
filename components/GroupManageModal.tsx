import React, { useEffect, useMemo, useState } from 'react';
import { User, PlayerGroup } from '../types';
import { ArrowLeft, Check, Search, Trash2, UserPlus, X } from 'lucide-react';
import { getAvatarColor, getRankFrameClass, triggerHaptic } from '../utils';
import ConfirmationModal from './ConfirmationModal';

interface GroupManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: PlayerGroup | null;
  allUsers: User[];
  currentUserId: string;
  onCreateGroup: (name: string, memberIds: string[]) => Promise<void>;
  onAddMember: (groupId: string, userId: string) => Promise<void>;
  onRemoveMember: (groupId: string, userId: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
}

type CreateStep = 'members' | 'name';

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
  const [createStep, setCreateStep] = useState<CreateStep>('members');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    action: () => void;
    isDestructive?: boolean;
    confirmLabel?: string;
  } | null>(null);

  const isCreateMode = !group;
  const isOwner = group ? group.ownerId === currentUserId : true;

  useEffect(() => {
    if (!isOpen) {
      setGroupName('');
      setCreateStep('members');
      setSelectedMemberIds([]);
      setSearchQuery('');
      setIsSubmitting(false);
      setIsAddPanelOpen(false);
    }
  }, [isOpen]);

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

  const selectableUsers = useMemo(() => {
    return allUsers
      .filter(u => u.id !== currentUserId)
      .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers, currentUserId, searchQuery]);

  const selectedMembers = useMemo(() => {
    return selectedMemberIds
      .map(id => usersMap.get(id))
      .filter(Boolean) as User[];
  }, [selectedMemberIds, usersMap]);

  if (!isOpen) return null;

  const handleClose = () => {
    triggerHaptic('light');
    onClose();
  };

  const handleCreateBack = () => {
    triggerHaptic('light');
    if (isCreateMode && createStep === 'name') {
      setCreateStep('members');
      return;
    }
    handleClose();
  };

  const handleNextStep = () => {
    if (selectedMemberIds.length === 0) return;
    triggerHaptic('light');
    setCreateStep('name');
    setSearchQuery('');
  };

  const toggleMemberSelection = (userId: string) => {
    triggerHaptic('light');
    setSelectedMemberIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    const name = groupName.trim();
    if (!name || isSubmitting) return;
    setIsSubmitting(true);
    triggerHaptic('medium');
    try {
      await onCreateGroup(name, selectedMemberIds);
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

  const toggleAddPanel = () => {
    triggerHaptic('light');
    setIsAddPanelOpen(prev => !prev);
    setSearchQuery('');
  };

  const handleDeleteGroup = () => {
    if (!group) return;
    triggerHaptic('light');
    setConfirmConfig({
      title: 'Delete Group',
      message: `Delete "${group.name}" permanently?`,
      isDestructive: true,
      confirmLabel: 'Delete',
      action: async () => { await onDeleteGroup(group.id); onClose(); },
    });
  };

  const createHeaderTitle = createStep === 'members'
    ? <>Add <span className="text-neon-primary">Members</span></>
    : <>Name <span className="text-neon-primary">Group</span></>;

  return (
    <div className="fixed inset-0 z-[220] bg-[#000B29] text-white flex flex-col h-[100dvh] overflow-hidden animate-in fade-in duration-300">
      <div className="shrink-0 w-full bg-[#000B29]/90 backdrop-blur border-b border-[#002266] pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 py-3 px-4 sm:px-6">
          <button onClick={handleCreateBack} className="p-2 -ml-2 text-gray-400 rounded-full transition-colors active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-black italic uppercase text-white tracking-wider flex-1">
            {isCreateMode ? createHeaderTitle : <>Manage <span className="text-[#00FF41]">Group</span></>}
          </h2>
          {isCreateMode && (
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 tabular-nums">
              {createStep === 'members' ? '1/2' : '2/2'}
            </span>
          )}
        </div>
        {isCreateMode && createStep === 'members' && selectedMembers.length > 0 && (
          <div className="px-4 sm:px-6 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-neon-primary tabular-nums">
                {selectedMembers.length} selected
              </p>
            </div>
            <div className="flex overflow-x-auto hide-scrollbar gap-2 -mx-1 px-1">
              {selectedMembers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleMemberSelection(user.id)}
                  className="shrink-0 flex items-center gap-2 bg-navy-card px-2 py-1.5 active:scale-95 transition-all"
                  aria-label={`Remove ${user.name}`}
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover border border-navy-base"
                    style={{ backgroundColor: getAvatarColor(user.avatar) }}
                  />
                  <span className="text-[11px] font-bold text-white max-w-[72px] truncate">
                    {user.name}
                  </span>
                  <X size={12} className="text-gray-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isCreateMode ? (
        createStep === 'members' ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-navy-card px-3 py-2.5">
                  <Search size={16} className="text-gray-500 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search players..."
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none font-medium shadow-none"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  {selectableUsers.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {allUsers.length <= 1 ? 'No other players available yet' : 'No players match your search'}
                      </p>
                    </div>
                  ) : (
                    selectableUsers.map(user => {
                      const isSelected = selectedMemberIds.includes(user.id);
                      return (
                        <button
                          key={user.id}
                          onClick={() => toggleMemberSelection(user.id)}
                          disabled={isSubmitting}
                          className={`w-full flex items-center justify-between p-3 rounded-none transition-all active:scale-[0.98] ${isSelected ? 'bg-neon-primary/10 border border-neon-primary/50' : 'bg-navy-card border border-transparent'}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`rounded-full shrink-0 ${getRankFrameClass(user.rankFrame).replace('ring-4', 'ring-2')}`}>
                              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-navy-base object-cover" style={{ backgroundColor: getAvatarColor(user.avatar) }} />
                            </div>
                            <div className="min-w-0 text-left">
                              <div className="text-sm font-bold text-white truncate">{user.name}</div>
                            </div>
                          </div>
                          <div className={`w-6 h-6 shrink-0 flex items-center justify-center border transition-all ${isSelected ? 'bg-neon-primary border-neon-primary text-navy-base' : 'border-navy-border text-transparent'}`}>
                            <Check size={14} strokeWidth={3} />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0 p-4 sm:px-6 bg-navy-base border-t border-navy-border pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button
                onClick={handleNextStep}
                disabled={selectedMemberIds.length === 0}
                className={`w-full py-3.5 font-black uppercase tracking-widest text-sm rounded-none skew-x-[-6deg] transition-all active:scale-95 ${selectedMemberIds.length > 0 ? 'bg-neon-primary text-navy-base' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
              >
                <span className="skew-x-[6deg] inline-block">Next — Name Group</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-navy-border">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Group Name</span>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Tuesday Crew"
                  className="w-full bg-navy-card border border-navy-border focus:border-neon-primary px-4 py-3 text-white placeholder:text-gray-500 outline-none font-bold rounded-none shadow-none"
                  autoFocus
                />
              </label>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Selected members
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neon-primary tabular-nums">
                    {selectedMembers.length}
                  </p>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 -mt-2">
                  You are included automatically
                </p>

                <div className="space-y-2">
                  {selectedMembers.map(user => (
                    <div
                      key={user.id}
                      className="w-full flex items-center gap-3 p-3 bg-navy-card rounded-none"
                    >
                      <div className={`rounded-full shrink-0 ${getRankFrameClass(user.rankFrame).replace('ring-4', 'ring-2')}`}>
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-full border border-navy-base object-cover"
                          style={{ backgroundColor: getAvatarColor(user.avatar) }}
                        />
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="text-sm font-bold text-white truncate">{user.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0 p-4 sm:px-6 bg-navy-base border-t border-navy-border flex gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button
                onClick={() => { triggerHaptic('light'); setCreateStep('members'); }}
                className="flex-1 py-3.5 border border-navy-border bg-navy-card text-gray-400 font-black uppercase tracking-wider text-xs rounded-none skew-x-[-6deg] active:scale-95"
              >
                <span className="skew-x-[6deg] inline-block">Back</span>
              </button>
              <button
                onClick={handleCreate}
                disabled={!groupName.trim() || isSubmitting}
                className={`flex-[2] py-3.5 font-black uppercase tracking-wider text-xs rounded-none skew-x-[-6deg] transition-all active:scale-95 ${groupName.trim() && !isSubmitting ? 'bg-neon-primary text-navy-base' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
              >
                <span className="skew-x-[6deg] inline-block">
                  Create Group ({selectedMemberIds.length + 1})
                </span>
              </button>
            </div>
          </>
        )
      ) : (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-[#002266] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-white truncate">{group.name}</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 tabular-nums">{members.length} members</p>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleAddPanel}
                aria-label="Add member"
                className={`p-2.5 rounded-none transition-all active:scale-95 ${isAddPanelOpen ? 'bg-[#00FF41] text-[#000B29]' : 'bg-[#001645] text-[#00FF41]'}`}
              >
                <UserPlus size={18} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={handleDeleteGroup}
                aria-label="Delete group"
                className="p-2.5 rounded-none bg-[#001645] text-red-400 transition-all active:scale-95"
              >
                <Trash2 size={18} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>

        {isOwner && isAddPanelOpen && (
          <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-[#002266] bg-[#001030] space-y-3">
            <div className="flex items-center gap-2 bg-[#001645] px-3 py-2.5">
              <Search size={16} className="text-gray-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players to add..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none font-medium"
                autoFocus
              />
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {addableUsers.length === 0 ? (
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center py-4">
                  {searchQuery.trim() ? 'No players match your search' : 'All players are already in this group'}
                </p>
              ) : (
                addableUsers.slice(0, 20).map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleAddMember(user.id)}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-between p-3 bg-[#001645] rounded-none active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-[#000B29] object-cover shrink-0" style={{ backgroundColor: getAvatarColor(user.avatar) }} />
                      <span className="text-sm font-bold text-white truncate">{user.name}</span>
                    </div>
                    <UserPlus size={16} className="text-[#00FF41] shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {members.map(member => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-[#001645] rounded-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`rounded-full shrink-0 ${getRankFrameClass(member.rankFrame).replace('ring-4', 'ring-2')}`}>
                  <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full border border-[#000B29] object-cover" style={{ backgroundColor: getAvatarColor(member.avatar) }} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{member.name}</div>
                  <div className="text-[10px] font-mono text-yellow-500">{member.points} pts</div>
                </div>
              </div>
              {member.id === group.ownerId ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00FF41] shrink-0 ml-2">Owner</span>
              ) : isOwner ? (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setConfirmConfig({
                      title: 'Remove Member',
                      message: `Remove ${member.name} from ${group.name}?`,
                      isDestructive: true,
                      confirmLabel: 'Remove',
                      action: () => onRemoveMember(group.id, member.id),
                    });
                  }}
                  aria-label={`Remove ${member.name}`}
                  className="p-2 text-gray-500 active:text-red-400 transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      )}

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
