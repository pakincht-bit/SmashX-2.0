
import React, { useState, useEffect } from 'react';
import { Smartphone, Download } from 'lucide-react';
import { triggerHaptic } from '../utils';

interface InstallBannerProps {
  onOpenGuide: () => void;
}

const InstallBanner: React.FC<InstallBannerProps> = ({ onOpenGuide }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if app is already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    // Check if user has dismissed it recently (24 hour cooldown)
    const dismissalTime = localStorage.getItem('smashx_install_dismissed');
    const now = Date.now();
    const isDismissed = dismissalTime && (now - parseInt(dismissalTime)) < 24 * 60 * 60 * 1000;

    if (!isStandalone && !isDismissed) {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      onClick={() => { triggerHaptic('medium'); onOpenGuide(); }}
      className="sticky top-0 z-[60] w-full bg-[#00FF41] text-[#000B29] cursor-pointer group overflow-hidden animate-in slide-in-from-top duration-500 pt-[env(safe-area-inset-top)]"
    >
        {/* Animated Background Pulse */}
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-25deg] animate-[shine_4s_infinite]"></div>

        <div className="max-w-5xl mx-auto px-4 h-11 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
                <div className="bg-[#000B29] p-1 rounded-sm -skew-x-12 shadow-lg">
                    <Smartphone size={14} className="text-[#00FF41] skew-x-12" strokeWidth={3} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.1em] italic leading-none">
                    Get the <span className="underline decoration-2">Full Arena Experience</span>
                </p>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-1.5 bg-[#000B29] text-white px-3 py-1 -skew-x-12 text-[9px] font-black uppercase tracking-widest shadow-md group-hover:bg-white group-hover:text-[#000B29] transition-all">
                    <Download size={10} className="skew-x-12" strokeWidth={4} />
                    <span className="skew-x-12">Install App</span>
                </div>
                
                {/* Mobile version simple button */}
                <div className="sm:hidden flex items-center gap-1.5 bg-[#000B29] text-white px-2 py-1 -skew-x-12 text-[8px] font-black uppercase tracking-widest shadow-md">
                   <span className="skew-x-12">Install</span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default InstallBanner;
