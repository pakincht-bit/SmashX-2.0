import React, { useMemo, useEffect, useState } from 'react';
import { User, Session } from '../types';
import { Settings, LogOut, ArrowLeft, Loader2, X, Lock } from 'lucide-react';
import {
  getAvatarColor,
  triggerHaptic,
  getWinRateColor,
  getRankFrameClass,
  getUnlockedFrames,
  getPlayerMatchDelta,
  mapSessionFromDB,
  formatTime,
  getDateParts,
} from '../utils';
import { Badge } from './ui/Badge';
import { supabase } from '../services/supabaseClient';
import { RANK_TIERS } from './ArenaTiersModal';

interface ProfileProps {
  user: User;
  sessions: Session[];
  allUsers: User[];
  onOpenSettings: () => void;
  onSessionClick: (sessionId: string) => void;
  onOpenTiers: () => void;
  onOpenInstallGuide: () => void;
  onLogout: () => void;
  onClose: () => void;
}

const FRAME_LABELS: Record<string, string> = {
  unpolished: 'Cocoon',
  spark: 'Spark',
  combustion: 'Combustion',
  void: 'Void',
  ascended: 'Ascended',
  cat: 'Cat',
  dog: 'Dog',
  frog: 'Frog',
  panda: 'Panda',
};

const FRAME_CATALOG: { id: string; minPoints: number; kind: 'rank' | 'cosmetic' }[] = [
  { id: 'unpolished', minPoints: 0, kind: 'rank' },
  { id: 'spark', minPoints: 1100, kind: 'rank' },
  { id: 'combustion', minPoints: 1300, kind: 'rank' },
  { id: 'void', minPoints: 1600, kind: 'rank' },
  { id: 'ascended', minPoints: 2000, kind: 'rank' },
  { id: 'cat', minPoints: 0, kind: 'cosmetic' },
  { id: 'dog', minPoints: 0, kind: 'cosmetic' },
  { id: 'frog', minPoints: 0, kind: 'cosmetic' },
  { id: 'panda', minPoints: 0, kind: 'cosmetic' },
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type DayCell = {
  dateStr: string;
  dayNum: number;
  count: number;
  pts: number;
  isFuture: boolean;
  isCurrentMonth: boolean;
};

const getIntensityColor = (count: number, pts: number, isFuture: boolean, isCurrentMonth: boolean) => {
  let colorClass = 'bg-navy-base border border-white/5';
  if (count >= 1) {
    if (pts > 0) {
      colorClass = 'bg-neon-primary shadow-[0_0_8px_rgba(0,255,65,0.4)] border border-neon-primary';
    } else if (pts < 0) {
      colorClass = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] border border-red-500';
    } else {
      colorClass = 'bg-gray-500 shadow-[0_0_6px_rgba(107,114,128,0.3)] border border-gray-500';
    }
  }

  if (isFuture) colorClass = 'bg-navy-base border border-transparent opacity-30';
  if (!isCurrentMonth) return `${colorClass} opacity-10`;
  return colorClass;
};

const Profile: React.FC<ProfileProps> = ({
  user,
  allUsers,
  onOpenSettings,
  onSessionClick,
  onLogout,
  onClose,
}) => {
  const [activityMap, setActivityMap] = useState<Record<string, { count: number; pts: number }>>({});
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySessions, setDaySessions] = useState<Session[]>([]);
  const [isLoadingDay, setIsLoadingDay] = useState(false);

  const now = useMemo(() => new Date(), []);
  const monthLabel = useMemo(
    () => now.toLocaleString('default', { month: 'long', year: 'numeric' }),
    [now]
  );

  useEffect(() => {
    let cancelled = false;

    const fetchMonthActivity = async () => {
      setIsLoadingActivity(true);
      try {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const { data, error } = await supabase
          .from('sessions')
          .select('start_time, matches')
          .contains('player_ids', [user.id])
          .gte('start_time', monthStart.toISOString())
          .lte('start_time', monthEnd.toISOString())
          .order('start_time', { ascending: true });

        if (error) throw error;

        const map: Record<string, { count: number; pts: number }> = {};
        (data || []).forEach((s) => {
          const dateObj = new Date(s.start_time);
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;

          let dayPts = 0;
          if (s.matches && Array.isArray(s.matches)) {
            s.matches.forEach((m: any) => {
              const isT1 = m.team1Ids?.includes(user.id);
              const isT2 = m.team2Ids?.includes(user.id);
              if (!isT1 && !isT2) return;
              dayPts += getPlayerMatchDelta(m, user.id);
            });
          }

          if (!map[dateStr]) map[dateStr] = { count: 0, pts: 0 };
          map[dateStr].count += 1;
          map[dateStr].pts += dayPts;
        });

        if (!cancelled) setActivityMap(map);
      } catch (err) {
        console.error('Failed to fetch month activity:', err);
        if (!cancelled) setActivityMap({});
      } finally {
        if (!cancelled) setIsLoadingActivity(false);
      }
    };

    fetchMonthActivity();
    return () => {
      cancelled = true;
    };
  }, [user.id, now]);

  const calendarWeeks = useMemo(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endDate = new Date(lastDayOfMonth);
    endDate.setDate(lastDayOfMonth.getDate() + (6 - lastDayOfMonth.getDay()));

    const totalDays =
      Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalWeeks = totalDays / 7;
    const weeks: DayCell[][] = [];
    const cursor = new Date(startDate);

    for (let w = 0; w < totalWeeks; w++) {
      const week: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const yyyy = cursor.getFullYear();
        const mm = String(cursor.getMonth() + 1).padStart(2, '0');
        const dd = String(cursor.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const currentMidnight = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
        const dayData = activityMap[dateStr];

        week.push({
          dateStr,
          dayNum: cursor.getDate(),
          count: dayData?.count || 0,
          pts: dayData?.pts || 0,
          isFuture: currentMidnight.getTime() > todayMidnight.getTime(),
          isCurrentMonth: cursor.getMonth() === now.getMonth(),
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [activityMap, now]);

  const activeDays = useMemo(
    () => Object.values(activityMap).reduce((sum, d) => sum + (d.count > 0 ? 1 : 0), 0),
    [activityMap]
  );

  const monthSessionCount = useMemo(
    () => Object.values(activityMap).reduce((sum, d) => sum + d.count, 0),
    [activityMap]
  );

  const monthNetPts = useMemo(
    () => Object.values(activityMap).reduce((sum, d) => sum + d.pts, 0),
    [activityMap]
  );

  const daysInMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    [now]
  );

  const stats = useMemo(() => {
    const wins = user.wins;
    const losses = user.losses;
    const played = wins + losses;
    const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
    return { played, wins, losses, winRate };
  }, [user.wins, user.losses]);

  const rank = useMemo(() => {
    const sorted = [...allUsers].sort((a, b) => b.points - a.points);
    return sorted.findIndex((u) => u.id === user.id) + 1;
  }, [allUsers, user.id]);

  const rankInfo = useMemo(() => {
    const p = user.points;
    const tier = RANK_TIERS.slice()
      .reverse()
      .find((t) => p >= t.min);
    return {
      name: tier?.name || 'The Cocoon',
      color: tier?.color || 'text-gray-400',
      dot:
        p >= 2000
          ? 'bg-yellow-400 shadow-[0_0_12px_gold]'
          : p >= 1600
            ? 'bg-purple-500 shadow-[0_0_12px_#a855f7]'
            : p >= 1300
              ? 'bg-orange-500 shadow-[0_0_12px_#f97316]'
              : p >= 1100
                ? 'bg-cyan-400 shadow-[0_0_12px_#22d3ee]'
                : 'bg-gray-500',
    };
  }, [user.points]);

  const unlockedSet = useMemo(
    () => new Set(getUnlockedFrames(user.points, user.specialFrame)),
    [user.points, user.specialFrame]
  );

  const handleDateClick = async (day: DayCell) => {
    if (day.count === 0 || day.isFuture || !day.isCurrentMonth) return;
    triggerHaptic('light');

    if (selectedDate === day.dateStr) {
      setSelectedDate(null);
      setDaySessions([]);
      return;
    }

    setSelectedDate(day.dateStr);
    setIsLoadingDay(true);

    try {
      const dayStart = new Date(`${day.dateStr}T00:00:00`);
      const dayEnd = new Date(`${day.dateStr}T23:59:59`);

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .contains('player_ids', [user.id])
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      setDaySessions(data ? data.map(mapSessionFromDB) : []);
    } catch (err) {
      console.error('Failed to fetch day sessions:', err);
      setDaySessions([]);
    } finally {
      setIsLoadingDay(false);
    }
  };

  const handleFrameTap = (frameId: string, unlocked: boolean) => {
    if (!unlocked) {
      triggerHaptic('light');
      return;
    }
    triggerHaptic('medium');
    onOpenSettings();
  };

  return (
    <div className="relative w-full min-h-screen bg-navy-base text-white overflow-y-auto pb-20 font-sans">
      {/* Sticky Navigation Header */}
      <div className="sticky top-0 z-50 w-full bg-navy-base/90 backdrop-blur border-b border-navy-border pt-[env(safe-area-inset-top)] shrink-0">
        <div className="flex items-center gap-3 py-3 px-4 sm:px-6">
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-2 -ml-2 text-gray-400 rounded-full transition-colors active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center flex-1">
            <h2 className="text-lg font-black italic uppercase text-white tracking-wider">
              Player <span className="text-neon-primary">Profile</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onLogout();
            }}
            className="p-2 -mr-2 text-red-400 transition-all active:scale-95"
            aria-label="Log out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg aspect-square bg-neon-primary rounded-full blur-[160px] opacity-[0.05] pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-xl mx-auto px-6 sm:px-8 pt-8 md:pt-12 animate-fade-in-up flex flex-col min-h-[calc(100dvh-80px)] pb-24">
        {/* Identity row */}
        <div className="flex items-center gap-5 w-full mb-8">
          <div className="relative shrink-0">
            <div className={`absolute inset-0 ${rankInfo.dot} blur-[16px] opacity-20 rounded-full`} />
            <div
              className={`w-24 h-24 relative rounded-full bg-navy-struct shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${getRankFrameClass(user.rankFrame)}`}
            >
              <img
                src={user.avatar}
                className="w-full h-full rounded-full object-cover border-[3px] border-navy-base"
                style={{ backgroundColor: getAvatarColor(user.avatar) }}
                alt={user.name}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-2xl font-black text-white italic tracking-tighter truncate leading-none">
                {user.name}
              </h1>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onOpenSettings();
                }}
                className="shrink-0 p-2 bg-navy-card text-gray-400 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] active:scale-95"
                aria-label="Open settings"
              >
                <Settings size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${rankInfo.color}`}>
                {rankInfo.name}
              </span>
              <span className="text-[10px] text-neon-primary">•</span>
              <span className="text-xs font-bold uppercase tracking-[0.2em] italic text-gray-400">
                Rank #{rank}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black italic tabular-nums text-neon-primary tracking-tighter">
                {user.points}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                pts
              </span>
            </div>
          </div>
        </div>

        {/* Career stats — compact block */}
        <section className="w-full mb-4 bg-navy-struct p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">
              Care<span className="text-neon-primary">er</span>
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              All time
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                Played
              </span>
              <span className="text-xl tabular-nums font-black italic tracking-tighter text-white leading-none">
                {stats.played}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                W-L
              </span>
              <div className="flex items-center text-xl font-black italic tracking-tighter leading-none">
                <span className="text-green-500">{stats.wins}</span>
                <span className="text-gray-600 mx-0.5">/</span>
                <span className="text-red-500">{stats.losses}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                Win Rate
              </span>
              <span
                className={`text-xl tabular-nums font-black italic tracking-tighter leading-none ${getWinRateColor(stats.winRate)}`}
              >
                {stats.winRate}%
              </span>
            </div>
          </div>
        </section>

        {/* Activity — compact current month */}
        <section className="w-full mb-8 bg-navy-struct p-4">
          <div className="flex items-start justify-between mb-3 gap-3">
            <div className="min-w-0">
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-white leading-none">
                Activ<span className="text-neon-primary">ity</span>
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1 block">
                {monthLabel}
              </span>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
                Active days
              </span>
              <span className="text-lg font-black italic tabular-nums tracking-tighter text-white leading-none">
                {isLoadingActivity ? '—' : (
                  <>
                    {activeDays}
                    <span className="text-gray-600">/{daysInMonth}</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {isLoadingActivity ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-neon-primary mb-2" />
              <span className="text-[9px] font-black uppercase text-gray-500 tracking-[0.2em]">
                Loading…
              </span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-[7px] font-black text-gray-500 uppercase tracking-widest mb-1.5 text-center">
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                {calendarWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-cols-7 gap-1">
                    {week.map((day) => {
                      const isSelected = selectedDate === day.dateStr;
                      const isClickable =
                        day.count > 0 && !day.isFuture && day.isCurrentMonth;
                      return (
                        <button
                          key={day.dateStr}
                          type="button"
                          disabled={!isClickable}
                          onClick={() => handleDateClick(day)}
                          className={`aspect-square w-full rounded-none flex items-center justify-center ${getIntensityColor(day.count, day.pts, day.isFuture, day.isCurrentMonth)} relative transition-all ${isClickable ? 'cursor-pointer active:scale-90' : ''} ${isSelected ? 'ring-1 ring-white ring-offset-1 ring-offset-navy-struct scale-105 z-10' : ''}`}
                        >
                          <span
                            className={`text-[9px] font-black ${
                              !day.isCurrentMonth
                                ? 'text-transparent'
                                : day.count >= 1 && !day.isFuture
                                  ? day.pts < 0
                                    ? 'text-white'
                                    : 'text-navy-base'
                                  : 'text-white/35'
                            }`}
                          >
                            {day.dayNum}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-navy-border/60">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                    Sessions
                  </span>
                  <span className="text-base font-black italic tabular-nums tracking-tighter text-white leading-none">
                    {monthSessionCount}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                    Net pts
                  </span>
                  <span
                    className={`text-base font-black italic tabular-nums tracking-tighter leading-none ${
                      monthNetPts > 0
                        ? 'text-neon-primary'
                        : monthNetPts < 0
                          ? 'text-red-500'
                          : 'text-white'
                    }`}
                  >
                    {monthNetPts > 0 ? '+' : ''}
                    {monthNetPts}
                  </span>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Frames achievements */}
        <section className="w-full mb-10">
          <div className="flex items-end justify-between mb-4">
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">
              Fram<span className="text-neon-primary">es</span>
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              {FRAME_CATALOG.filter((f) => unlockedSet.has(f.id)).length}/{FRAME_CATALOG.length}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FRAME_CATALOG.map((frame) => {
              const unlocked = unlockedSet.has(frame.id);
              const equipped = user.rankFrame === frame.id;
              return (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => handleFrameTap(frame.id, unlocked)}
                  className={`relative flex flex-col items-center justify-center gap-3 p-5 bg-navy-struct shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all active:scale-[0.98] ${
                    equipped ? 'ring-1 ring-neon-primary/60' : ''
                  } ${!unlocked ? 'opacity-50' : ''}`}
                >
                  {equipped ? (
                    <div className="absolute top-2 right-2">
                      <Badge variant="live" skewed className="!px-1.5 !py-0.5">
                        Equipped
                      </Badge>
                    </div>
                  ) : null}

                  <div className="relative">
                    <div
                      className={`w-16 h-16 rounded-full bg-navy-base ${getRankFrameClass(frame.id)} ${
                        !unlocked ? 'grayscale' : ''
                      }`}
                    >
                      <img
                        src={user.avatar}
                        className="w-full h-full rounded-full object-cover border-2 border-navy-base"
                        style={{ backgroundColor: getAvatarColor(user.avatar) }}
                        alt={FRAME_LABELS[frame.id] || frame.id}
                      />
                    </div>
                    {!unlocked ? (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-navy-base/50">
                        <Lock size={14} className="text-gray-400" />
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-center text-center gap-0.5">
                    <span
                      className={`text-[10px] font-black uppercase tracking-[0.15em] ${
                        unlocked ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {FRAME_LABELS[frame.id] || frame.id}
                    </span>
                    <span className="text-[9px] font-mono text-gray-600 tracking-wider">
                      {unlocked
                        ? frame.kind === 'cosmetic'
                          ? 'Cosmetic'
                          : 'Unlocked'
                        : `${frame.minPoints.toLocaleString()}+ pts`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

      </div>

      {/* Day sessions sheet */}
      {selectedDate ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            setSelectedDate(null);
            setDaySessions([]);
          }}
        >
          <div
            className="relative bg-navy-card w-full max-w-xl h-[50vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const { month, day, weekday } = getDateParts(selectedDate + 'T12:00:00');
              return (
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-navy-border bg-navy-base shrink-0">
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-black italic tracking-tighter leading-none text-white">
                      {day}
                    </span>
                    <div className="flex flex-col leading-none pb-0.5">
                      <span className="text-sm font-black uppercase text-neon-primary tracking-widest">
                        {month}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        {weekday}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedDate(null);
                      setDaySessions([]);
                    }}
                    className="p-1 text-gray-400 active:scale-95 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              );
            })()}

            <div className="flex-1 overflow-y-auto bg-navy-base">
              {isLoadingDay ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-neon-primary" />
                </div>
              ) : daySessions.length === 0 ? (
                <div className="py-10 text-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    No sessions found
                  </span>
                </div>
              ) : (
                <div className="divide-y divide-navy-border">
                  {daySessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => {
                        triggerHaptic('medium');
                        setSelectedDate(null);
                        setDaySessions([]);
                        onSessionClick(session.id);
                      }}
                      className="px-4 sm:px-6 py-4 flex items-start gap-3 transition-all bg-navy-card cursor-pointer active:bg-white/5"
                    >
                      <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-white leading-none shrink-0">
                            {formatTime(session.startTime)}
                          </span>
                          <span className="text-sm font-bold text-white leading-none truncate flex-1">
                            {session.title || 'Badminton Session'}
                          </span>
                          {(() => {
                            let wins = 0;
                            let losses = 0;
                            let pts = 0;
                            (session.matches || []).forEach((m) => {
                              const isT1 = m.team1Ids.includes(user.id);
                              const isT2 = m.team2Ids.includes(user.id);
                              if (!isT1 && !isT2) return;
                              const won =
                                (isT1 && m.winningTeamIndex === 1) ||
                                (isT2 && m.winningTeamIndex === 2);
                              if (won) wins++;
                              else losses++;
                              pts += getPlayerMatchDelta(m, user.id);
                            });
                            if (wins === 0 && losses === 0) return null;
                            return (
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-1 text-xs font-black uppercase tracking-widest">
                                  <span className="text-neon-primary">{wins}W</span>
                                  <span className="text-gray-600">/</span>
                                  <span className="text-red-500">{losses}L</span>
                                </div>
                                <span
                                  className={`text-sm font-black italic tracking-tighter ${
                                    pts >= 0 ? 'text-neon-primary' : 'text-red-500'
                                  }`}
                                >
                                  {pts > 0 ? '+' : ''}
                                  {pts}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                        {session.location ? (
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate block">
                            {session.location}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pb-[env(safe-area-inset-bottom)] shrink-0" />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Profile;
