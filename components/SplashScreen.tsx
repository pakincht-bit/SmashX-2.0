import React from 'react';
import { getAvatarColor } from '../utils';

interface SplashScreenProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

const ORBIT_AVATARS = [
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Alexander',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Jessica',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Ryan',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Sarah',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Christian',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Sofia',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Brian',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Amelia',
];

const SplashScreen: React.FC<SplashScreenProps> = ({ onLoginClick, onRegisterClick }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#000B29] flex flex-col items-center justify-between p-8 overflow-hidden animate-fade-in">
      <style>{`
        @keyframes spin-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes spin-slow-reverse {
          from { transform: translate(-50%, -50%) rotate(360deg); }
          to { transform: translate(-50%, -50%) rotate(0deg); }
        }
        @keyframes counter-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes counter-spin-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .orbit-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            border-radius: 50%;
            transform: translate(-50%, -50%);
        }
        
        .orbit-1 { animation: spin-slow 40s linear infinite; width: 320px; height: 320px; }
        .orbit-2 { animation: spin-slow-reverse 60s linear infinite; width: 500px; height: 500px; }
        .orbit-3 { animation: spin-slow 80s linear infinite; width: 750px; height: 750px; }
        
        /* Mobile adjustments */
        @media (max-width: 640px) {
            .orbit-1 { width: 280px; height: 280px; }
            .orbit-2 { width: 420px; height: 420px; }
            .orbit-3 { width: 600px; height: 600px; }
        }

        .orbit-item {
            position: absolute;
            animation: counter-spin 40s linear infinite; /* Match orbit-1 duration */
        }
        .orbit-2 .orbit-item { animation: counter-spin-reverse 60s linear infinite; }
        .orbit-3 .orbit-item { animation: counter-spin 80s linear infinite; }
      `}</style>

      {/* Orbiting Background Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
          {/* Center Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#00FF41] rounded-full filter blur-[100px] opacity-10"></div>
          
          {/* Ring 1 */}
          <div className="orbit-ring orbit-1 border border-[#00FF41]/10 shadow-[0_0_50px_rgba(0,255,65,0.05)]">
              <div className="orbit-item" style={{ top: '-20px', left: '50%', marginLeft: '-20px' }}>
                 <div className="p-1 rounded-full bg-[#000B29] border border-[#00FF41]/30 shadow-[0_0_15px_rgba(0,255,65,0.2)]">
                    <img src={ORBIT_AVATARS[0]} className="w-8 h-8 rounded-full" style={{ backgroundColor: getAvatarColor(ORBIT_AVATARS[0]) }} />
                 </div>
              </div>
              <div className="orbit-item" style={{ bottom: '-20px', left: '50%', marginLeft: '-20px' }}>
                 <div className="p-1 rounded-full bg-[#000B29] border border-[#00FF41]/30 shadow-[0_0_15px_rgba(0,255,65,0.2)]">
                    <img src={ORBIT_AVATARS[1]} className="w-8 h-8 rounded-full" style={{ backgroundColor: getAvatarColor(ORBIT_AVATARS[1]) }} />
                 </div>
              </div>
          </div>

          {/* Ring 2 */}
          <div className="orbit-ring orbit-2 border border-blue-500/10 shadow-[0_0_60px_rgba(59,130,246,0.05)]">
               <div className="orbit-item" style={{ top: '20%', left: '85%' }}>
                 <div className="p-1 rounded-full bg-[#000B29] border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <img src={ORBIT_AVATARS[2]} className="w-10 h-10 rounded-full" style={{ backgroundColor: getAvatarColor(ORBIT_AVATARS[2]) }} />
                 </div>
              </div>
              <div className="orbit-item" style={{ bottom: '20%', left: '15%' }}>
                 <div className="p-1 rounded-full bg-[#000B29] border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <img src={ORBIT_AVATARS[3]} className="w-10 h-10 rounded-full" style={{ backgroundColor: getAvatarColor(ORBIT_AVATARS[3]) }} />
                 </div>
              </div>
              <div className="orbit-item" style={{ top: '50%', left: '-24px' }}>
                 <div className="p-1 rounded-full bg-[#000B29] border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <img src={ORBIT_AVATARS[4]} className="w-10 h-10 rounded-full" style={{ backgroundColor: getAvatarColor(ORBIT_AVATARS[4]) }} />
                 </div>
              </div>
          </div>

          {/* Ring 3 */}
          <div className="orbit-ring orbit-3 border border-purple-500/10 shadow-[0_0_80px_rgba(168,85,247,0.05)]">
              <div className="orbit-item" style={{ top: '15%', left: '15%' }}>
                 <div className="p-1.5 rounded-full bg-[#000B29] border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <img src={ORBIT_AVATARS[5]} className="w-12 h-12 rounded-full" style={{ backgroundColor: getAvatarColor(ORBIT_AVATARS[5]) }} />
                 </div>
              </div>
              <div className="orbit-item" style={{ bottom: '30%', right: '5%' }}>
                 <div className="p-1.5 rounded-full bg-[#000B29] border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <img src={ORBIT_AVATARS[6]} className="w-12 h-12 rounded-full" style={{ backgroundColor: getAvatarColor(ORBIT_AVATARS[6]) }} />
                 </div>
              </div>
              <div className="orbit-item" style={{ top: '40%', right: '90%' }}>
                 <div className="p-1.5 rounded-full bg-[#000B29] border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <img src={ORBIT_AVATARS[7]} className="w-12 h-12 rounded-full" style={{ backgroundColor: getAvatarColor(ORBIT_AVATARS[7]) }} />
                 </div>
              </div>
          </div>
          
          {/* Overlay Gradient to fade edges */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#000B29]/20 via-transparent to-[#000B29]/80 pointer-events-none"></div>
      </div>

      {/* Hero Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10 pt-10">
        {/* Animated Logo */}
        <div className="mb-8 relative group">
          <div className="absolute inset-0 bg-[#00FF41] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
          <div className="w-24 h-24 bg-[#00FF41] -skew-x-12 flex items-center justify-center shadow-[0_0_30px_rgba(0,255,65,0.3)] relative overflow-hidden">
             {/* Cracks for SX Logo */}
             <div className="absolute top-[-10%] left-[20%] w-[2px] h-[50%] bg-[#000B29]/30 rotate-[15deg]"></div>
             <div className="absolute bottom-[-10%] right-[20%] w-[2px] h-[50%] bg-[#000B29]/30 -rotate-[25deg]"></div>
             <div className="absolute top-[50%] left-[-10%] w-[120%] h-[2px] bg-[#000B29]/30 rotate-[5deg]"></div>

             <span className="text-[#000B29] font-black text-4xl skew-x-12 tracking-tighter relative z-10">SX</span>
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter mb-4 leading-none drop-shadow-xl">
          Smash<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF41] to-teal-400">X</span>
        </h1>
        
        <p className="text-gray-300 text-sm md:text-base font-medium tracking-wide max-w-xs mx-auto mb-8 uppercase drop-shadow-md bg-[#000B29]/50 backdrop-blur-sm p-2 rounded">
          Smash. Rally. Connect.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-sm space-y-4 relative z-10 mb-8">
        <button 
          onClick={onLoginClick}
          className="w-full group relative"
        >
          <div className="absolute inset-0 bg-[#00FF41] rounded opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></div>
          <div className="relative bg-[#00FF41] hover:bg-white text-[#000B29] py-4 px-6 -skew-x-12 transition-all duration-300 border border-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.3)]">
             <span className="block skew-x-12 font-black uppercase tracking-widest text-sm">Login</span>
          </div>
        </button>

        <button 
          onClick={onRegisterClick}
          className="w-full group relative"
        >
          <div className="relative bg-[#000B29]/80 hover:bg-[#001645] backdrop-blur text-white py-4 px-6 -skew-x-12 transition-all duration-300 border border-gray-600 hover:border-white shadow-lg">
             <span className="block skew-x-12 font-bold uppercase tracking-widest text-sm">Create Account</span>
          </div>
        </button>
      </div>
      
      <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest relative z-10">
        v1.1.0 Alpha
      </div>
    </div>
  );
};

export default SplashScreen;