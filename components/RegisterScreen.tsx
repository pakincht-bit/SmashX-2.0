
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, User, Lock, Sparkles, Loader2, AlertCircle, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface RegisterScreenProps {
    onRegister: (name: string, avatarUrl: string, password: string) => Promise<void>;
    onBack: () => void;
}

import AvatarBuilder from './AvatarBuilder';

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onBack }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');

    const [avatarUrl, setAvatarUrl] = useState('');

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
            await onRegister(name.trim(), avatarUrl, password);
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
                                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Create <span className="text-[#00FF41]">Username</span></h2>
                            </div>
                            <input type="text" value={name} onChange={(e) => { setName(e.target.value); setNameError(''); }} className={`w-full bg-[#001645] border text-white p-4 rounded-none outline-none font-bold text-lg ${nameError ? 'border-red-500' : 'border-[#002266] focus:border-[#00FF41]'}`} placeholder="e.g. BadmintonKing" autoFocus />
                            <p className="text-[10px] mt-2 font-bold text-gray-500 uppercase tracking-widest leading-tight leading-relaxed">* Only English characters allowed</p>
                            {nameError && <div className="mt-2 text-red-500 text-xs font-bold flex items-center gap-2"><AlertCircle size={12} /> {nameError}</div>}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex-1 flex flex-col justify-start pt-12 animate-fade-in">
                            <div className="mb-8">
                                <div className="w-12 h-12 rounded-full bg-[#00FF41]/10 flex items-center justify-center mb-4"><Lock className="text-[#00FF41]" size={24} /></div>
                                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Create <span className="text-[#00FF41]">Password</span></h2>
                            </div>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#001645] border border-[#002266] text-white p-4 rounded-none focus:border-[#00FF41] outline-none font-bold text-lg tracking-widest" placeholder="••••••••" autoFocus />
                            <p className={`text-[10px] mt-2 font-bold ${password.length > 0 && password.length < 6 ? 'text-red-500' : 'text-gray-500'}`}>* Minimum 6 characters</p>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex-1 flex flex-col justify-start pt-4 animate-fade-in h-full overflow-hidden">




                            <AvatarBuilder onUrlChange={setAvatarUrl} />

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
