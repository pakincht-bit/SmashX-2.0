
import React, { useState } from 'react';
import { User } from '../types';
import { ArrowLeft, Save, User as UserIcon, Sparkles, Trash2, AlertTriangle, LogOut } from 'lucide-react';
import { getRankFrameClass, triggerHaptic } from '../utils';
import ConfirmationModal from './ConfirmationModal';
import AvatarBuilder, { AvatarOptions } from './AvatarBuilder';

interface SettingsScreenProps {
    currentUser: User;
    onUpdateUser: (updatedUser: User) => void;
    onDeleteAccount: () => void;
    onBack: () => void;
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

const SettingsScreen: React.FC<SettingsScreenProps> = ({ currentUser, onUpdateUser, onDeleteAccount, onBack }) => {
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const parseCurrentSettings = (): Partial<AvatarOptions> => {
        try {
            const url = new URL(currentUser.avatar);
            const params = url.searchParams;

            return {
                seed: params.get('seed') || 'Alexander',
                backgroundColor: params.get('backgroundColor') || '00FF41',
                hair: params.get('hair') || undefined,
                hairColor: params.get('hairColor') || undefined,
                skinColor: params.get('skinColor') || undefined,
                eyes: params.get('eyes') || undefined,
                mouth: params.get('mouth') || undefined,
                eyebrows: params.get('eyebrows') || undefined,
                features: params.get('features') ? params.get('features')!.split(',') : [],
                glasses: params.get('glasses') ? params.get('glasses')!.split(',') : [],
                earrings: params.get('earrings') ? params.get('earrings')!.split(',') : []
            };
        } catch (e) {
            return {};
        }
    };

    const initialOptions = parseCurrentSettings();
    const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateUser({
            ...currentUser,
            avatar: avatarUrl
        });
        onBack();
    };

    return (
        <div className="space-y-6 animate-fade-in-up pb-32">
            <div className="flex items-center gap-3 mb-6 sticky top-0 bg-[#000B29]/90 backdrop-blur z-20 py-3 -mt-4 px-1 border-b border-[#002266]">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-lg font-black italic uppercase text-white tracking-wider flex-1">Profile <span className="text-[#00FF41]">Settings</span></h2>
            </div>

            <form onSubmit={handleSave} className="space-y-10">
                {/* Identity Customization Section */}
                <AvatarBuilder initialOptions={initialOptions} onUrlChange={setAvatarUrl} />



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
                        <div className="bg-red-500/5 border border-red-500/20 rounded-none p-6 mt-4">
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
