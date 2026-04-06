import React, { useState, useMemo } from 'react';
import { User, Session } from '../types';
import { LogOut, History, Calendar } from 'lucide-react';
import { triggerHaptic, getAvatarColor, getRankFrameClass, getDateParts, formatTime } from '../utils';

interface HeaderProps {
 currentUser: User;
 allUsers: User[];
 onUserChange: (userId: string) => void;
 onOpenCreate: () => void;
 onLogout: () => void;
 showCreateButton?: boolean;
 showLogoutButton?: boolean;
 onLogoClick?: () => void;
 sessions?: Session[];
 onOpenHistory?: () => void;
 onOpenActivity?: () => void;
}

const Header: React.FC<HeaderProps> = React.memo(({
 currentUser,
 allUsers,
 onOpenCreate,
 showCreateButton = true,
 onLogout,
 showLogoutButton = false,
 onLogoClick,
 sessions = [],
 onOpenHistory,
 onOpenActivity
}) => {
 const rank = useMemo(() => {
 if (!currentUser || !allUsers) return '-';
 const sorted = [...allUsers].sort((a, b) => b.points - a.points);
 const idx = sorted.findIndex(u => u.id === currentUser.id);
 return idx >= 0 ? idx + 1 : '-';
 }, [allUsers, currentUser]);

 return (
 <header className="sticky top-0 z-40 w-full bg-[#000B29]/90 backdrop-blur-md border-b border-white/5 pt-[env(safe-area-inset-top)]">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
 
 {/* Left Block: Profile + History Toggle */}
 <div className="flex items-center">
 <div
 onClick={() => {
 triggerHaptic('light');
 onLogoClick?.();
 }}
 className="flex items-center gap-3 cursor-pointer group"
 >
 <div className="relative shrink-0">
 <div className={`w-10 h-10 rounded-full p-0.5 shadow-lg transition-transform duration-300 ${getRankFrameClass(currentUser.rankFrame)}`}>
 <img
 src={currentUser.avatar}
 className="w-full h-full rounded-full border-2 border-[#000B29] object-cover relative z-10"
 style={{ backgroundColor: getAvatarColor(currentUser.avatar) }}
 alt={currentUser.name}
 />
 </div>
 </div>
 
 <div className="flex flex-col items-start justify-center">
 <span className="text-[9px] font-black uppercase tracking-[0.2em] italic text-gray-400 leading-none mb-0.5">Rank #{rank}</span>
 <span className="text-xl font-black text-white italic tracking-tighter truncate max-w-[160px] transition-colors ">
 {currentUser.name}
 </span>
 </div>
 </div>
 </div>

 {/* Right Block: Actions */}
 <div className="flex items-center gap-3 sm:gap-4">
 <button
 onClick={(e) => {
 e.stopPropagation();
 triggerHaptic('light');
 onOpenActivity?.();
 }}
 className="p-2 sm:p-2.5 rounded-full transition-all shrink-0 bg-[#000B29]/50 text-gray-400 border border-transparent "
 title="Activity Log"
 >
 <Calendar size={18} className="" />
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 triggerHaptic('light');
 onOpenHistory?.();
 }}
 className="p-2 sm:p-2.5 rounded-full transition-all shrink-0 bg-[#000B29]/50 text-gray-400 border border-transparent "
 title="Battle History"
 >
 <History size={18} className="" />
 </button>
 {showCreateButton && (
 <button
 onClick={() => {
 triggerHaptic('medium');
 onOpenCreate();
 }}
 className="hidden sm:block bg-[#00FF41] text-[#000B29] px-5 py-2.5 rounded-none -skew-x-12 text-sm font-black uppercase tracking-wider shadow-[0_0_20px_rgba(0,255,65,0.2)] transition-all (255,255,255,0.4)] active:scale-95 items-center gap-2"
 >
 <span className="skew-x-12 inline-block whitespace-nowrap">+ New Session</span>
 </button>
 )}

 {/* Mobile Plus button */}
 {showCreateButton && (
 <button
 onClick={() => {
 triggerHaptic('medium');
 onOpenCreate();
 }}
 className="sm:hidden bg-[#00FF41] text-[#000B29] px-3 py-1.5 flex items-center justify-center rounded-none -skew-x-12 text-[10px] font-black shadow-[0_0_20px_rgba(0,255,65,0.2)] uppercase tracking-wider active:scale-95 transition-all"
 >
 <span className="skew-x-12 inline-block whitespace-nowrap">+ New Session</span>
 </button>
 )}

 {showLogoutButton && (
 <button
 onClick={() => {
 triggerHaptic('medium');
 onLogout();
 }}
 className="p-2 text-gray-400 rounded-full transition-all"
 title="Sign Out"
 >
 <LogOut size={22} />
 </button>
 )}
 </div>
 </div>
 </header>
 );
});

export default Header;
