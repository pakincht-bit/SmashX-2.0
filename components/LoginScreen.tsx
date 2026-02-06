
import React, { useState } from 'react';
import { User } from '../types';
import { ArrowLeft, LogIn, AlertCircle, User as UserIcon, Lock } from 'lucide-react';

interface LoginScreenProps {
  users: User[];
  onLogin: (name: string, password: string) => Promise<void>;
  onBack: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
        await onLogin(username.trim(), password);
    } catch (err: any) {
        console.error("Login error:", err);
        // Display a more specific error if possible
        const message = err.message || 'Username or password is not correct';
        setError(message);
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000B29] flex flex-col p-6 animate-fade-in-up overflow-y-auto">
       <button onClick={onBack} className="self-start text-gray-400 hover:text-white mb-4">
         <ArrowLeft size={24} />
       </button>

       <div className="flex-1 max-w-sm w-full mx-auto flex flex-col justify-start pt-12">
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Welcome <span className="text-[#00FF41]">Back</span></h2>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-8">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-6">
             <div>
                <label className="block text-xs font-bold text-[#00FF41] uppercase tracking-wider mb-2 ml-1">Username</label>
                <div className="relative group">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00FF41] transition-colors" size={18} />
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => {
                          setUsername(e.target.value);
                          setError('');
                      }}
                      className="w-full pl-10 pr-4 py-4 bg-[#001645] border border-[#002266] text-white rounded-none focus:border-[#00FF41] outline-none font-bold placeholder-gray-600 transition-colors"
                      placeholder="e.g. Alex"
                      autoFocus
                    />
                </div>
             </div>

             <div>
                <label className="block text-xs font-bold text-[#00FF41] uppercase tracking-wider mb-2 ml-1">Password</label>
                <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00FF41] transition-colors" size={18} />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => {
                          setPassword(e.target.value);
                          setError('');
                      }}
                      className="w-full pl-10 pr-4 py-4 bg-[#001645] border border-[#002266] text-white rounded-none focus:border-[#00FF41] outline-none font-bold placeholder-gray-600 transition-colors"
                      placeholder="••••••••"
                    />
                </div>
                {error && (
                    <div className="flex items-start gap-2 mt-3 text-red-500 text-[10px] font-bold animate-pulse leading-tight">
                        <AlertCircle size={14} className="shrink-0" /> {error}
                    </div>
                )}
             </div>

             <div className="space-y-4 pt-2">
                <button 
                    id="login-btn"
                    type="submit"
                    disabled={!username.trim() || loading}
                    className={`w-full py-4 -skew-x-12 font-black uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]
                        ${username.trim() && !loading ? 'bg-[#00FF41] text-[#000B29] hover:bg-white hover:shadow-[0_0_20px_rgba(0,255,65,0.4)]' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                    `}
                >
                    <span className="skew-x-12 inline-flex items-center gap-2">
                        {loading ? 'Logging in...' : 'Login'} <LogIn size={16} />
                    </span>
                </button>
             </div>
          </form>
       </div>
    </div>
  );
};

export default LoginScreen;
