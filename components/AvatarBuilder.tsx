import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, Dices } from 'lucide-react';

export interface AvatarOptions {
    seed: string;
    backgroundColor: string;
    hair: string;
    hairColor: string;
    skinColor: string;
    eyes: string;
    mouth: string;
    eyebrows: string;
    features: string[]; // e.g. ["freckles"], ["blush"]
    glasses: string[]; // e.g. ["variant01"], []
    earrings: string[];
}

export const BG_COLORS = [
    { name: 'Cyber Green', hex: '00FF41' },
    { name: 'Electric Blue', hex: '3b82f6' },
    { name: 'Neon Pink', hex: 'f472b6' },
    { name: 'Voltage Yellow', hex: 'facc15' },
    { name: 'Plasma Purple', hex: 'a855f7' },
    { name: 'Arctic White', hex: 'ffffff' },
    { name: 'Deep Space', hex: '1e293b' },
];

const PRESET_SEEDS = [
    'Alexander', 'Jessica', 'Ryan', 'Sarah', 'Christian', 'Sofia',
    'Brian', 'Amelia', 'Christopher', 'Felix', 'Maria', 'Lucas',
    'Aiden', 'Chloe', 'Daniel', 'Emma', 'Finn', 'Grace', 'Harper'
];

export const HAIR_COLORS = [
    { name: 'Midnight', hex: '000000' },
    { name: 'Espresso', hex: '3b2f2f' },
    { name: 'Chestnut', hex: '7a4b3a' },
    { name: 'Caramel', hex: 'a67c52' },
    { name: 'Gold', hex: 'd4af37' },
    { name: 'Platinum', hex: 'e5e5e5' },
    { name: 'Toxic Green', hex: '00FF41' },
    { name: 'Neon Pink', hex: 'f472b6' },
];

export const SKIN_COLORS = [
    { name: 'Pale', hex: 'f2d3b1' },
    { name: 'Fair', hex: 'ecad80' },
    { name: 'Tan', hex: '9e5622' },
    { name: 'Dark', hex: '763900' },
    { name: 'Ethereal', hex: 'dee1f5' },
];

interface AvatarBuilderProps {
    initialOptions?: Partial<AvatarOptions>;
    onUrlChange: (url: string) => void;
}

// Arrays extracted from schema analysis
const HAIR_OPTIONS = [
    "short16", "short15", "short14", "short13", "short12", "short11", "short10", "short09", "short08", "short07", "short06", "short05", "short04", "short03", "long20", "short02", "short01", "long19", "long18", "long17", "long16", "long15", "long14", "long13", "long12", "long11", "long10", "long09", "long08", "long07", "long06", "long05", "long04", "long03", "long02", "long01", "short19", "long26", "long25", "short18", "long24", "long23", "long22", "short17", "long21"
];

const EYE_OPTIONS = [
    "variant26", "variant25", "variant24", "variant23", "variant22", "variant21", "variant20", "variant19", "variant18", "variant17", "variant16", "variant15", "variant14", "variant13", "variant12", "variant11", "variant10", "variant09", "variant08", "variant07", "variant06", "variant05", "variant04", "variant03", "variant02", "variant01"
];

const MOUTH_OPTIONS = [
    "variant30", "variant29", "variant28", "variant27", "variant26", "variant25", "variant24", "variant23", "variant22", "variant21", "variant20", "variant19", "variant18", "variant17", "variant16", "variant15", "variant14", "variant13", "variant12", "variant11", "variant10", "variant09", "variant08", "variant07", "variant06", "variant05", "variant04", "variant03", "variant02", "variant01"
];

const EYEBROW_OPTIONS = [
    "variant10", "variant09", "variant08", "variant07", "variant06", "variant05", "variant04", "variant03", "variant02", "variant01", "variant15", "variant14", "variant13", "variant12", "variant11"
];

const FEATURES_OPTIONS = ['none', "mustache", "blush", "birthmark", "freckles"];
const GLASSES_OPTIONS = ['none', "variant01", "variant02", "variant03", "variant04", "variant05"];
const EARRINGS_OPTIONS = ['none', "variant06", "variant01", "variant02", "variant03", "variant04", "variant05"];

const CATEGORIES = [
    { id: 'backgroundColor', label: 'BG', options: BG_COLORS.map(c => c.hex) },
    { id: 'hair', label: 'Hair', options: HAIR_OPTIONS },
    { id: 'hairColor', label: 'Hair Color', options: HAIR_COLORS.map(c => c.hex) },
    { id: 'skinColor', label: 'Skin', options: SKIN_COLORS.map(c => c.hex) },
    { id: 'eyes', label: 'Eyes', options: EYE_OPTIONS },
    { id: 'mouth', label: 'Mouth', options: MOUTH_OPTIONS },
    { id: 'eyebrows', label: 'Brows', options: EYEBROW_OPTIONS },
    { id: 'features', label: 'Marks', options: FEATURES_OPTIONS },
    { id: 'glasses', label: 'Glasses', options: GLASSES_OPTIONS },
    { id: 'earrings', label: 'Earrings', options: EARRINGS_OPTIONS },
] as const;

export const buildAvatarUrl = (options: AvatarOptions): string => {
    const params = new URLSearchParams();
    params.set('seed', options.seed);
    params.set('backgroundColor', options.backgroundColor);
    params.set('hairProbability', '100');

    // Set specific part choices. Overrides probability.
    params.set('hair', options.hair);
    params.set('hairColor', options.hairColor);
    params.set('skinColor', options.skinColor);
    params.set('eyes', options.eyes);
    params.set('mouth', options.mouth);
    params.set('eyebrows', options.eyebrows);

    // Arrays for optional features
    if (options.features.length) {
        params.set('features', options.features.join(','));
        params.set('featuresProbability', '100');
    } else params.set('featuresProbability', '0'); // Hide if none chosen

    if (options.glasses.length) {
        params.set('glasses', options.glasses.join(','));
        params.set('glassesProbability', '100');
    } else params.set('glassesProbability', '0');

    if (options.earrings.length) {
        params.set('earrings', options.earrings.join(','));
        params.set('earringsProbability', '100');
    } else params.set('earringsProbability', '0');

    return `https://api.dicebear.com/9.x/adventurer/svg?${params.toString()}`;
};

const getRandomArrayElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateRandomOptions = (): AvatarOptions => {
    return {
        seed: getRandomArrayElement(PRESET_SEEDS),
        backgroundColor: getRandomArrayElement(BG_COLORS).hex,
        hair: getRandomArrayElement(HAIR_OPTIONS),
        hairColor: getRandomArrayElement(HAIR_COLORS).hex,
        skinColor: getRandomArrayElement(SKIN_COLORS).hex,
        eyes: getRandomArrayElement(EYE_OPTIONS),
        mouth: getRandomArrayElement(MOUTH_OPTIONS),
        eyebrows: getRandomArrayElement(EYEBROW_OPTIONS),
        features: [getRandomArrayElement(FEATURES_OPTIONS.slice(1))],
        glasses: [getRandomArrayElement(GLASSES_OPTIONS.slice(1))],
        earrings: [getRandomArrayElement(EARRINGS_OPTIONS.slice(1))],
    };
};

const AvatarBuilder: React.FC<AvatarBuilderProps> = ({ initialOptions, onUrlChange }) => {
    const [options, setOptions] = useState<AvatarOptions>(() => {
        if (initialOptions) {
            return {
                seed: initialOptions.seed || PRESET_SEEDS[0],
                backgroundColor: initialOptions.backgroundColor || BG_COLORS[0].hex,
                hair: initialOptions.hair || HAIR_OPTIONS[0],
                hairColor: initialOptions.hairColor || HAIR_COLORS[0].hex,
                skinColor: initialOptions.skinColor || SKIN_COLORS[0].hex,
                eyes: initialOptions.eyes || EYE_OPTIONS[0],
                mouth: initialOptions.mouth || MOUTH_OPTIONS[0],
                eyebrows: initialOptions.eyebrows || EYEBROW_OPTIONS[0],
                features: initialOptions.features || [],
                glasses: initialOptions.glasses || [],
                earrings: initialOptions.earrings || [],
            };
        }
        return generateRandomOptions();
    });

    const [activeTab, setActiveTab] = useState<typeof CATEGORIES[number]['id']>('hair');
    const bgUrl = useMemo(() => buildAvatarUrl(options), [options]);

    // Report URL changes up to parent
    useEffect(() => {
        onUrlChange(bgUrl);
    }, [bgUrl, onUrlChange]);

    const handleRandomize = () => {
        setOptions(generateRandomOptions());
    };



    return (
        <div className="flex flex-col items-center justify-center w-full">
            {/* Main Preview */}
            <div className="relative group mb-6">
                <div className="absolute -inset-6 bg-[#00FF41]/10 blur-3xl rounded-full opacity-30 transition-opacity"></div>
                <div
                    className="relative w-48 h-48 rounded-full border-4 border-[#002266] shadow-2xl overflow-hidden transition-all duration-300"
                    style={{ backgroundColor: `#${options.backgroundColor}` }}
                >
                    <img src={bgUrl} alt="Avatar Preview" className="w-full h-full object-cover transition-transform duration-300 ease-out" />
                </div>

                <button
                    type="button"
                    onClick={handleRandomize}
                    className="absolute -bottom-2 -right-2 bg-[#001645] border border-[#002266] p-3 rounded-full text-white hover:text-[#00FF41] hover:border-[#00FF41] hover:scale-110 active:scale-95 transition-all shadow-xl z-20"
                >
                    <Dices size={20} />
                </button>
            </div>

            {/* Editing Controls */}
            <div className="w-full bg-[#001645]/50 border border-[#002266] rounded-2xl p-4 space-y-4">
                {/* Tabs */}
                <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar px-1 -mx-1" style={{ scrollbarWidth: 'none' }}>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setActiveTab(cat.id)}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === cat.id ? 'bg-[#00FF41] text-[#000B29] shadow-[0_0_15px_rgba(0,255,65,0.4)]' : 'bg-[#000B29] text-gray-400 border border-[#002266]'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Grid/Scroll of Feature Thumbnails */}
                <div className="flex overflow-x-auto gap-3 pb-2 pt-1 px-1 no-scrollbar items-center" style={{ scrollbarWidth: 'none' }}>
                    {CATEGORIES.find(c => c.id === activeTab)?.options.map((optionLabel) => {
                        const isNullOption = optionLabel === 'none';
                        const isColorTab = activeTab === 'hairColor' || activeTab === 'skinColor' || activeTab === 'backgroundColor';
                        const currentVal = Array.isArray(options[activeTab]) ? (options[activeTab] as string[])[0] || 'none' : options[activeTab] as string;
                        const isActive = currentVal === optionLabel;

                        // Construct preview URL for THIS option by cloning options (for shape thumbnails)
                        let thumbUrl = '';
                        if (!isColorTab && !isNullOption) {
                            const previewOptions = { ...options };
                            if (activeTab === 'features' || activeTab === 'glasses' || activeTab === 'earrings') {
                                previewOptions[activeTab] = isNullOption ? [] : [optionLabel];
                            } else {
                                (previewOptions as any)[activeTab] = optionLabel;
                            }
                            previewOptions.backgroundColor = 'transparent';
                            thumbUrl = buildAvatarUrl(previewOptions);
                        }

                        return (
                            <button
                                key={optionLabel}
                                type="button"
                                onClick={() => {
                                    setOptions(prev => {
                                        const newVal = activeTab === 'features' || activeTab === 'glasses' || activeTab === 'earrings'
                                            ? (isNullOption ? [] : [optionLabel])
                                            : optionLabel;
                                        return { ...prev, [activeTab]: newVal };
                                    });
                                }}
                                className={`shrink-0 w-16 h-16 rounded-xl border-2 transition-all overflow-hidden bg-[#000B29] relative group ${isActive ? 'border-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.4)] scale-105 z-10' : 'border-[#002266] opacity-70 hover:opacity-100 hover:border-gray-500'}`}
                            >
                                {isNullOption ? (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-[10px] font-bold uppercase tracking-widest">None</div>
                                ) : isColorTab ? (
                                    <div className="w-full h-full flex items-center justify-center p-3">
                                        <div className="w-full h-full rounded-full border border-white/10 shadow-inner" style={{ backgroundColor: `#${optionLabel}` }}></div>
                                    </div>
                                ) : (
                                    <img src={thumbUrl} alt={optionLabel} loading="lazy" className="w-full h-full object-cover scale-[1.3] translate-y-1 transition-transform group-hover:scale-[1.4]" />
                                )}
                                {isActive && (
                                    <div className="absolute top-1 right-1 bg-[#00FF41] text-[#000B29] rounded-full p-0.5">
                                        <Check size={10} strokeWidth={4} />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AvatarBuilder;
