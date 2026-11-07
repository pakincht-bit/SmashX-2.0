import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { User } from '../types';
import { getAvatarColor, getRankFrameClass, triggerHaptic } from '../utils';

const CLOSE_MS = 200; // matches .sheet-panel.is-closing in index.html

export interface EvidenceRow {
  key: string;
  avatars: User[];
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: string;
  valueClass?: string;
}

interface EvidenceSheetProps {
  player: User;
  title: string;
  titleClass: string;
  description: string;
  rows: EvidenceRow[];
  onClose: () => void;
}

// Bottom sheet listing the matches or partners behind a session badge
const EvidenceSheet: React.FC<EvidenceSheetProps> = ({ player, title, titleClass, description, rows, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  // Keeps the sheet mounted long enough for its slide-out to play
  const close = () => {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(onClose, CLOSE_MS);
  };

  // Portaled to body so the session page's scroll area can't clip a fixed sheet
  return createPortal(
    <div className={`sheet-backdrop fixed inset-0 z-[260] flex items-end justify-center bg-black/80 backdrop-blur-sm ${isClosing ? 'is-closing' : ''}`} onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`sheet-panel relative bg-[#000B29] w-full max-w-2xl max-h-[70vh] flex flex-col shadow-2xl border-t border-[#002266] ${isClosing ? 'is-closing' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <button type="button" onClick={() => { triggerHaptic('light'); close(); }} className="absolute top-3 right-3 sm:right-5 p-1.5 text-gray-400 rounded-full transition-colors active:scale-95" aria-label="Close">
          <X size={18} />
        </button>
        <div className="flex flex-col items-center text-center px-10 pt-6 pb-4 shrink-0 border-b border-[#002266]">
          <div className={`rounded-full ${getRankFrameClass(player.rankFrame).replace('ring-4', 'ring-2')}`}>
            <img src={player.avatar} alt="" className="w-16 h-16 rounded-full border border-[#000B29] object-cover" style={{ backgroundColor: getAvatarColor(player.avatar) }} />
          </div>
          <p className="mt-3 text-base font-bold text-white truncate max-w-full">{player.name}</p>
          <h3 className={`text-sm font-black italic uppercase tracking-wider ${titleClass}`}>{title}</h3>
          <p className="mt-1 text-sm text-gray-300">{description}</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {rows.map(row => (
            <div key={row.key} className="flex items-center gap-3 py-2.5 px-4 sm:px-6 border-b border-[#001645] last:border-0">
              <span className="flex -space-x-2 shrink-0">
                {row.avatars.map((user, i) => (
                  <img key={user.id} src={user.avatar} alt="" className={`w-8 h-8 rounded-full border border-[#000B29] object-cover ${i === 0 ? 'relative z-10' : ''}`} style={{ backgroundColor: getAvatarColor(user.avatar) }} />
                ))}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 break-words leading-snug">{row.title}</p>
                {row.subtitle && <p className="text-xs text-gray-400 truncate">{row.subtitle}</p>}
              </div>
              {row.value && <span className={`text-sm font-semibold tabular-nums shrink-0 ${row.valueClass ?? 'text-gray-300'}`}>{row.value}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EvidenceSheet;
