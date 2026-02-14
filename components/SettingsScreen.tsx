
import React, { useState } from 'react';
import { User } from '../types';
import { ArrowLeft, Save, User as UserIcon, Check, ChevronLeft, ChevronRight, Sparkles, Trash2, AlertTriangle, LogOut } from 'lucide-react';
import { getAvatarColor, getRankFrameClass, triggerHaptic } from '../utils';
import ConfirmationModal from './ConfirmationModal';

interface SettingsScreenProps {
    currentUser: User;
    onUpdateUser: (updatedUser: User) => void;
    onDeleteAccount: () => void;
    onBack: () => void;
    onLogout: () => void;
}

const PRESET_SEEDS = [
    'Alexander', 'Jessica', 'Ryan', 'Sarah', 'Christian', 'Sofia',
    'Brian', 'Amelia', 'Christopher', 'Felix', 'Maria', 'Lucas',
    'Aiden', 'Chloe', 'Daniel', 'Emma', 'Finn', 'Grace', 'Harper'
];

const BG_COLORS = [
    { name: 'Cyber Green', hex: '00FF41' },
    { name: 'Electric Blue', hex: '3b82f6' },
    { name: 'Neon Pink', hex: 'f472b6' },
    { name: 'Voltage Yellow', hex: 'facc15' },
    { name: 'Plasma Purple', hex: 'a855f7' },
    { name: 'Arctic White', hex: 'ffffff' },
    { name: 'Deep Space', hex: '1e293b' },
];

const SettingsScreen: React.FC<SettingsScreenProps> = ({ currentUser, onUpdateUser, onDeleteAccount, onBack, onLogout }) => {
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const parseCurrentSettings = () => {
        try {
            const url = new URL(currentUser.avatar);
            const seed = url.searchParams.get('seed') || 'Alexander';
            const bgColor = url.searchParams.get('backgroundColor') || '00FF41';

            const seedIndex = PRESET_SEEDS.indexOf(seed);
            return {
                index: seedIndex !== -1 ? seedIndex : 0,
                color: bgColor.startsWith('#') ? bgColor.slice(1) : bgColor
            };
        } catch (e) {
            return { index: 0, color: '00FF41' };
        }
    };

    const initialSettings = parseCurrentSettings();
    const [avatarIndex, setAvatarIndex] = useState(initialSettings.index);
    const [selectedBgColor, setSelectedBgColor] = useState(initialSettings.color);

    const currentAvatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${PRESET_SEEDS[avatarIndex]}&backgroundColor=${selectedBgColor.replace('#', '')}`;

    const nextAvatar = () => setAvatarIndex(prev => (prev + 1) % PRESET_SEEDS.length);
    const prevAvatar = () => setAvatarIndex(prev => (prev - 1 + PRESET_SEEDS.length) % PRESET_SEEDS.length);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateUser({
            ...currentUser,
            avatar: currentAvatarUrl
        });
        onBack();
    };

    const handleLogoutWithHaptic = () => {
        triggerHaptic('medium');
        onLogout();
    };

    return (
        <div className="space-y-6 animate-fade-in-up pb-32">
            <div className="flex items-center gap-4 mb-6 sticky top-0 bg-[#000B29]/90 backdrop-blur z-20 py-4 -mt-4 px-1 border-b border-[#002266]">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-xl font-black italic uppercase text-white tracking-wider flex-1">Identity <span className="text-[#00FF41]">Lab</span></h2>

            </div>

            <form onSubmit={handleSave} className="space-y-10">
                {/* Identity Customization Section */}
                <div className="bg-[#001645] border border-[#002266] rounded-2xl p-6 relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <Sparkles size={100} className="text-[#00FF41]" />
                    </div>

                    <div className="flex flex-col items-center justify-center mb-8 relative z-10">
                        <div className="relative group">
                            <div className="absolute -inset-8 bg-[#00FF41]/10 blur-3xl rounded-full opacity-30 group-hover:opacity-60 transition-opacity"></div>
                            <div
                                className={`relative w-40 h-40 rounded-full border-4 border-[#002266] shadow-[0_0_40px_rgba(0,0,0,0.4)] transition-all duration-500 preview-active ${getRankFrameClass(currentUser.rankFrame)}`}
                                style={{ backgroundColor: `#${selectedBgColor}` }}
                            >
                                <img src={currentAvatarUrl} alt="Preview" className="w-full h-full rounded-full object-cover transition-transform duration-500 ease-out" />
                            </div>

                            <button type="button" onClick={prevAvatar} className="absolute left-[-40px] top-1/2 -translate-y-1/2 bg-[#001645] border border-[#002266] p-2.5 rounded-full text-white hover:border-[#00FF41] transition-all hover:scale-110 active:scale-95 shadow-xl z-20">
                                <ChevronLeft size={24} />
                            </button>
                            <button type="button" onClick={nextAvatar} className="absolute right-[-40px] top-1/2 -translate-y-1/2 bg-[#001645] border border-[#002266] p-2.5 rounded-full text-white hover:border-[#00FF41] transition-all hover:scale-110 active:scale-95 shadow-xl z-20">
                                <ChevronRight size={24} />
                            </button>
                        </div>
                        <span className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#00FF41] italic opacity-80">#{PRESET_SEEDS[avatarIndex]}</span>
                    </div>

                    {/* Color Selection Section */}
                    <div className="space-y-4 relative z-10">
                        <label className="block text-center text-[10px] font-bold text-gray-500 uppercase tracking-[0.4em] mb-4">Background Color</label>
                        <div className="flex flex-col gap-3">
                            {[BG_COLORS.slice(0, 4), BG_COLORS.slice(4)].map((row, rowIndex) => (
                                <div key={rowIndex} className="flex justify-center gap-3">
                                    {row.map((color) => (
                                        <button
                                            key={color.hex}
                                            type="button"
                                            onClick={() => setSelectedBgColor(color.hex)}
                                            className={`w-9 h-9 rounded-full border-2 transition-all duration-300 relative group
                                            ${selectedBgColor === color.hex ? 'border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)] z-10' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}
                                        `}
                                            style={{ backgroundColor: `#${color.hex}` }}
                                        >
                                            {selectedBgColor === color.hex && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Check size={14} className={color.hex === 'ffffff' ? 'text-black' : 'text-white'} strokeWidth={4} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Fields */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mb-2 ml-1">Profile Name</label>
                        <div className="relative group opacity-50">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                value={currentUser.name}
                                readOnly
                                className="w-full pl-12 pr-4 py-4 bg-[#001645] border border-[#002266] text-gray-400 rounded-none outline-none font-black italic tracking-tight"
                            />
                        </div>
                        <p className="text-[9px] text-gray-600 mt-2 ml-1 font-bold uppercase tracking-widest leading-relaxed">* Name changes are restricted for ranking integrity</p>
                    </div>
                </div>

                <div className="pt-4 flex flex-col gap-8">
                    <button
                        type="submit"
                        className="w-full py-4 bg-[#00FF41] hover:bg-white text-[#000B29] font-black uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(0,255,65,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all transform active:scale-[0.98] -skew-x-12"
                    >
                        <span className="skew-x-12 inline-flex items-center gap-3">
                            <Save size={20} /> Update Persona
                        </span>
                    </button>

                    <div className="pt-8 border-t border-[#002266] flex flex-col gap-4">


                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <AlertTriangle className="text-red-500" size={20} />
                                <h3 className="text-sm font-black uppercase tracking-widest text-red-500">Danger Zone</h3>
                            </div>
                            <p className="text-xs text-gray-400 font-medium mb-6 leading-relaxed">
                                Deleting your account is permanent. All RP, match history, and profile data will be purged.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsDeleteConfirmOpen(true)}
                                className="w-full py-4 bg-transparent hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 transition-all font-black uppercase tracking-widest text-xs rounded -skew-x-12"
                            >
                                <span className="skew-x-12 inline-flex items-center gap-2">
                                    <Trash2 size={16} /> Delete Account
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                title="Purge Identity?"
                message="This will permanently delete your profile and rank from SmashX. This action cannot be undone."
                confirmLabel="Confirm Purge"
                isDestructive={true}
                onConfirm={() => {
                    setIsDeleteConfirmOpen(false);
                    onDeleteAccount();
                }}
                onCancel={() => setIsDeleteConfirmOpen(false)}
            />
        </div>
    );
};

export default SettingsScreen;
