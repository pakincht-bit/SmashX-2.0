import React, { useMemo, useEffect, useState } from 'react';
import { User, Session } from '../types';
import { Settings, LogOut, ArrowLeft, Loader2, Lock, ChevronRight } from 'lucide-react';
import {
  getAvatarColor,
  triggerHaptic,
  getWinRateColor,
  getRankFrameClass,
  getUnlockedFrames,
  getPlayerMatchDelta,
} from '../utils';
import { Badge } from './ui/Badge';
import { supabase } from '../services/supabaseClient';

interface ProfileProps {
  user: User;
  sessions: Session[];
  allUsers: User[];
  onOpenSettings: () => void;
  onSessionClick: (sessionId: string) => void;
  onOpenTiers: () => void;
  onOpenInstallGuide: () => void;
  onOpenActivity: () => void;
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

type DayCell = {
  dateStr: string;
  dayNum: number;
  count: number;
  pts: number;
  isFuture: boolean;
  isCurrentMonth: boolean;
};

const getDotClass = (count: number, pts: number, isFuture: boolean, isCurrentMonth: boolean) => {
  if (!isCurrentMonth) return 'bg-transparent';
  if (isFuture) return 'bg-white/5';
  if (count < 1) return 'bg-white/10';
  if (pts > 0) return 'bg-neon-primary shadow-[0_0_6px_rgba(0,255,65,0.35)]';
  if (pts < 0) return 'bg-red-500';
  return 'bg-gray-500';
};

const Profile: React.FC<ProfileProps> = ({
  user,
  allUsers,
  onOpenSettings,
  onOpenActivity,
  onLogout,
  onClose,
}) => {
  const [activityMap, setActivityMap] = useState<Record<string, { count: number; pts: number }>>({});
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

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

  const unlockedSet = useMemo(
    () => new Set(getUnlockedFrames(user.points, user.specialFrame)),
    [user.points, user.specialFrame]
  );

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
        <div className="flex items-center gap-2 py-2 px-4 sm:px-6">
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 -ml-1.5 text-gray-400 rounded-full transition-colors active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center flex-1 min-w-0">
            <h2 className="text-base font-black italic uppercase text-white tracking-wider truncate">
              Player <span className="text-neon-primary">Profile</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onLogout();
            }}
            className="p-1.5 -mr-1.5 text-red-400 transition-all active:scale-95"
            aria-label="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg aspect-square bg-neon-primary rounded-full blur-[160px] opacity-[0.05] pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-xl mx-auto px-6 sm:px-8 pt-6 md:pt-8 animate-fade-in-up flex flex-col min-h-[calc(100dvh-80px)] pb-24">
        {/* Identity row */}
        <div className="flex items-center gap-4 w-full mb-6">
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter truncate leading-none">
                {user.name}
              </h1>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onOpenSettings();
                }}
                className="shrink-0 p-2 bg-navy-card text-gray-400 transition-all active:scale-95"
                aria-label="Open settings"
              >
                <Settings size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold uppercase tracking-[0.2em] italic text-gray-400 shrink-0">
                Rank #{rank}
              </span>
              <span className="text-[10px] text-neon-primary shrink-0">•</span>
              <span className="text-sm font-black italic tabular-nums text-neon-primary tracking-tighter shrink-0">
                {user.points} <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">pts</span>
              </span>
            </div>
          </div>

          <div className="relative shrink-0">
            <div
              className={`w-20 h-20 relative rounded-full bg-navy-struct shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${getRankFrameClass(user.rankFrame)}`}
            >
              <img
                src={user.avatar}
                className="w-full h-full rounded-full object-cover border-[3px] border-navy-base"
                style={{ backgroundColor: getAvatarColor(user.avatar) }}
                alt={user.name}
              />
            </div>
          </div>
        </div>

        {/* Career stats — compact block */}
        <section className="w-full mb-4 bg-navy-struct p-4">
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

        {/* Activity — opens full calendar heatmap */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenActivity();
          }}
          className="w-full mb-8 bg-navy-struct p-4 text-left transition-all active:scale-[0.99]"
        >
          {isLoadingActivity ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={18} className="animate-spin text-neon-primary" />
            </div>
          ) : (
            <div className="flex items-stretch gap-4">
              <div className="shrink-0 flex flex-col pt-0.5">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col">
                    <span className="text-xl tabular-nums font-black italic tracking-tighter text-white leading-none">
                      {monthSessionCount}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-1.5">
                      Sessions
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`text-xl tabular-nums font-black italic tracking-tighter leading-none ${
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
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-1.5">
                      Net pts
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-auto inline-flex items-center gap-1">
                  View activity log
                  <ChevronRight size={12} className="text-neon-primary" />
                </span>
              </div>

              <div className="flex-1 min-w-0 flex flex-col items-end justify-end pointer-events-none">
                <div className="flex flex-col gap-1.5">
                  {calendarWeeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex gap-1.5 justify-end">
                      {week.map((day) => (
                        <span
                          key={day.dateStr}
                          className={`w-3.5 h-3.5 shrink-0 rounded-full ${getDotClass(day.count, day.pts, day.isFuture, day.isCurrentMonth)}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </button>

        {/* Frames achievements */}
        <section className="w-full mb-10">
          <div className="flex items-end justify-between mb-3">
            <h3 className="text-sm font-black italic uppercase tracking-wider text-white">
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
                  className={`relative flex flex-col items-center justify-center gap-3 p-5 bg-navy-struct transition-all active:scale-[0.98] ${
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
    </div>
  );
};

export default Profile;
