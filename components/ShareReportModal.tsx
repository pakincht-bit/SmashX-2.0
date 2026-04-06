
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { User, Session } from '../types';
import { Download, X, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { triggerHaptic, getAvatarColor, getRankFrameClass, getDateParts } from '../utils';
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

 const getDynamicTitle = () => {
 if (stats.wins > 0 && stats.losses === 0) return { title: "UNTOUCHABLE", subtitle: "FLAWLESS RUN" };
 if (stats.wins + stats.losses === 0) return { title: "WARMING UP", subtitle: "0 MATCHES PLAYED" };
 if (stats.pointsChange > 20) return { title: "ARENA VICTOR", subtitle: "DOMINATING PERFORMANCE" };
 if (stats.wins > stats.losses) return { title: "HOT STREAK", subtitle: "MORE WINS THAN LOSSES" };
 if (stats.pointsChange < 0 && stats.wins > 0) return { title: "FOUGHT HARD", subtitle: "NEVER GAVE UP" };
 return { title: "TRAINING ARC", subtitle: "WE GO AGAIN..." };
 };
 const titleInfo = getDynamicTitle();

 return (
 <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
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
 className="absolute top-6 right-6 p-3 bg-white/5 border border-white/10 text-white rounded-full transition-all active:scale-90 z-[230]"
 >
 <X size={24} />
 </button>

 <div className="w-full max-w-sm flex flex-col items-center">
 {/* Preview Label */}
 <div className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
 Player Card Preview
 </div>

 {/* Player Card Container */}
 <div className="w-full border border-[#002266] rounded-none overflow-hidden shadow-[0_0_50px_rgba(0,11,41,0.8)] p-0 flex items-center justify-center">
 <div
 ref={cardRef}
 id="share-card"
 className="w-full aspect-[4/5] relative flex flex-col p-6 sm:p-8 items-center justify-between overflow-hidden text-center bg-gradient-to-b from-[#001645] to-[#000B29]"
 style={{ backgroundColor: '#000B29' }} // Strict fallback
 >
 {/* Background Decor */}
 <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-[#00FF41] opacity-[0.02] blur-[100px] pointer-events-none translate-x-1/4 -translate-y-1/4"></div>
 <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#000B29] to-transparent pointer-events-none"></div>

 {/* Top Badge: Dynamic Title */}
 <div className="flex flex-col items-center gap-1 z-10 w-full mt-2">
 <span className="text-[#00FF41] text-[10px] font-black uppercase tracking-[0.3em]">{titleInfo.subtitle}</span>
 <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none">{titleInfo.title}</h2>
 </div>
 
 {/* Center Player Showcase */}
 <div className="relative flex flex-col items-center justify-center my-auto py-6 z-10">
 <div className={`rounded-full ${getRankFrameClass(user.rankFrame).replace('ring-4', 'ring-2')}`}>
 <img src={user.avatar} className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-[#000B29] object-cover" style={{ backgroundColor: getAvatarColor(user.avatar) }} />
 </div>
 <div className="mt-5 bg-[#000B29]/90 border border-[#002266] backdrop-blur-md px-6 py-2 rounded-full">
 <span className="text-white font-black text-lg tracking-wide">{user.name}</span>
 </div>
 </div>

 {/* Main Stats Grid */}
 <div className="grid grid-cols-3 gap-2 w-full z-10 mb-4">
 <div className="flex flex-col items-center justify-center bg-[#001645]/80 border border-[#002266] backdrop-blur-sm rounded-none py-3 relative overflow-hidden">
 <span className="text-gray-500 text-[8px] font-black mb-1 uppercase tracking-widest relative z-10">Points</span>
 <span className={`text-xl sm:text-2xl font-black italic tracking-tighter leading-none relative z-10 ${isPositive ? 'text-[#00FF41]' : 'text-red-500'}`}>
 {isPositive ? '+' : ''}{stats.pointsChange}
 </span>
 {isPositive && <div className="absolute inset-0 bg-[#00FF41] opacity-5 mix-blend-overlay"></div>}
 </div>
 <div className="flex flex-col items-center justify-center bg-[#001645]/80 border border-[#002266] backdrop-blur-sm rounded-none py-3">
 <span className="text-gray-500 text-[8px] font-black mb-1 uppercase tracking-widest">Matches</span>
 <span className="text-white text-xl sm:text-2xl font-black italic tracking-tighter leading-none">{stats.wins + stats.losses}</span>
 </div>
 <div className="flex flex-col items-center justify-center bg-[#001645]/80 border border-[#002266] backdrop-blur-sm rounded-none py-3">
 <span className="text-gray-500 text-[8px] font-black mb-1 uppercase tracking-widest">Win Rate</span>
 <span className="text-white text-xl sm:text-2xl font-black italic tracking-tighter leading-none">{winRate}%</span>
 </div>
 </div>

 {/* Footer */}
 <div className="w-full flex justify-between items-end z-10 border-t border-[#002266] pt-4">
 <div className="flex flex-col items-start bg-[#000B29] px-3 py-1.5 border-l-2 border-[#00FF41]">
 {(() => {
 const { month, day } = getDateParts(session.startTime);
 return <span className="text-white text-[10px] font-black uppercase tracking-widest leading-tight">{day} {month}</span>;
 })()}
 <span className="text-gray-500 text-[8px] font-bold uppercase truncate max-w-[140px] tracking-widest">{session.location || 'THE ARENA'}</span>
 </div>
 
 <div className="flex flex-col items-center pr-2 pb-1">
 <div className="bg-[#FFFFFF] px-2.5 py-0.5 rounded-none skew-x-[-10deg] flex items-center justify-center text-[#000B29] font-black transform relative overflow-hidden">
 <div className="absolute top-[-2px] left-[6px] w-[1px] h-[12px] bg-[#000B29] rotate-[15deg] opacity-30"></div>
 <span className="skew-x-[10deg] text-xs tracking-tighter uppercase relative z-10 leading-none">SmashX</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="w-full flex flex-col items-center mt-8">
 <button
 onClick={handleSaveImage}
 className="w-full py-5 bg-white text-black font-black uppercase tracking-widest text-sm transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] flex items-center justify-center gap-3 active:scale-95"
 >
 <Download size={20} />
 <span>Save Player Card</span>
 </button>
 </div>
 </div>
 </div>
 );
};

export default ShareReportModal;
