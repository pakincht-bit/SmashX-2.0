
import React from 'react';
import { X, Download, Smartphone, Share, PlusSquare } from 'lucide-react';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ isOpen, onClose }) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[210] bg-[#000B29]/95 backdrop-blur-2xl flex flex-col p-6 animate-in fade-in zoom-in duration-300 overflow-y-auto">
        <div className="flex justify-end mb-6">
            <button onClick={onClose} className="p-3 bg-white/5 rounded-full text-white hover:bg-white/10 transition-colors">
                <X size={24}/>
            </button>
        </div>
        
        <div className="max-w-sm mx-auto w-full text-center space-y-8 pb-12">
            <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-[#00FF41] rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(0,255,65,0.4)] mb-4">
                    <Download size={32} className="text-[#000B29]" />
                </div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Enter the <span className="text-[#00FF41]">Arena</span></h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Add SmashX to your home screen</p>
            </div>

            <div className="space-y-4 text-left">
                {isIOS ? (
                    <>
                        <div className="bg-[#001645] border border-[#002266] p-4 rounded-xl flex items-center gap-5">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-[#00FF41] shrink-0 font-black">1</div>
                            <div className="flex-1">
                                <p className="text-white font-bold text-xs uppercase tracking-wide">Tap the <span className="text-blue-400 inline-flex items-center gap-1 bg-blue-400/10 px-1.5 py-0.5 rounded ml-1">Share <Share size={14} /></span> icon</p>
                                <p className="text-gray-500 text-[10px] mt-1 uppercase font-medium">Located at the bottom of Safari</p>
                            </div>
                        </div>
                        <div className="bg-[#001645] border border-[#002266] p-4 rounded-xl flex items-center gap-5">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-[#00FF41] shrink-0 font-black">2</div>
                            <div className="flex-1">
                                <p className="text-white font-bold text-xs uppercase tracking-wide">Select <span className="text-[#00FF41] inline-flex items-center gap-1 bg-[#00FF41]/10 px-1.5 py-0.5 rounded ml-1">Add to Home Screen <PlusSquare size={14} /></span></p>
                                <p className="text-gray-500 text-[10px] mt-1 uppercase font-medium">Scroll down the share list</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bg-[#001645] border border-[#002266] p-4 rounded-xl flex items-center gap-5">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-[#00FF41] shrink-0 font-black">1</div>
                            <div className="flex-1">
                                <p className="text-white font-bold text-xs uppercase tracking-wide">Tap the <span className="text-gray-300 inline-flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded ml-1">Menu •••</span> icon</p>
                                <p className="text-gray-500 text-[10px] mt-1 uppercase font-medium">Top right of Chrome</p>
                            </div>
                        </div>
                        <div className="bg-[#001645] border border-[#002266] p-4 rounded-xl flex items-center gap-5">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-[#00FF41] shrink-0 font-black">2</div>
                            <div className="flex-1">
                                <p className="text-white font-bold text-xs uppercase tracking-wide">Tap <span className="text-[#00FF41] inline-flex items-center gap-1 bg-[#00FF41]/10 px-1.5 py-0.5 rounded ml-1">Install App</span></p>
                                <p className="text-gray-500 text-[10px] mt-1 uppercase font-medium">Enjoy standalone experience</p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="bg-[#001645]/50 p-6 rounded-2xl border border-dashed border-[#002266]">
                <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed tracking-[0.1em]">Once added, you'll have a permanent icon on your home screen for quick access to the Arena with full-screen focus.</p>
            </div>

            <button onClick={onClose} className="w-full py-4 bg-[#00FF41] text-[#000B29] rounded font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(0,255,65,0.3)] active:scale-95">Got it, I'm Ready</button>
        </div>
    </div>
  );
};

export default InstallGuideModal;
