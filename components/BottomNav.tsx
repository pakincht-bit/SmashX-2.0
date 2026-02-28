
import React, { useMemo } from 'react';
import { Calendar, Trophy, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { getAvatarColor, triggerHaptic } from '../utils';

interface BottomNavProps {
  activeTab: 'sessions' | 'leaderboard' | 'profile';
  onTabChange: (tab: 'sessions' | 'leaderboard' | 'profile') => void;
  currentUser: User | null;
}

const BottomNav: React.FC<BottomNavProps> = React.memo(({ activeTab, onTabChange, currentUser }) => {
  const tabs = useMemo(() => [
    { id: 'sessions', label: 'Arena', icon: Calendar },
    { id: 'leaderboard', label: 'Ranks', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ], []);

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  const handleTabClick = (tabId: string) => {
    if (tabId !== activeTab) {
      triggerHaptic('light');
      onTabChange(tabId as any);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pointer-events-none">
      <div className="max-w-md mx-auto relative pointer-events-auto">
        {/* Main Glass Container */}
        <div className="relative flex items-center justify-around h-16 bg-[#000B29]/75 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden">

          {/* Liquid Sliding Indicator */}
          <div
            className="absolute top-0 bottom-0 left-0 w-[33.33%] p-1.5 transition-all duration-500 cubic-bezier(0.68, -0.6, 0.32, 1.6)"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          >
            <div className="w-full h-full bg-[#00FF41]/10 border border-[#00FF41]/20 rounded-[26px] shadow-[0_0_20px_rgba(0,255,65,0.15)] relative overflow-hidden group">
              {/* Glow Core */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00FF41]/20 to-transparent opacity-50"></div>
              {/* Animated Liquid Shine */}
              <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] animate-[shine_3s_infinite]"></div>
            </div>
          </div>

          {/* Navigation Items */}
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`relative z-10 flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${isActive ? 'text-[#00FF41]' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <div className={`transition-transform duration-500 ${isActive ? 'scale-95' : 'scale-85'}`}>
                  {tab.id === 'profile' && currentUser ? (
                    <div className="relative">
                      <img
                        src={currentUser.avatar}
                        alt="Profile"
                        className={`w-6 h-6 rounded-full object-cover border transition-all duration-300 ${isActive ? 'border-[#00FF41] shadow-[0_0_10px_rgba(0,255,65,0.4)]' : 'border-gray-500'}`}
                        style={{ backgroundColor: getAvatarColor(currentUser.avatar) }}
                      />
                      {isActive && <div className="absolute -inset-1.5 bg-[#00FF41]/20 blur-sm rounded-full -z-10 animate-pulse"></div>}
                    </div>
                  ) : (
                    <div className="relative">
                      <Icon
                        size={22}
                        strokeWidth={isActive ? 3 : 2}
                        className={`transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_10px_rgba(0,255,65,0.6)]' : ''}`}
                      />
                      {isActive && <div className="absolute inset-0 bg-[#00FF41]/20 blur-md rounded-full -z-10"></div>}
                    </div>
                  )}
                </div>

                {/* Label - Reduced to 9px */}
                <span className={`text-[9px] font-black uppercase tracking-[0.15em] mt-1.5 transition-all duration-300 leading-none ${isActive ? 'opacity-100 scale-100' : 'opacity-60 scale-95'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Outer subtle glow */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-[#00FF41]/5 blur-3xl rounded-full -z-10"></div>
      </div>

      <style>{`
        @keyframes shine {
          0% { left: -100%; }
          20% { left: 100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
});

export default BottomNav;
