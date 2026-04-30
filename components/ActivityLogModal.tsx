import React, { useMemo, useEffect, useRef, useState } from 'react';
import { User, Session } from '../types';
import { ArrowLeft, Loader2, MapPin, Clock, Users, X, Calendar } from 'lucide-react';
import { triggerHaptic, formatTime, getDateParts, mapSessionFromDB } from '../utils';
import { supabase } from '../services/supabaseClient';

interface ActivityLogModalProps {
 currentUser: User;
 sessions: Session[];
 onClose: () => void;
 onSessionClick?: (sessionId: string) => void;
}

const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ currentUser, sessions, onClose, onSessionClick }) => {
 const scrollContainerRef = useRef<HTMLDivElement>(null);
 const [historicalActivityMap, setHistoricalActivityMap] = useState<Record<string, { count: number; pts: number }>>({});
 const [oldestDate, setOldestDate] = useState<Date>(new Date());
 const [isLoading, setIsLoading] = useState(true);
 const [selectedDate, setSelectedDate] = useState<string | null>(null);
 const [daySessions, setDaySessions] = useState<Session[]>([]);
 const [isLoadingDay, setIsLoadingDay] = useState(false);

 useEffect(() => {
 const fetchHistory = async () => {
 setIsLoading(true);
 try {
 // Fetch sessions with matches for this user
 const { data, error } = await supabase
 .from('sessions')
 .select('start_time, matches')
 .contains('player_ids', [currentUser.id])
 .order('start_time', { ascending: true }); // Get oldest first

 if (error) throw error;

 const map: Record<string, { count: number; pts: number }> = {};
 let oldest = new Date(); // Start with today by default

 if (data && data.length > 0) {
 oldest = new Date(data[0].start_time);
 data.forEach(s => {
 const dateObj = new Date(s.start_time);
 const yyyy = dateObj.getFullYear();
 const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
 const dd = String(dateObj.getDate()).padStart(2, '0');
 const dateStr = `${yyyy}-${mm}-${dd}`;

 let dayPts = 0;
 if (s.matches && Array.isArray(s.matches)) {
 s.matches.forEach((m: any) => {
 const isT1 = m.team1Ids?.includes(currentUser.id);
 const isT2 = m.team2Ids?.includes(currentUser.id);
 if (!isT1 && !isT2) return;
 const won = (isT1 && m.winningTeamIndex === 1) || (isT2 && m.winningTeamIndex === 2);
 dayPts += won ? (m.pointsChange || 0) : -(m.pointsChange || 0);
 });
 }

 if (!map[dateStr]) map[dateStr] = { count: 0, pts: 0 };
 map[dateStr].count += 1;
 map[dateStr].pts += dayPts;
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



 const handleDateClick = async (dateStr: string, count: number, isFuture: boolean) => {
 if (isFuture || count === 0) return;
 triggerHaptic('light');

 if (selectedDate === dateStr) {
 setSelectedDate(null);
 setDaySessions([]);
 return;
 }

 setSelectedDate(dateStr);
 setIsLoadingDay(true);

 try {
 const dayStart = new Date(`${dateStr}T00:00:00`);
 const dayEnd = new Date(`${dateStr}T23:59:59`);

 const { data, error } = await supabase
 .from('sessions')
 .select('*')
 .contains('player_ids', [currentUser.id])
 .gte('start_time', dayStart.toISOString())
 .lte('start_time', dayEnd.toISOString())
 .order('start_time', { ascending: true });

 if (error) throw error;
 setDaySessions(data ? data.map(mapSessionFromDB) : []);
 } catch (err) {
 console.error("Failed to fetch day sessions:", err);
 setDaySessions([]);
 } finally {
 setIsLoadingDay(false);
 }
 };

 const formatSelectedDate = (dateStr: string) => {
 const d = new Date(dateStr + 'T12:00:00');
 return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
 };

 const getIntensityColor = (count: number, pts: number, isFuture: boolean, isCurrentMonth: boolean) => {
 let colorClass = 'bg-[#000B29] border border-white/5'; // Base Navy (Empty)
 if (count >= 1) {
 if (pts > 0) {
 colorClass = 'bg-[#00FF41] shadow-[0_0_8px_rgba(0,255,65,0.4)] border border-[#00FF41]'; // Green (Gained)
 } else if (pts < 0) {
 colorClass = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] border border-red-500'; // Red (Lost)
 } else {
 colorClass = 'bg-gray-500 shadow-[0_0_6px_rgba(107,114,128,0.3)] border border-gray-500'; // Neutral (No change)
 }
 }
 
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
 
 const weeks: { dateStr: string, count: number, pts: number, isFuture: boolean, isCurrentMonth: boolean }[][] = [];
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
 
 const dayData = historicalActivityMap[dateStr];
 
 week.push({
 dateStr,
 count: dayData?.count || 0,
 pts: dayData?.pts || 0,
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
 <div className="sticky top-0 z-50 w-full bg-[#000B29]/90 backdrop-blur border-b border-[#002266] pt-[env(safe-area-inset-top)] shrink-0">
 <div className="flex items-center gap-3 py-3 px-4 sm:px-6">
 <button onClick={() => { triggerHaptic('light'); onClose(); }} className="p-2 -ml-2 text-gray-400 rounded-full transition-colors active:scale-95">
 <ArrowLeft size={20} />
 </button>
 <div className="flex items-center flex-1">
 <h2 className="text-lg font-black italic uppercase text-white tracking-wider">Activity <span className="text-[#00FF41]">Log</span></h2>
 </div>
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
 {monthsData.map((month, index) => {

 return (
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
 {week.map((day, dIdx) => {
 const isSelected = selectedDate === day.dateStr;
 const isClickable = day.count > 0 && !day.isFuture && day.isCurrentMonth;
 return (
 <div 
 key={day.dateStr}
 onClick={() => isClickable ? handleDateClick(day.dateStr, day.count, day.isFuture) : undefined}
 className={`aspect-square w-full rounded-none flex items-center justify-center ${getIntensityColor(day.count, day.pts, day.isFuture, day.isCurrentMonth)} relative transition-all ${isClickable ? 'cursor-pointer active:scale-90' : ''} ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-[#000B29] scale-110' : ''}`}
 >
 <span className={`text-[10px] font-black ${!day.isCurrentMonth ? 'text-transparent' : (day.count >= 1 && !day.isFuture) ? (day.pts < 0 ? 'text-white' : 'text-[#000B29]') : 'text-white/40'}`}>
 {parseInt(day.dateStr.split('-')[2])}
 </span>
 </div>
 );
 })}
 </div>
 ))}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Bottom Sheet Overlay */}
 {selectedDate && (
 <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { setSelectedDate(null); setDaySessions([]); }}>

 {/* Sheet */}
 <div
 className="relative bg-[#001645] w-full h-[50vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300"
 onClick={e => e.stopPropagation()}
 >
 {/* Header */}
 {(() => {
 const { month, day, weekday } = getDateParts(selectedDate + 'T12:00:00');
 return (
 <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#002266] bg-[#000B29] shrink-0">
 <div className="flex items-end gap-3">
 <span className="text-4xl font-black italic tracking-tighter leading-none text-white">{day}</span>
 <div className="flex flex-col leading-none pb-0.5">
 <span className="text-sm font-black uppercase text-[#00FF41] tracking-widest">{month}</span>
 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{weekday}</span>
 </div>
 </div>
 <button onClick={() => { triggerHaptic('light'); setSelectedDate(null); setDaySessions([]); }} className="p-1 text-gray-400 active:scale-95 transition-all">
 <X size={20} />
 </button>
 </div>
 );
 })()}

 {/* Content */}
 <div className="flex-1 overflow-y-auto bg-[#000B29]">
 {isLoadingDay ? (
 <div className="flex items-center justify-center py-12">
 <Loader2 size={24} className="animate-spin text-[#00FF41]" />
 </div>
 ) : daySessions.length === 0 ? (
 <div className="py-10 text-center">
 <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">No sessions found</span>
 </div>
 ) : (
 <div className="divide-y divide-[#002266]">
 {daySessions.map(session => {
 const playerCount = session.playerIds?.length || 0;
 const matchCount = session.matches?.length || 0;
 return (
 <div
 key={session.id}
 onClick={() => {
 if (onSessionClick) {
 triggerHaptic('medium');
 setSelectedDate(null);
 setDaySessions([]);
 onSessionClick(session.id);
 }
 }}
 className={`px-4 sm:px-6 py-4 flex items-start gap-3 transition-all bg-[#001645] ${onSessionClick ? 'cursor-pointer active:bg-white/5' : ''}`}
 >
 <div className="flex flex-col gap-1.5 w-full">
 {/* Top row: Time + Title + W/L */}
 <div className="flex items-center gap-3">
 <span className="text-sm font-black text-white leading-none shrink-0">{formatTime(session.startTime)}</span>
 <span className="text-sm font-bold text-white leading-none truncate flex-1">{session.title || 'Badminton Session'}</span>
 {(() => {
 let wins = 0, losses = 0, pts = 0;
 (session.matches || []).forEach(m => {
 const isT1 = m.team1Ids.includes(currentUser.id);
 const isT2 = m.team2Ids.includes(currentUser.id);
 if (!isT1 && !isT2) return;
 const won = (isT1 && m.winningTeamIndex === 1) || (isT2 && m.winningTeamIndex === 2);
 if (won) { wins++; pts += m.pointsChange; }
 else { losses++; pts -= m.pointsChange; }
 });
 if (wins === 0 && losses === 0) return null;
 return (
 <div className="flex items-center gap-3 shrink-0">
 <div className="flex items-center gap-1 text-xs font-black uppercase tracking-widest">
 <span className="text-[#00FF41]">{wins}W</span>
 <span className="text-gray-600">/</span>
 <span className="text-red-500">{losses}L</span>
 </div>
 <span className={`text-sm font-black italic tracking-tighter ${pts >= 0 ? 'text-[#00FF41]' : 'text-red-500'}`}>
 {pts > 0 ? '+' : ''}{pts}
 </span>
 </div>
 );
 })()}
 </div>
 {/* Location */}
 {session.location && (
 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate block">
 {session.location}
 </span>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>

 {/* Safe area padding at bottom */}
 <div className="pb-[env(safe-area-inset-bottom)] shrink-0" />
 </div>
 </div>
 )}
 </div>
 );
};

export default ActivityLogModal;
