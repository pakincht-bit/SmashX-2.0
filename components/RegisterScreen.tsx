
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, User, Lock, Sparkles, Loader2, AlertCircle, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface RegisterScreenProps {
  onRegister: (name: string, avatarUrl: string, password: string) => Promise<void>;
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

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onBack }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  
  // Avatar Selection State
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [selectedBgColor, setSelectedBgColor] = useState(BG_COLORS[0].hex);

  // Computed Avatar URL
  const currentAvatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${PRESET_SEEDS[avatarIndex]}&backgroundColor=${selectedBgColor.replace('#', '')}`;

  // Validation States
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [nameError, setNameError] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  
  const registrationSucceeded = useRef(false);

  const performFinalRegistration = async () => {
    if (isRegistering) return;
    
    setIsRegistering(true);
    setRegistrationError('');
    
    try {
        await onRegister(name.trim(), currentAvatarUrl, password);
        registrationSucceeded.current = true;
        // No need to set step, parent component will unmount this screen upon auth change
    } catch (error: any) {
        console.error("Registration error:", error.message || error);
        
        const errMsg = error.message?.toLowerCase() || '';
        if (errMsg.includes('already registered') || errMsg.includes('user already exists')) {
            setStep(1);
            setNameError('This account already exists. Please pick a unique name or log in.');
            registrationSucceeded.current = false;
        } else {
            setRegistrationError(error.message || 'Registration failed. Please try again.');
        }
        setIsRegistering(false);
    }
  };

  const handleNext = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (step === 1 && name.trim()) {
        setIsCheckingName(true);
        setNameError('');

        const isEnglish = /^[a-zA-Z0-9_\s]*$/.test(name.trim());
        if (!isEnglish) {
            setNameError('Only English characters are allowed.');
            setIsCheckingName(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .ilike('name', name.trim())
                .maybeSingle();

            if (data) {
                setNameError('This username is already taken.');
                setIsCheckingName(false);
                return;
            }
            setIsCheckingName(false);
            setStep(2);
        } catch (err) {
            console.error(err);
            setIsCheckingName(false);
        }
    } else if (step === 2 && password.length >= 6) {
        setStep(3);
    } else if (step === 3) {
        // Trigger account creation manually on Step 3 "Get Started" tap
        await performFinalRegistration();
    }
  };

  const handleBack = () => {
    if (step === 1) onBack();
    else setStep(prev => (prev - 1) as 1 | 2);
  };

  const nextAvatar = () => setAvatarIndex(prev => (prev + 1) % PRESET_SEEDS.length);
  const prevAvatar = () => setAvatarIndex(prev => (prev - 1 + PRESET_SEEDS.length) % PRESET_SEEDS.length);

  return (
    <div className={`fixed inset-0 z-50 bg-[#000B29] flex flex-col p-6 animate-fade-in-up overflow-hidden`}>
       <div className="flex items-center justify-between mb-4 relative z-20">
         <button onClick={handleBack} className="text-gray-400 hover:text-white transition-colors p-2 -ml-2">
            <ArrowLeft size={24} />
         </button>
         <div className="flex gap-2">
             {[1, 2, 3].map(i => (
                 <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'w-8 bg-[#00FF41]' : 'w-2 bg-gray-700'}`} />
             ))}
         </div>
       </div>

       <div className="flex-1 max-sm:w-full max-w-sm mx-auto flex flex-col h-full relative z-20">
            <form onSubmit={handleNext} className="flex-1 flex flex-col h-full">
                 {step === 1 && (
                    <div className="flex-1 flex flex-col justify-start pt-12 animate-fade-in">
                        <div className="mb-8">
                            <div className="w-12 h-12 rounded-full bg-[#00FF41]/10 flex items-center justify-center mb-4"><User className="text-[#00FF41]" size={24} /></div>
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Pick a <span className="text-[#00FF41]">Name</span></h2>
                        </div>
                        <input type="text" value={name} onChange={(e) => {setName(e.target.value); setNameError('');}} className={`w-full bg-[#001645] border text-white p-4 rounded-none outline-none font-bold text-lg ${nameError ? 'border-red-500' : 'border-[#002266] focus:border-[#00FF41]'}`} placeholder="e.g. BadmintonKing" autoFocus />
                        <p className="text-[10px] mt-2 font-bold text-gray-500 uppercase tracking-widest leading-tight leading-relaxed">* Only English characters allowed</p>
                        {nameError && <div className="mt-2 text-red-500 text-xs font-bold flex items-center gap-2"><AlertCircle size={12} /> {nameError}</div>}
                    </div>
                 )}

                 {step === 2 && (
                    <div className="flex-1 flex flex-col justify-start pt-12 animate-fade-in">
                        <div className="mb-8">
                            <div className="w-12 h-12 rounded-full bg-[#00FF41]/10 flex items-center justify-center mb-4"><Lock className="text-[#00FF41]" size={24} /></div>
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Secure <span className="text-[#00FF41]">Access</span></h2>
                        </div>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#001645] border border-[#002266] text-white p-4 rounded-none focus:border-[#00FF41] outline-none font-bold text-lg tracking-widest" placeholder="••••••••" autoFocus />
                        <p className={`text-[10px] mt-2 font-bold ${password.length > 0 && password.length < 6 ? 'text-red-500' : 'text-gray-500'}`}>* Minimum 6 characters</p>
                    </div>
                 )}

                 {step === 3 && (
                    <div className="flex-1 flex flex-col justify-start pt-4 animate-fade-in h-full overflow-hidden">
                        <div className="mb-4 shrink-0 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#00FF41]/10 flex items-center justify-center"><Sparkles className="text-[#00FF41]" size={20} /></div>
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Your <span className="text-[#00FF41]">Identity</span></h2>
                        </div>

                        {/* Carousel Avatar Picker */}
                        <div className="flex flex-col items-center justify-center mb-8">
                            <div className="relative group">
                                <div className="absolute -inset-6 bg-[#00FF41]/10 blur-3xl rounded-full opacity-30 group-hover:opacity-60 transition-opacity"></div>
                                <div 
                                  className="relative w-48 h-48 rounded-full border-4 border-[#002266] shadow-2xl overflow-hidden transition-all duration-500"
                                  style={{ backgroundColor: `#${selectedBgColor}` }}
                                >
                                    <img src={currentAvatarUrl} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 ease-out" />
                                </div>
                                
                                <button type="button" onClick={prevAvatar} className="absolute left-[-24px] top-1/2 -translate-y-1/2 bg-[#001645] border border-[#002266] p-2.5 rounded-full text-white hover:border-[#00FF41] transition-all hover:scale-110 active:scale-95 shadow-xl z-10">
                                    <ChevronLeft size={24} />
                                </button>
                                <button type="button" onClick={nextAvatar} className="absolute right-[-24px] top-1/2 -translate-y-1/2 bg-[#001645] border border-[#002266] p-2.5 rounded-full text-white hover:border-[#00FF41] transition-all hover:scale-110 active:scale-95 shadow-xl z-10">
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                            <span className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#00FF41] italic opacity-80">#{PRESET_SEEDS[avatarIndex]}</span>
                        </div>

                        {/* Color Selection Section */}
                        <div className="space-y-4">
                            <label className="block text-center text-[10px] font-bold text-gray-500 uppercase tracking-[0.4em] mb-4">Background Color</label>
                            <div className="flex flex-col gap-3">
                                {[BG_COLORS.slice(0, 4), BG_COLORS.slice(4)].map((row, rowIndex) => (
                                    <div key={rowIndex} className="flex justify-center gap-3">
                                        {row.map((color) => (
                                            <button
                                                key={color.hex}
                                                type="button"
                                                onClick={() => setSelectedBgColor(color.hex)}
                                                className={`w-11 h-11 rounded-full border-2 transition-all duration-300 relative group
                                                    ${selectedBgColor === color.hex ? 'border-white scale-110 shadow-[0_0_25px_rgba(255,255,255,0.3)] z-10' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}
                                                `}
                                                style={{ backgroundColor: `#${color.hex}` }}
                                            >
                                                {selectedBgColor === color.hex && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Check size={16} className={color.hex === 'ffffff' ? 'text-black' : 'text-white'} strokeWidth={4} />
                                                    </div>
                                                )}
                                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black uppercase text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 bg-black/50 px-2 py-1 rounded">
                                                    {color.name}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {registrationError && (
                            <div className="mt-4 bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex flex-col items-center gap-2">
                                <p className="text-red-500 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 text-center">
                                    <AlertCircle size={14} className="shrink-0" />
                                    {registrationError}
                                </p>
                            </div>
                        )}
                    </div>
                 )}

                 <div className="pt-2 mt-auto">
                    <button 
                        type="submit" 
                        disabled={(step === 1 && (!name.trim() || isCheckingName)) || (step === 2 && password.length < 6) || isRegistering} 
                        className={`w-full py-4 -skew-x-12 font-black uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]
                        ${((step === 1 && name.trim() && !isCheckingName) || (step === 2 && password.length >= 6) || step === 3) && !isRegistering ? 'bg-[#00FF41] text-[#000B29] hover:bg-white hover:shadow-[0_0_30px_rgba(0,255,65,0.3)]' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                    >
                        <span className="skew-x-12 inline-flex items-center gap-2">
                            {isCheckingName ? (
                                <>Checking <Loader2 className="animate-spin" size={16} /></>
                            ) : isRegistering ? (
                                <>Registering <Loader2 className="animate-spin" size={16} /></>
                            ) : (
                                <>{step === 3 ? 'Get Started' : 'Continue'} <ArrowRight size={16} /></>
                            )}
                        </span>
                    </button>
                 </div>
            </form>
       </div>
    </div>
  );
};

export default RegisterScreen;
