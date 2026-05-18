import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../utils';

interface FrameUnlockModalProps {
  isOpen: boolean;
  unlockedFrames: string[];
  scenario: 'rank' | 'cosmetic';
  onCustomize: () => void;
  onDismiss: () => void;
}

const FRAME_LABELS: Record<string, string> = {
  spark: 'Spark',
  combustion: 'Combustion',
  void: 'Void',
  ascended: 'Ascended',
  cat: 'Cat',
  dog: 'Dog',
  frog: 'Frog',
  panda: 'Panda',
};

const FrameUnlockModal: React.FC<FrameUnlockModalProps> = ({
  isOpen,
  unlockedFrames,
  scenario,
  onCustomize,
  onDismiss,
}) => {
  useEffect(() => {
    if (isOpen) triggerHaptic('success');
  }, [isOpen]);

  if (!isOpen) return null;

  const isRank = scenario === 'rank';
  const displayFrames = unlockedFrames.filter(f => f !== 'none' && f !== 'unpolished');

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-[#000B29]/80 backdrop-blur-sm">
      <div className="bg-[#001645] shadow-[0_8px_32px_rgba(0,0,0,0.4)] w-full max-w-sm relative overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Decorative strip */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#00FF41]" />

        <div className="p-6 pl-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            {isRank
              ? <Trophy size={22} className="text-[#00FF41] shrink-0" />
              : <Sparkles size={22} className="text-[#00FF41] shrink-0" />
            }
            <h3 className="text-xl font-black italic uppercase text-white tracking-wider">
              {isRank ? 'Frame Unlocked' : 'New Frames Available'}
            </h3>
          </div>

          <p className="text-gray-400 text-sm leading-relaxed mb-5 font-medium">
            {isRank
              ? "You've crossed into a new tier. Equip your new frame in Settings."
              : "New avatar frames have landed in the arena. Check them out in Settings."
            }
          </p>

          {/* Frame Previews */}
          {displayFrames.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {displayFrames.map(frame => (
                <div key={frame} className="flex flex-col items-center gap-1.5">
                  <div className="w-16 h-16 bg-[#000B29] border border-white/10 flex items-center justify-center overflow-hidden">
                    <img
                      src={`/frame/${frame}.svg`}
                      alt={frame}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.nextElementSibling) {
                          (target.nextElementSibling as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                    <div className="hidden w-full h-full items-center justify-center text-[10px] font-black tracking-widest text-gray-500 uppercase">
                      {frame}
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00FF41]">
                    {FRAME_LABELS[frame] ?? frame}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex border-t border-white/5">
          <button
            onClick={() => { triggerHaptic('light'); onDismiss(); }}
            className="flex-1 py-4 bg-[#000F33] text-gray-400 font-bold uppercase tracking-wider text-xs transition-colors border-r border-white/5 active:scale-95"
          >
            Later
          </button>
          <button
            onClick={() => { triggerHaptic('light'); onCustomize(); }}
            className="flex-1 py-4 bg-[#00FF41]/10 text-[#00FF41] font-black uppercase tracking-wider text-xs transition-all active:scale-95"
          >
            Customize Now
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FrameUnlockModal;
