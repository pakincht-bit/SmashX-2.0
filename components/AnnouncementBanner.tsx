import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, ChevronRight, X, Share2 } from 'lucide-react';
import { triggerHaptic } from '../utils';

interface AnnouncementBannerProps {
  onPress?: () => void;
}

const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ onPress }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Automatically open the dialog once per session
    const hasSeen = sessionStorage.getItem('smashx_winner_poster_seen');
    if (!hasSeen) {
      setIsModalOpen(true);
      sessionStorage.setItem('smashx_winner_poster_seen', 'true');
    }
  }, []);

  const handleOpen = () => {
    triggerHaptic('medium');
    setIsModalOpen(true);
    if (onPress) onPress();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    setIsModalOpen(false);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    
    const shareData = {
      title: 'SmashX Champions',
      text: 'Our SmashX arena regulars just took the gold at the tournament! 🏆',
      url: window.location.origin
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      triggerHaptic('success');
      alert('Link copied to clipboard!');
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <div 
        onClick={handleOpen}
        className="sticky top-0 z-[59] w-full bg-[#000B29] border-b border-[#00FF41]/20 text-white cursor-pointer group overflow-hidden animate-in slide-in-from-top duration-500 pt-[max(env(safe-area-inset-top),0px)]"
      >
        {/* Animated Background Shine */}
        <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-[#00FF41]/10 to-transparent skew-x-[-25deg] animate-[shine_4s_infinite]"></div>

        <div className="max-w-5xl mx-auto px-4 h-10 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-[#001645] p-1 rounded-none -skew-x-12 shadow-md">
              <Trophy size={14} className="text-[#00FF41] skew-x-12" strokeWidth={2.5} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.1em] italic leading-none">
              SmashX Players <span className="text-[#00FF41]">Take the Gold</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#00FF41]/10 text-[#00FF41] px-2 py-1 -skew-x-12 text-[9px] font-black uppercase tracking-widest shadow-md transition-all group-hover:bg-[#00FF41] group-hover:text-[#000B29]">
              <span className="skew-x-12">View</span>
              <ChevronRight size={10} className="skew-x-12" strokeWidth={3} />
            </div>
            {/* Optional dismiss button for the banner itself */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
              }}
              className="p-1 ml-1 text-gray-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {isModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[1000] bg-[#000B29]/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200"
          onClick={handleClose}
        >
          <div className="flex justify-end p-4 sm:p-6 pt-[max(env(safe-area-inset-top),16px)] sm:pt-[max(env(safe-area-inset-top),24px)] shrink-0 z-10">
            <button 
              onClick={handleClose}
              className="w-10 h-10 bg-[#001645] rounded-full flex items-center justify-center text-white border border-[#002266] active:scale-95 transition-transform"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4 pb-24 sm:p-8 sm:pb-24 -mt-16">
            <img 
              src="/winner-poster.jpg?v=3" 
              alt="SmashX Tournament Winners Full" 
              className="w-full h-full object-contain rounded-sm shadow-[0_0_50px_rgba(0,255,65,0.15)] animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>

          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20 pointer-events-none">
            <button 
              onClick={handleShare}
              className="pointer-events-auto flex items-center gap-2 bg-[#00FF41] text-[#000B29] px-8 py-3 rounded-full font-black uppercase tracking-widest shadow-[0_0_30px_rgba(0,255,65,0.4)] active:scale-95 transition-transform hover:scale-105"
            >
              <Share2 size={18} strokeWidth={3} />
              Share Poster
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default AnnouncementBanner;
