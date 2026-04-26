import React from 'react';
import { Trophy, TrendingUp, TrendingDown, Shield, Target, Check } from 'lucide-react';

interface OnboardingModalProps {
 isOpen: boolean;
 onClose: () => void;
 userName: string;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, userName }) => {
 if (!isOpen) return null;

 const protocolItems = [
 {
 icon: <Shield className="text-blue-400"size={24} />,
 title:"Base Rating",
 value:"1,000 pts",
 desc:"Every player starts with 1,000 pts as their baseline power.",
 badgeClass:"text-gray-400 bg-gray-400/10"
 },
 {
 icon: <TrendingUp className="text-[#00FF41]"size={24} />,
 title:"Victory",
 value:"+25 pts",
 desc:"Securing a win in any match increases your ranking by 25 pts.",
 badgeClass:"text-[#00FF41] bg-[#00FF41]/10"
 },
 {
 icon: <TrendingDown className="text-red-500"size={24} />,
 title:"Defeat",
 value:"-25 pts",
 desc:"Losing a match results in a 25 pts deduction from your total.",
 badgeClass:"text-red-500 bg-red-500/10"
 }
 ];

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#000B29]/95 backdrop-blur-md animate-in fade-in duration-300">
 <div className="bg-[#001645] shadow-[0_8px_32px_rgba(0,0,0,0.4)] w-full max-w-md rounded-none overflow-hidden shadow-[0_0_100px_rgba(0,255,65,0.15)] flex flex-col animate-in zoom-in slide-in-from-bottom-8 duration-500">
 
 {/* Header Section */}
 <div className="bg-gradient-to-br from-[#00FF41] to-teal-500 p-8 text-[#000B29] relative overflow-hidden">
 <div className="absolute top-0 right-0 p-4 opacity-10">
 <Target size={120} fill="currentColor"/>
 </div>
 
 <h2 className="text-4xl font-black italic uppercase tracking-tighter relative z-10 leading-none">
 Arena <span className="text-white">Rules</span>
 </h2>
 </div>

 {/* Content Area */}
 <div className="p-8 space-y-10">
 <div className="space-y-8">
 {protocolItems.map((item, index) => (
 <div key={index} className="flex items-start gap-4 group">
 <div className="w-12 h-12 rounded-none bg-[#000B29] shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex items-center justify-center shrink-0 shadow-lg transition-colors">
 {item.icon}
 </div>
 <div className="flex-1">
 <div className="flex items-center justify-between mb-1">
 <h4 className="font-black uppercase tracking-widest text-white text-xs">
 {item.title}
 </h4>
 <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded ${item.badgeClass}`}>
 {item.value}
 </span>
 </div>
 <p className="text-gray-400 text-sm font-medium leading-relaxed">
 {item.desc}
 </p>
 </div>
 </div>
 ))}
 </div>

 <button 
 onClick={onClose}
 className="w-full py-5 bg-[#00FF41] text-[#000B29] font-black uppercase tracking-widest text-sm -skew-x-12 transition-all shadow-[0_0_30px_rgba(0,255,65,0.2)] (255,255,255,0.4)] group"
 >
 <span className="skew-x-12 inline-flex items-center gap-2 group-active:scale-95 transition-transform">
 Enter the Arena <Check size={20} strokeWidth={3} />
 </span>
 </button>
 </div>
 </div>
 </div>
 );
};

export default OnboardingModal;