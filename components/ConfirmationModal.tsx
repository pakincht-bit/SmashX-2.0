
import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
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
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-[#000B29]/80 backdrop-blur-sm">
      <div className="bg-[#001645] border border-[#002266] w-full max-w-sm p-0 shadow-[0_0_50px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Decorative strip */}
        <div className={`absolute top-0 left-0 w-1.5 h-full ${isDestructive ? 'bg-red-500' : 'bg-[#00FF41]'}`} />

        <div className="p-6">
            <h3 className="text-xl font-black italic uppercase text-white mb-2 tracking-wider pl-2">
            {title}
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed pl-2 font-medium">
            {message}
            </p>
        </div>

        <div className="flex border-t border-[#002266]">
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-[#000F33] hover:bg-[#001645] text-gray-400 hover:text-white font-bold uppercase tracking-wider text-xs transition-colors border-r border-[#002266]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 font-black uppercase tracking-wider text-xs transition-all
              ${isDestructive
                ? 'bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white'
                : 'bg-[#00FF41]/10 hover:bg-[#00FF41] text-[#00FF41] hover:text-[#000B29]'
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
