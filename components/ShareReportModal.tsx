
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { User, Session } from '../types';
import { Download, X, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { triggerHaptic } from '../utils';
import { toPng } from 'html-to-image';

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  session: Session;
  stats: { wins: number; losses: number; pointsChange: number };
}

const ShareReportModal: React.FC<ShareReportModalProps> = ({ isOpen, onClose, user, session, stats }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showToast, setShowToast] = useState(false);

  const winRate = useMemo(() => {
    const total = stats.wins + stats.losses;
    return total > 0 ? Math.round((stats.wins / total) * 100) : 0;
  }, [stats.wins, stats.losses]);

  // Handle toast timeout
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  if (!isOpen) return null;

  const handleSaveImage = async () => {
    if (cardRef.current === null) return;

    triggerHaptic('medium');
    try {
      // High quality export (3.5x) with transparent background
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3.5, // 3.5x higher resolution
        backgroundColor: null, // Transparent background
        style: {
          borderRadius: '0',
        }
      });
      const link = document.createElement('a');
      link.download = `SmashX-Arena-Performance.png`;
      link.href = dataUrl;
      link.click();

      triggerHaptic('success');
      setShowToast(true);
    } catch (err) {
      console.error('oops, something went wrong!', err);
      alert('Failed to save image. Please try taking a screenshot instead.');
    }
  };

  const isPositive = stats.pointsChange >= 0;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <style>{`
        .checkerboard-bg {
          background-image: 
            linear-gradient(45deg, #111 25%, transparent 25%), 
            linear-gradient(-45deg, #111 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #111 75%), 
            linear-gradient(-45deg, transparent 75%, #111 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          background-color: #000;
        }
      `}</style>

      {/* Success Toast */}
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#001645]/95 backdrop-blur-md border border-[#00FF41] px-6 py-3 rounded-full shadow-[0_0_30px_rgba(0,255,65,0.4)] flex items-center gap-3">
            <div className="bg-[#00FF41] rounded-full p-1">
              <Check size={14} className="text-[#000B29]" strokeWidth={4} />
            </div>
            <span className="text-white text-xs font-black uppercase tracking-widest">Report Saved Successfully!</span>
          </div>
        </div>
      )}

      {/* Top Close Button */}
      <button
        onClick={() => { triggerHaptic('light'); onClose(); }}
        className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full transition-all active:scale-90 z-[230]"
      >
        <X size={24} />
      </button>

      <div className="w-full max-w-sm flex flex-col items-center">

        {/* Preview Label */}
        <div className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
          Transparency Preview
        </div>

        {/* Checkerboard Container to illustrate transparency */}
        <div className="w-full checkerboard-bg border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-4 flex items-center justify-center">
          {/* Simplified Strava-Style Performance Card */}
          <div
            ref={cardRef}
            id="share-card"
            className="w-full relative flex flex-col p-10 items-center justify-between overflow-hidden text-center"
          >
            {/* Main Stats Area - All centered and unified size */}
            <div className="flex flex-col gap-4 w-full mb-4">
              
              <div className="flex flex-col">
                <span className="text-white text-[10px] font-black mb-1 uppercase">Points Change</span>
                <div className="flex items-center justify-center pr-4">
                  <span className={`text-3xl font-black italic tracking-tighter leading-none ${isPositive ? 'text-[#00FF41]' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{stats.pointsChange}
                  </span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-white text-[10px] font-black mb-1 uppercase">Win Rate</span>
                <span className="text-white text-3xl pr-4 font-black italic tracking-tighter leading-none">{winRate}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white text-[10px] font-black mb-1 uppercase">Matches</span>
                <span className="text-white text-3xl pr-4 font-black italic tracking-tighter leading-none">{stats.wins + stats.losses}</span>
              </div>

            </div>

            {/* SX Logo Footer - Moved to Bottom */}
            <div className="flex flex-col items-center">
              <div className=" bg-[#FFFFFF] rounded-none skew-x-[-10deg] flex items-center justify-center text-[#000B29] font-black transform relative overflow-hidden">
                {/* Cracks */}
                <div className="absolute top-[-2px] left-[14px] w-[1px] h-[16px] bg-[#000B29] rotate-[15deg] opacity-40"></div>
                <div className="absolute bottom-[-2px] right-[12px] w-[1px] h-[20px] bg-[#000B29] -rotate-[25deg] opacity-40"></div>
                <div className="absolute top-[50%] right-[-2px] w-[14px] h-[1px] bg-[#000B29] rotate-[10deg] opacity-40"></div>
                <span className="relative z-10 text-xl tracking-tighter">SmashX</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col items-center mt-10">
          <button
            onClick={handleSaveImage}
            className="w-full py-5 bg-white text-black font-black uppercase tracking-widest text-sm transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] flex items-center justify-center gap-3 active:scale-95"
          >
            <Download size={20} />
            <span>Save to Device</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareReportModal;
