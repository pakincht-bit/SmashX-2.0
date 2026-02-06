import React, { useState, useMemo, useEffect } from 'react';
import { CreateSessionDTO, Session } from '../types';
import { X, Calendar, Clock, MapPin, Hash, Timer, Users, Type, Loader2, AlertCircle } from 'lucide-react';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateSessionDTO) => Promise<string | null>;
  initialData?: Session | null;
}

const CreateSessionModal: React.FC<CreateSessionModalProps> = ({ isOpen, onClose, onCreate, initialData }) => {
  const [formData, setFormData] = useState<CreateSessionDTO>({
    title: 'Badminton Session',
    location: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '18:00',
    endTime: '20:00',
    courtCount: 2,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            const start = new Date(initialData.startTime);
            const end = new Date(initialData.endTime);
            const formatTime = (date: Date) => {
                const h = date.getHours().toString().padStart(2, '0');
                const m = date.getMinutes().toString().padStart(2, '0');
                return `${h}:${m}`;
            };
            
            setFormData({
                title: initialData.title || 'Badminton Session',
                location: initialData.location,
                date: start.toISOString().split('T')[0],
                startTime: formatTime(start),
                endTime: formatTime(end),
                courtCount: initialData.courtCount,
            });
        } else {
             setFormData({
                title: 'Badminton Session',
                location: '',
                date: new Date().toISOString().split('T')[0],
                startTime: '18:00',
                endTime: '20:00',
                courtCount: 2,
            });
        }
    }
  }, [isOpen, initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'courtCount' ? parseInt(value) : value
    }));
    setError(null);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const errorMessage = await onCreate(formData);
    setIsSubmitting(false);

    if (errorMessage) {
        setError(errorMessage);
    } else {
        onClose();
        if (!initialData) {
            setFormData({
                title: 'Badminton Session',
                location: '',
                date: new Date().toISOString().split('T')[0],
                startTime: '18:00',
                endTime: '20:00',
                courtCount: 2,
            });
        }
    }
  };

  const durationString = useMemo(() => {
    if (!formData.startTime || !formData.endTime) return '0h';
    const [startH, startM] = formData.startTime.split(':').map(Number);
    const [endH, endM] = formData.endTime.split(':').map(Number);
    let diffMins = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMins < 0) diffMins += 24 * 60;
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    return `${hours > 0 ? `${hours}h` : ''} ${minutes > 0 ? `${minutes}m` : ''}`.trim() || '0h';
  }, [formData.startTime, formData.endTime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#000B29]/80 backdrop-blur-sm">
      <div className="bg-[#001645] rounded-none border border-[#002266] shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden animate-fade-in-up">
        
        <div className="bg-[#000B29] p-6 flex justify-between items-center border-b border-[#002266]">
          <h2 className="text-xl font-black italic uppercase text-white tracking-wider">
            {initialData ? 'Edit' : 'New'} <span className="text-[#00FF41]">Session</span>
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
            <form onSubmit={handleFinalSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#00FF41] uppercase tracking-wider mb-2 ml-1">Session Title</label>
                <div className="relative group">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00FF41] transition-colors" size={18} />
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Friday Night Smash"
                    className="w-full pl-10 pr-4 py-3 bg-[#000B29] border border-[#002266] text-white rounded-none focus:border-[#00FF41] focus:ring-1 focus:ring-[#00FF41] outline-none transition-all placeholder-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#00FF41] uppercase tracking-wider mb-2 ml-1">Location</label>
                <div className="relative group">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00FF41] transition-colors" size={18} />
                  <input
                    type="text"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g., Winner Sports Club"
                    className="w-full pl-10 pr-4 py-3 bg-[#000B29] border border-[#002266] text-white rounded-none focus:border-[#00FF41] focus:ring-1 focus:ring-[#00FF41] outline-none transition-all placeholder-gray-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-[#00FF41] uppercase tracking-wider mb-2 ml-1">Date</label>
                   <div className="relative group">
                     <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00FF41] transition-colors" size={18} />
                     <input
                      type="date"
                      name="date"
                      required
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 bg-[#000B29] border border-[#002266] text-white rounded-none focus:border-[#00FF41] focus:ring-1 focus:ring-[#00FF41] outline-none transition-all text-sm [color-scheme:dark]"
                    />
                   </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-[#00FF41] uppercase tracking-wider mb-2 ml-1">Courts</label>
                     <div className="relative group">
                       <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00FF41] transition-colors" size={18} />
                        <input
                        type="number"
                        name="courtCount"
                        min="1"
                        max="10"
                        required
                        value={formData.courtCount}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 bg-[#000B29] border border-[#002266] text-white rounded-none focus:border-[#00FF41] focus:ring-1 focus:ring-[#00FF41] outline-none transition-all"
                      />
                     </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-[#00FF41] uppercase tracking-wider mb-2 ml-1">Start Time</label>
                    <div className="relative group">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00FF41] transition-colors" size={18} />
                        <input
                        type="time"
                        name="startTime"
                        required
                        value={formData.startTime}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 bg-[#000B29] border border-[#002266] text-white rounded-none focus:border-[#00FF41] focus:ring-1 focus:ring-[#00FF41] outline-none transition-all text-sm [color-scheme:dark]"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-[#00FF41] uppercase tracking-wider mb-2 ml-1">End Time</label>
                    <div className="relative group">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00FF41] transition-colors" size={18} />
                        <input
                        type="time"
                        name="endTime"
                        required
                        value={formData.endTime}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 bg-[#000B29] border border-[#002266] text-white rounded-none focus:border-[#00FF41] focus:ring-1 focus:ring-[#00FF41] outline-none transition-all text-sm [color-scheme:dark]"
                        />
                    </div>
                </div>
              </div>

              <div className="bg-[#000F33] border border-[#002266] p-4 grid grid-cols-2 gap-px">
                  <div className="flex flex-col items-center justify-center border-r border-[#002266] pr-2">
                     <div className="flex items-center text-gray-400 mb-1">
                         <Timer size={16} className="mr-1.5 text-[#00FF41]"/>
                         <span className="text-[10px] font-bold uppercase tracking-wider">Duration</span>
                     </div>
                     <span className="text-white font-bold text-xl tracking-tight">{durationString}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center pl-2">
                     <div className="flex items-center text-gray-400 mb-1">
                         <Users size={16} className="mr-1.5 text-[#00FF41]"/>
                         <span className="text-[10px] font-bold uppercase tracking-wider">Capacity</span>
                     </div>
                     <span className="text-white font-bold text-xl tracking-tight">{formData.courtCount * 6} <span className="text-sm font-medium text-gray-500">Players</span></span>
                  </div>
              </div>
              
              {error && (
                  <div className="flex items-center gap-2 text-red-500 text-xs font-bold animate-pulse p-2 border border-red-500/20 bg-red-500/10 rounded">
                      <AlertCircle size={14} /> {error}
                  </div>
              )}

              <button 
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 font-black uppercase tracking-widest transition-all transform -skew-x-12
                    ${isSubmitting 
                        ? 'bg-gray-800 text-gray-500 cursor-wait' 
                        : 'bg-[#00FF41] hover:bg-white text-[#000B29] shadow-[0_0_20px_rgba(0,255,65,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] active:scale-[0.98]'
                    }`}
              >
                <span className="skew-x-12 inline-flex items-center gap-2">
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    {isSubmitting 
                        ? (initialData ? 'Updating...' : 'Creating...') 
                        : (initialData ? 'Update Session' : 'Create Session')
                    }
                </span>
              </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default CreateSessionModal;