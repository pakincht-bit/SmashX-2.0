import React, { useMemo, useEffect, useRef, useState } from 'react';
import { User, Session } from '../types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { triggerHaptic } from '../utils';
import { supabase } from '../services/supabaseClient';

interface ActivityLogModalProps {
    currentUser: User;
    sessions: Session[];
    onClose: () => void;
}

const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ currentUser, sessions, onClose }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [historicalActivityMap, setHistoricalActivityMap] = useState<Record<string, number>>({});
    const [oldestDate, setOldestDate] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                // Fetch all start times for this user
                const { data, error } = await supabase
                    .from('sessions')
                    .select('start_time')
                    .contains('player_ids', [currentUser.id])
                    .order('start_time', { ascending: true }); // Get oldest first

                if (error) throw error;

                const map: Record<string, number> = {};
                let oldest = new Date(); // Start with today by default

                if (data && data.length > 0) {
                    oldest = new Date(data[0].start_time);
                    data.forEach(s => {
                        const dateObj = new Date(s.start_time);
                        const yyyy = dateObj.getFullYear();
                        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const dd = String(dateObj.getDate()).padStart(2, '0');
                        const dateStr = `${yyyy}-${mm}-${dd}`;
                        map[dateStr] = (map[dateStr] || 0) + 1;
                    });
                }
                
                setHistoricalActivityMap(map);
                setOldestDate(oldest);
            } catch (error) {
                console.error("Failed to fetch activity history:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [currentUser.id]);

    useEffect(() => {
        if (!isLoading && scrollContainerRef.current) {
            // Slight delay ensures paint is fully complete for accurate scrollHeight
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                }
            }, 50);
        }
    }, [isLoading]);

    const getIntensityColor = (count: number, isFuture: boolean, isCurrentMonth: boolean) => {
        let colorClass = 'bg-[#000B29] border border-white/5'; // Base Navy (Empty)
        if (count >= 1) colorClass = 'bg-[#00FF41] shadow-[0_0_8px_rgba(0,255,65,0.4)] border border-[#00FF41]'; // Active (Exist)
        
        if (isFuture) colorClass = 'bg-[#000B29] border border-transparent opacity-30';
        
        if (!isCurrentMonth) {
           return `${colorClass} opacity-10`;
        }
        return colorClass;
    };

    const monthsData = useMemo(() => {
        if (isLoading) return [];

        const today = new Date();
        const months = [];
        
        const startYear = oldestDate.getFullYear();
        const startMonth = oldestDate.getMonth();
        
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        
        // Calculate total months difference
        let monthDiff = (currentYear - startYear) * 12 + (currentMonth - startMonth);
        
        // Ensure at least 5 months are shown for visual consistency
        if (monthDiff < 4) monthDiff = 4;

        // Generate data for all months between oldest session and today (oldest first, current month last)
        for (let i = monthDiff; i >= 0; i--) {
            const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthName = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            
            const firstDayOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            const startDate = new Date(firstDayOfMonth);
            startDate.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());
            
            const lastDayOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
            const endDate = new Date(lastDayOfMonth);
            endDate.setDate(lastDayOfMonth.getDate() + (6 - lastDayOfMonth.getDay()));
            
            const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const totalWeeks = totalDays / 7;
            
            const weeks: { dateStr: string, count: number, isFuture: boolean, isCurrentMonth: boolean }[][] = [];
            let currentDate = new Date(startDate);
            
            for (let w = 0; w < totalWeeks; w++) {
                const week = [];
                for (let d = 0; d < 7; d++) {
                    const yyyy = currentDate.getFullYear();
                    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(currentDate.getDate()).padStart(2, '0');
                    const dateStr = `${yyyy}-${mm}-${dd}`;
                    
                    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const currentMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                    const isFuture = currentMidnight.getTime() > todayMidnight.getTime();
                    const isCurrentMonth = currentDate.getMonth() === targetDate.getMonth();
                    
                    week.push({
                        dateStr,
                        count: historicalActivityMap[dateStr] || 0,
                        isFuture,
                        isCurrentMonth
                    });
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                weeks.push(week);
            }
            months.push({ name: monthName, grid: weeks });
        }
        return months;
    }, [historicalActivityMap, oldestDate, isLoading]);

    return (
        <div className="fixed inset-0 z-50 bg-[#000B29] flex flex-col font-sans overflow-hidden">
            {/* Sticky Navigation Header */}
            <div className="flex items-center gap-3 sticky top-0 bg-[#000B29]/90 backdrop-blur z-50 py-3 px-4 sm:px-6 border-b border-[#002266] w-full shrink-0">
                <button onClick={() => { triggerHaptic('light'); onClose(); }} className="p-2 -ml-2 text-gray-400 hover:text-white rounded-full transition-colors active:scale-95">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center flex-1">
                    <h2 className="text-lg font-black italic uppercase text-white tracking-wider">Activity <span className="text-[#00FF41]">Log</span></h2>
                </div>
            </div>

            {/* Scrollable Content */}
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in-up">
                    <Loader2 size={32} className="animate-spin text-[#00FF41] mb-4" />
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">Tracing Timeline...</span>
                </div>
            ) : (
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 pb-20 space-y-8 animate-fade-in-up">
                    {monthsData.map((month, index) => (
                        <div key={index} className="w-full max-w-xl mx-auto">
                        <h3 className="text-[#00FF41] font-black uppercase tracking-widest text-[10px] pl-1 opacity-80 border-b border-[#00FF41]/10 pb-1 mb-4">
                            {month.name}
                        </h3>
                        
                        <div className="w-full">
                            {/* Day Labels */}
                            <div className="grid grid-cols-7 gap-2 text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2 text-center">
                                <span>Sun</span>
                                <span>Mon</span>
                                <span>Tue</span>
                                <span>Wed</span>
                                <span>Thu</span>
                                <span>Fri</span>
                                <span>Sat</span>
                            </div>
                            
                            {/* Grid */}
                            <div className="flex flex-col gap-2">
                                {month.grid.map((week, wIdx) => (
                                    <div key={wIdx} className="grid grid-cols-7 gap-2">
                                        {week.map((day, dIdx) => (
                                            <div 
                                                key={day.dateStr}
                                                className={`aspect-square w-full rounded-none flex items-center justify-center ${getIntensityColor(day.count, day.isFuture, day.isCurrentMonth)} relative`}
                                            >
                                                <span className={`text-[10px] font-black ${!day.isCurrentMonth ? 'text-transparent' : (day.count >= 1 && !day.isFuture) ? 'text-[#000B29]' : 'text-white/40'}`}>
                                                    {parseInt(day.dateStr.split('-')[2])}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            )}
        </div>
    );
};

export default ActivityLogModal;
