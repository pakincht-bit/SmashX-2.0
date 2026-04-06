import React, { useMemo } from 'react';
import { User, Session } from '../types';
import { ArrowLeft, Calendar, Loader2, MapPin, Clock } from 'lucide-react';
import { formatTime, getDateParts, triggerHaptic } from '../utils';

interface HistoryScreenProps {
 currentUser: User | null;
 sessions: Session[];
 pastSessions: Session[];
 isLoadingPast: boolean;
 hasMorePast: boolean;
 onLoadMore: () => void;
 onBack: () => void;
 onSessionClick: (sessionId: string) => void;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({
 currentUser,
 sessions,
 pastSessions,
 isLoadingPast,
 hasMorePast,
 onLoadMore,
 onBack,
 onSessionClick
}) => {
 const playerSessions = useMemo(() => {
 if (!currentUser) return [];
 const all = [...sessions, ...pastSessions];
 // filter unique by id
 const unique = Array.from(new Map(all.map(s => [s.id, s])).values());
 
 return unique
 .filter(s => s.playerIds.includes(currentUser.id))
 .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
 }, [currentUser, sessions, pastSessions]);

 const groupedSessionsArray = useMemo(() => {
 const groups: { monthYear: string; sessions: Session[] }[] = [];
 playerSessions.forEach(session => {
 const date = new Date(session.startTime);
 const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
 
 let group = groups.find(g => g.monthYear === monthYear);
 if (!group) {
 group = { monthYear, sessions: [] };
 groups.push(group);
 }
 group.sessions.push(session);
 });
 return groups;
 }, [playerSessions]);

 return (
 <div className="relative w-full min-h-screen bg-[#000B29] text-white overflow-y-auto pb-20 font-sans">
 {/* Sticky Navigation Header */}
 <div className="sticky top-0 z-50 w-full bg-[#000B29]/90 backdrop-blur border-b border-[#002266] pt-[env(safe-area-inset-top)]">
 <div className="flex items-center gap-3 py-3 px-4 sm:px-6">
 <button onClick={() => { triggerHaptic('light'); onBack(); }} className="p-2 -ml-2 text-gray-400 rounded-full transition-colors active:scale-95">
 <ArrowLeft size={20} />
 </button>
 <div className="flex items-center flex-1">
 <h2 className="text-lg font-black italic uppercase text-white tracking-wider">Battle <span className="text-[#00FF41]">History</span></h2>
 </div>
 </div>
 </div>

 <div className="relative z-10 w-full max-w-xl mx-auto px-6 sm:px-8 pt-6 md:pt-8 animate-fade-in-up flex flex-col min-h-[calc(100dvh-80px)]">
 {playerSessions.length === 0 ? (
 <div className="text-center py-12 flex flex-col items-center">
 <div className="w-16 h-16 rounded-full bg-[#001645] flex items-center justify-center mb-4">
 <Calendar size={24} className="text-gray-500" />
 </div>
 <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No Battles Found</p>
 <p className="text-gray-600 text-xs mt-2">Join a session to start your history.</p>
 </div>
 ) : (
 <div className="space-y-4">
 {groupedSessionsArray.map(group => (
 <div key={group.monthYear} className="space-y-3 pt-2">
 <h3 className="text-[#00FF41] font-black uppercase tracking-widest text-[10px] pl-1 opacity-80 border-b border-[#00FF41]/10 pb-1 mb-2">
 {group.monthYear}
 </h3>
 <div className="space-y-3">
 {group.sessions.map(session => {
 const { month, day, weekday } = getDateParts(session.startTime);
 const status = session.finalBill ? 'Completed' : (new Date(session.startTime).getTime() < new Date().getTime() ? 'In Progress' : 'Upcoming');
 
 let matchesPlayed = 0;
 let wins = 0;
 let losses = 0;
 let totalScoreChange = 0;

 if (currentUser && session.matches) {
 session.matches.forEach(match => {
 const inTeam1 = match.team1Ids.includes(currentUser.id);
 const inTeam2 = match.team2Ids.includes(currentUser.id);
 
 if (inTeam1 || inTeam2) {
 matchesPlayed++;
 
 const isWinner = (inTeam1 && match.winningTeamIndex === 1) || (inTeam2 && match.winningTeamIndex === 2);
 if (isWinner) {
 wins++;
 totalScoreChange += match.pointsChange;
 } else {
 losses++;
 totalScoreChange -= match.pointsChange;
 }
 }
 });
 }
 
 return (
 <div key={session.id} onClick={() => { triggerHaptic('light'); onSessionClick(session.id); }} className="bg-[#001645] p-3 rounded-none flex items-center justify-between gap-4 group transition-colors shadow-sm cursor-pointer">
 <div className="flex items-center gap-4 min-w-0 flex-1">
 <div className="bg-[#000B29] rounded-none w-12 h-12 flex flex-col justify-center items-center shrink-0">
 <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 leading-none mb-0.5">{month}</span>
 <span className="text-xl font-black text-white italic tracking-tighter leading-none">{day}</span>
 </div>
 <div className="flex flex-col min-w-0">
 <span className="text-sm font-black italic uppercase text-white truncate">{session.title || session.location}</span>
 <div className="flex items-center gap-2 mt-1">
 <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{formatTime(session.startTime)}</span>
 <span className="text-[9px] font-bold text-gray-600">•</span>
 <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{session.location}</span>
 </div>
 </div>
 </div>
 {matchesPlayed > 0 && (
 <div className="flex items-center gap-3 shrink-0 pl-2 pr-1">
 <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
 <span className="text-[#00FF41]">{wins}W</span>
 <span className="text-gray-600">/</span>
 <span className="text-red-500">{losses}L</span>
 </div>
 <span className={`text-[12px] font-black italic tracking-tighter px-2.5 py-1 rounded border ${totalScoreChange >= 0 ? 'text-[#00FF41] border-[#00FF41]/30 bg-[#00FF41]/5' : 'text-red-500 border-red-500/30 bg-red-500/5'}`}>
 {totalScoreChange > 0 ? '+' : ''}{totalScoreChange}
 </span>
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>
 ))}

 {hasMorePast && (
 <button
 onClick={onLoadMore}
 disabled={isLoadingPast}
 className="w-full mt-6 py-4 rounded-none border border-white/5 bg-transparent text-gray-400 transition-all font-bold uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
 >
 <div className="flex items-center gap-2">
 {isLoadingPast ? (
 <><Loader2 size={16} className="animate-spin" /> Loading...</>
 ) : (
 <>Load More</>
 )}
 </div>
 </button>
 )}
 </div>
 )}
 </div>
 </div>
 );
};

export default HistoryScreen;
