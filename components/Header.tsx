
import React from 'react';
import { User } from '../types';
import { LogOut } from 'lucide-react';
import { triggerHaptic } from '../utils';

interface HeaderProps {
  currentUser: User;
  allUsers: User[];
  onUserChange: (userId: string) => void;
  onOpenCreate: () => void;
  onLogout: () => void;
  showCreateButton?: boolean;
  showLogoutButton?: boolean;
  onLogoClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onOpenCreate, 
  showCreateButton = true, 
  onLogout, 
  showLogoutButton = false,
  onLogoClick 
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#000B29]/90 backdrop-blur-md border-b border-[#002266] pt-[env(safe-area-inset-top)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
            {/* Logo Icon - SX with Cracks */}
            <div 
              onClick={() => {
                triggerHaptic('light');
                onLogoClick?.();
              }}
              className="w-8 h-8 bg-[#00FF41] rounded-none skew-x-[-10deg] flex items-center justify-center text-[#000B29] font-black transform shadow-[0_0_15px_rgba(0,255,65,0.3)] relative overflow-hidden group hover:scale-105 transition-transform cursor-pointer"
            >
                {/* Cracks */}
                <div className="absolute top-[-2px] left-[10px] w-[1px] h-[12px] bg-[#000B29] rotate-[15deg] opacity-40"></div>
                <div className="absolute bottom-[-2px] right-[8px] w-[1px] h-[15px] bg-[#000B29] -rotate-[25deg] opacity-40"></div>
                <div className="absolute top-[50%] right-[-2px] w-[10px] h-[1px] bg-[#000B29] rotate-[10deg] opacity-40"></div>
                
                <span className="relative z-10 tracking-tighter">SX</span>
            </div>
        </div>

        <div className="flex items-center gap-4">
           {showCreateButton && (
            <button
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenCreate();
                }}
                className="hidden sm:block bg-[#00FF41] hover:bg-white text-[#000B29] px-5 py-2.5 rounded-none -skew-x-12 text-sm font-black uppercase tracking-wider shadow-[0_0_20px_rgba(0,255,65,0.2)] transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] active:scale-95"
            >
                <span className="skew-x-12 inline-block">+ New Session</span>
            </button>
           )}
           
           {/* Mobile Plus button */}
           {showCreateButton && (
            <button
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenCreate();
                }}
                className="sm:hidden bg-[#00FF41] hover:bg-white text-[#000B29] px-3 py-1.5 flex items-center justify-center rounded-none -skew-x-12 text-[10px] font-black shadow-[0_0_20px_rgba(0,255,65,0.2)] uppercase tracking-wider active:scale-95 transition-all"
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
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                title="Sign Out"
            >
                <LogOut size={22} />
            </button>
           )}
        </div>
      </div>
    </header>
  );
};

export default Header;
