
import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { X, ChevronLeft, ChevronRight, Zap, Waves, Flame, Diamond, Orbit, Sun, Mountain } from 'lucide-react';
import { getAvatarColor, getRankFrameClass } from '../utils';

interface ArenaTiersModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export const RANK_TIERS = [
  { id: 'unpolished', min: 0, name: 'The Unpolished', range: '< 1,100', icon: <Mountain size={24} />, color: 'text-zinc-500' },
  { id: 'spark', min: 1100, name: 'The Spark', range: '1,100 - 1,299', icon: <Zap size={24} />, color: 'text-cyan-400' },
  { id: 'flow', min: 1300, name: 'The Flow', range: '1,300 - 1,599', icon: <Waves size={24} />, color: 'text-slate-300' },
  { id: 'combustion', min: 1600, name: 'The Combustion', range: '1,600 - 1,999', icon: <Flame size={24} />, color: 'text-orange-500' },
  { id: 'prism', min: 2000, name: 'The Prism', range: '2,000 - 2,499', icon: <Diamond size={24} />, color: 'text-pink-400' },
  { id: 'void', min: 2500, name: 'The Void', range: '2,500 - 2,999', icon: <Orbit size={24} />, color: 'text-purple-600' },
  { id: 'ascended', min: 3000, name: 'The Ascended', range: '3,000+', icon: <Sun size={24} />, color: 'text-white' },
];

const ArenaTiersModal: React.FC<ArenaTiersModalProps> = ({ isOpen, onClose, user }) => {
  const [previewRank, setPreviewRank] = useState<string | null>(null);

  const currentPreviewIndex = useMemo(() => {
    const targetId = previewRank || user.rankFrame || 'unpolished';
    const index = RANK_TIERS.findIndex(t => t.id === targetId);
    return index === -1 ? 0 : index;
  }, [previewRank, user.rankFrame]);

  const currentTier = RANK_TIERS[currentPreviewIndex];
  const isCurrent = user.rankFrame === currentTier.id;

  const handlePrev = () => {
    const newIndex = (currentPreviewIndex - 1 + RANK_TIERS.length) % RANK_TIERS.length;
    setPreviewRank(RANK_TIERS[newIndex].id);
  };

  const handleNext = () => {
    const newIndex = (currentPreviewIndex + 1) % RANK_TIERS.length;
    setPreviewRank(RANK_TIERS[newIndex].id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-[#000B29]/95 backdrop-blur-xl animate-in fade-in duration-300 p-6 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-[#001645] border border-[#002266] rounded-2xl overflow-hidden shadow-2xl flex flex-col relative max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-[#002266] bg-[#000B29]">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00FF41]">Progression</span>
                    <h2 className="text-lg font-black italic uppercase text-white tracking-widest leading-none">Arena <span className="text-[#00FF41]">Tiers</span></h2>
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"><X size={20}/></button>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-b from-[#001645] to-[#000B29] relative overflow-hidden min-h-[250px]">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10 filter blur-[80px] pointer-events-none transition-colors duration-500 ${currentTier.color.replace('text-', 'bg-')}`}></div>
                <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 z-20 text-gray-500 hover:text-white bg-[#000B29]/50 hover:bg-[#000B29] border border-[#002266] rounded-full transition-all active:scale-95"><ChevronLeft size={24} /></button>
                <div className="flex-1 flex flex-col items-center text-center px-12 relative z-10 animate-fade-in justify-center">
                    <div className="mb-1"><span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500">Tier {currentPreviewIndex + 1} / {RANK_TIERS.length}</span></div>
                    <h3 className={`text-2xl sm:text-3xl font-black italic uppercase tracking-tighter mb-1 whitespace-nowrap ${currentTier.color}`}>{currentTier.name}</h3>
                    <div className="flex items-center gap-2 mb-4"><div className={`px-3 py-1 rounded bg-[#000B29] border border-white/10 text-white text-[10px] font-bold font-mono uppercase tracking-widest`}>{currentTier.range} RP</div></div>
                    <div className="relative group mt-2">
                         <div className={`w-32 h-32 rounded-full p-1.5 transition-all duration-500 shadow-[0_0_60px_rgba(0,0,0,0.6)] ring-4 preview-active ${getRankFrameClass(currentTier.id)}`}>
                            <img src={user.avatar} className="w-full h-full rounded-full border-4 border-[#000B29] object-cover relative z-10" style={{ backgroundColor: getAvatarColor(user.avatar) }} alt="Preview" />
                            {currentTier.id === 'unpolished' && (
                                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
                                    <div className="dust-particle" style={{ left: '20%', animationDelay: '0s' }}></div>
                                    <div className="dust-particle" style={{ left: '50%', animationDelay: '1s' }}></div>
                                    <div className="dust-particle" style={{ left: '80%', animationDelay: '2s' }}></div>
                                </div>
                            )}
                         </div>
                         <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-[#000B29] border border-[#002266] flex items-center justify-center shadow-xl z-20 ${currentTier.color}`}>
                            {React.cloneElement(currentTier.icon as React.ReactElement<any>, { size: 20 })}
                         </div>
                         {isCurrent && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00FF41] text-[#000B29] text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg animate-bounce z-30 whitespace-nowrap">Current Rank</div>}
                    </div>
                </div>
                <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 z-20 text-gray-500 hover:text-white bg-[#000B29]/50 hover:bg-[#000B29] border border-[#002266] rounded-full transition-all active:scale-95"><ChevronRight size={24} /></button>
            </div>
            
            <div className="p-4 bg-[#000B29] border-t border-[#002266] flex justify-center gap-2">
                {RANK_TIERS.map((_, idx) => (
                    <div key={idx} onClick={() => setPreviewRank(RANK_TIERS[idx].id)} className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all ${idx === currentPreviewIndex ? 'bg-[#00FF41] w-4' : 'bg-gray-700 hover:bg-gray-500'}`} />
                ))}
            </div>
        </div>
    </div>
  );
};

export default ArenaTiersModal;
