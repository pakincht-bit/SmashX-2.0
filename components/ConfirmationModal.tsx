
import React, { useEffect, useState } from 'react';

interface ConfirmationModalProps {
 isOpen: boolean;
 title: string;
 message: string;
 confirmLabel?: string;
 cancelLabel?: string;
 onConfirm: () => void;
 onCancel: () => void;
 isDestructive?: boolean;
 // When set, the user must type this exact text before confirm is enabled
 requireTypedText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
 isOpen,
 title,
 message,
 confirmLabel = 'Confirm',
 cancelLabel = 'Cancel',
 onConfirm,
 onCancel,
 isDestructive = false,
 requireTypedText,
}) => {
 const [typed, setTyped] = useState('');

 // Start empty every time the modal opens
 useEffect(() => {
 if (isOpen) setTyped('');
 }, [isOpen]);

 if (!isOpen) return null;

 const canConfirm = !requireTypedText || typed.trim().toUpperCase() === requireTypedText.toUpperCase();

 return (
 <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-[#000B29]/80 backdrop-blur-sm">
 <div className="bg-[#001645] shadow-[0_8px_32px_rgba(0,0,0,0.4)] w-full max-w-sm p-0 shadow-[0_0_50px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
 {/* Decorative strip */}
 <div className={`absolute top-0 left-0 w-1.5 h-full ${isDestructive ? 'bg-red-500' : 'bg-[#00FF41]'}`} />

 <div className="p-6">
 <h3 className="text-xl font-black italic uppercase text-white mb-2 tracking-wider pl-2">
 {title}
 </h3>
 <p className="text-gray-300 text-sm leading-relaxed pl-2 font-medium">
 {message}
 </p>
 {requireTypedText && (
 <div className="mt-5 pl-2">
 <label htmlFor="confirm-typed-text" className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
 Type <span className={isDestructive ? 'text-red-500' : 'text-[#00FF41]'}>{requireTypedText}</span> to confirm
 </label>
 <input
 id="confirm-typed-text"
 type="text"
 value={typed}
 onChange={(e) => setTyped(e.target.value)}
 autoComplete="off"
 autoCorrect="off"
 autoCapitalize="characters"
 spellCheck={false}
 placeholder={requireTypedText}
 className="w-full bg-[#000B29] border border-white/10 rounded-none px-3 py-2.5 text-sm font-black uppercase tracking-widest text-white placeholder:text-gray-700 outline-none focus:border-red-500/60"
 />
 </div>
 )}
 </div>

 <div className="flex border-t border-white/5">
 <button
 onClick={onCancel}
 className="flex-1 py-4 bg-[#000F33] text-gray-400 font-bold uppercase tracking-wider text-xs transition-colors border-r border-white/5"
 >
 {cancelLabel}
 </button>
 <button
 onClick={onConfirm}
 disabled={!canConfirm}
 className={`flex-1 py-4 font-black uppercase tracking-wider text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed
 ${isDestructive
 ? 'bg-red-500/10 text-red-500 '
 : 'bg-[#00FF41]/10 text-[#00FF41] '
 }`}
 >
 {confirmLabel}
 </button>
 </div>
 </div>
 </div>
 );
};

export default ConfirmationModal;
