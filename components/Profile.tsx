import React, { useMemo, useEffect, useState } from 'react';
import { User, Session } from '../types';
import { Pencil, LogOut, ArrowLeft, Loader2, ChevronRight, Users, Swords, AlertTriangle } from 'lucide-react';
import {
  getAvatarColor,
  triggerHaptic,
  getWinRateColor,
  getRankFrameClass,
  getPlayerMatchDelta,
} from '../utils';
import { supabase } from '../services/supabaseClient';
import {
  fetchAllTimeSessions,
  getCachedAllTimeSessions,
  isAllTimeSessionsCacheFresh,
  mergeSessionsWithLive,
} from '../services/allTimeSessions';
import { computeSocialSynergies, SynergyPlayer } from '../utils/socialSynergies';
import ConfirmationModal from './ConfirmationModal';

interface ProfileProps {
  user: User;
  sessions: Session[];
  allUsers: User[];
  onOpenSettings: () => void;
  onSessionClick: (sessionId: string) => void;
  onOpenTiers: () => void;
  onOpenInstallGuide: () => void;
  onOpenActivity: () => void;
  onOpenStats: () => void;
  onPlayerClick?: (userId: string) => void;
  onDeleteAccount: () => void;
  onLogout: () => void;
  onClose: () => void;
}

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

const SynergyRow = ({
  label,
  labelClass,
  borderClass,
  bgClass,
  player,
  emptyLabel,
  icon,
  metric,
  kind,
  metricAccent = 'text-neon-primary',
  onClick,
}: {
  label: string;
  labelClass: string;
  borderClass: string;
  bgClass: string;
  player: SynergyPlayer | null;
  emptyLabel: string;
  icon: React.ReactNode;
  metric: 'matches' | 'winRate';
  kind: 'with' | 'against';
  metricAccent?: string;
  onClick?: () => void;
}) => {
  const wins =
    player == null
      ? 0
      : kind === 'with'
        ? player.stat.wonWith
        : player.stat.playedAgainst - player.stat.lostAgainst;
  const losses =
    player == null
      ? 0
      : kind === 'with'
        ? player.stat.playedWith - player.stat.wonWith
        : player.stat.lostAgainst;
  const total =
    player == null
      ? 0
      : kind === 'with'
        ? player.stat.playedWith
        : player.stat.playedAgainst;
  const winRatePct =
    player == null
      ? 0
      : kind === 'with'
        ? Math.round((player.winRate ?? (total > 0 ? wins / total : 0)) * 100)
        : Math.round((total > 0 ? wins / total : 0) * 100);

  return (
    <button
      type="button"
      disabled={!player}
      onClick={() => {
        if (!player || !onClick) return;
        triggerHaptic('light');
        onClick();
      }}
      className={`w-full flex items-center gap-3 p-3 bg-gradient-to-r ${bgClass} border-l-2 ${borderClass} text-left transition-all ${
        player ? 'active:scale-[0.99]' : 'opacity-70'
      }`}
    >
      {player ? (
        <img
          src={player.user.avatar}
          className="w-10 h-10 rounded-full object-cover border-2 border-navy-base shrink-0"
          style={{ backgroundColor: getAvatarColor(player.user.avatar) }}
          alt={player.user.name}
        />
      ) : (
        <div className="w-10 h-10 rounded-full border-2 border-navy-border bg-navy-base flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <div className="flex flex-col min-w-0 flex-1">
        <span className={`text-[10px] font-black uppercase tracking-tighter italic leading-none mb-0.5 ${labelClass}`}>
          {label}
        </span>
        <span
          className={`text-sm font-bold leading-none truncate ${
            player ? 'text-white' : 'text-gray-500 italic'
          }`}
        >
          {player ? player.user.name : emptyLabel}
        </span>
      </div>

      {player && (
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-[11px] font-bold tabular-nums leading-none">
            <span className="text-neon-primary">{wins}W</span>
            <span className="text-gray-500 mx-0.5">/</span>
            <span className="text-red-400">{losses}L</span>
          </span>
          <div className="bg-navy-base px-2.5 py-1.5 flex flex-col items-center justify-center min-w-[52px]">
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1">
              {metric === 'matches' ? 'Matches' : 'Win Rate'}
            </span>
            <span
              className={`text-sm font-black italic tabular-nums leading-none ${
                metric === 'winRate' ? metricAccent : 'text-white'
              }`}
            >
              {metric === 'matches' ? total : `${winRatePct}%`}
            </span>
          </div>
        </div>
      )}
    </button>
  );
};

const Profile: React.FC<ProfileProps> = ({
  user,
  sessions,
  allUsers,
  onOpenSettings,
  onOpenActivity,
  onOpenStats,
  onPlayerClick,
  onDeleteAccount,
  onLogout,
  onClose,
}) => {
  const [activityMap, setActivityMap] = useState<
    Record<string, { count: number; matches: number; pts: number }>
  >({});
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const cachedAllTime = getCachedAllTimeSessions(user.id);
  const [allTimeSessions, setAllTimeSessions] = useState<Session[]>(cachedAllTime ?? sessions);

  const now = useMemo(() => new Date(), []);

  // Same all-time match history as Stats page (needed for accurate streak / best / last-10)
  useEffect(() => {
    let cancelled = false;

    const loadAllTime = async () => {
      if (isAllTimeSessionsCacheFresh(user.id)) {
        const cached = getCachedAllTimeSessions(user.id);
        if (cached && !cancelled) setAllTimeSessions(cached);
        return;
      }
      try {
        const mapped = await fetchAllTimeSessions(user.id);
        if (!cancelled) setAllTimeSessions(mapped);
      } catch (err) {
        console.error('Profile: failed to fetch all-time sessions', err);
      }
    };

    loadAllTime();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

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

        const map: Record<string, { count: number; matches: number; pts: number }> = {};
        (data || []).forEach((s) => {
          const dateObj = new Date(s.start_time);
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;

          let dayPts = 0;
          let dayMatches = 0;
          if (s.matches && Array.isArray(s.matches)) {
            s.matches.forEach((m: any) => {
              const isT1 = m.team1Ids?.includes(user.id);
              const isT2 = m.team2Ids?.includes(user.id);
              if (!isT1 && !isT2) return;
              dayMatches += 1;
              dayPts += getPlayerMatchDelta(m, user.id);
            });
          }

          if (!map[dateStr]) map[dateStr] = { count: 0, matches: 0, pts: 0 };
          map[dateStr].count += 1;
          map[dateStr].matches += dayMatches;
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

  const monthMatchCount = useMemo(
    () => Object.values(activityMap).reduce((sum, d) => sum + d.matches, 0),
    [activityMap]
  );

  const monthNetPts = useMemo(
    () => Object.values(activityMap).reduce((sum, d) => sum + d.pts, 0),
    [activityMap]
  );

  // Match activity heatmap geometry: 7 × w-3.5 dots with gap-1.5
  const activityVisualSize = useMemo(() => {
    const rows = Math.max(calendarWeeks.length, 1);
    const cols = 7;
    const cell = 14; // w-3.5 / h-3.5
    const gap = 6; // gap-1.5
    return {
      width: cols * cell + (cols - 1) * gap,
      height: rows * cell + (rows - 1) * gap,
    };
  }, [calendarWeeks.length]);

  const stats = useMemo(() => {
    const wins = user.wins;
    const losses = user.losses;
    const played = wins + losses;
    const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
    return { played, wins, losses, winRate };
  }, [user.wins, user.losses]);

  const formSessions = useMemo(
    () => mergeSessionsWithLive(allTimeSessions, sessions),
    [allTimeSessions, sessions]
  );

  const socialSynergies = useMemo(
    () => computeSocialSynergies(formSessions, user.id, allUsers),
    [formSessions, user.id, allUsers]
  );

  const rank = useMemo(() => {
    const sorted = [...allUsers].sort((a, b) => b.points - a.points);
    return sorted.findIndex((u) => u.id === user.id) + 1;
  }, [allUsers, user.id]);

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
        {/* Identity + career — single static group */}
        <section className="w-full mb-2 bg-navy-struct p-4">
          <div className="flex items-center gap-8 w-full mb-4">
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.2em] italic text-gray-400">
                Rank #{rank}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter truncate leading-none">
                {user.name}
              </h1>
            </div>

            <div className="relative shrink-0">
              <div
                className={`w-20 h-20 relative rounded-full bg-navy-base shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${getRankFrameClass(user.rankFrame)}`}
              >
                <img
                  src={user.avatar}
                  className="w-full h-full rounded-full object-cover border-[3px] border-navy-struct"
                  style={{ backgroundColor: getAvatarColor(user.avatar) }}
                  alt={user.name}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenSettings();
                }}
                className="absolute -bottom-1 -right-1 p-1.5 bg-navy-card text-neon-primary border-2 border-navy-struct transition-all active:scale-95 z-10"
                aria-label="Edit profile"
              >
                <Pencil size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                Pts
              </span>
              <span className="text-xl tabular-nums font-black italic tracking-tighter text-neon-primary leading-none">
                {user.points}
              </span>
            </div>
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
                <span className="text-neon-primary">{stats.wins}</span>
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
          className="w-full mb-2 bg-navy-card p-4 text-left transition-all active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black italic uppercase tracking-wider text-white">
              {now.toLocaleString('en-US', { month: 'short', year: 'numeric' })}
            </h3>
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 inline-flex items-center gap-1">
              View activity log
              <ChevronRight size={12} className="text-neon-primary" />
            </span>
          </div>

          {isLoadingActivity ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={18} className="animate-spin text-neon-primary" />
            </div>
          ) : (
            <div className="flex items-stretch gap-4">
              <div className="shrink-0 flex flex-col pt-0.5">
                <div className="flex flex-col items-start gap-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                      Matches
                    </span>
                    <span className="text-xl tabular-nums font-black italic tracking-tighter text-white leading-none">
                      {monthMatchCount}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                      Net pts
                    </span>
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
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col items-end justify-end pointer-events-none">
                <div className="flex flex-col gap-1.5 shrink-0" style={activityVisualSize}>
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

        {/* Social Synergies — highlight cards only (no encounter table) */}
        <section className="w-full mb-6 bg-navy-card p-4">
          <div className="flex items-end justify-between mb-3">
            <h3 className="text-sm font-black italic uppercase tracking-wider text-white">
              Social <span className="text-gray-500">Synergy</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenStats();
              }}
              className="text-[9px] font-black uppercase tracking-widest text-gray-500 inline-flex items-center gap-1 active:scale-95"
            >
              View stats
              <ChevronRight size={12} className="text-neon-primary" />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <SynergyRow
              label="Most Played"
              labelClass="text-blue-400"
              borderClass="border-l-blue-500/50"
              bgClass="from-blue-500/10 to-transparent"
              player={socialSynergies.frequentDuo}
              emptyLabel="No Data Yet"
              icon={<Users size={16} className="text-gray-600" />}
              metric="matches"
              kind="with"
              onClick={
                socialSynergies.frequentDuo
                  ? () => onPlayerClick?.(socialSynergies.frequentDuo!.user.id)
                  : undefined
              }
            />
            <SynergyRow
              label="Best Duo"
              labelClass="text-neon-primary"
              borderClass="border-l-neon-primary/50"
              bgClass="from-neon-primary/10 to-transparent"
              player={socialSynergies.duoPartner}
              emptyLabel="No Data Yet"
              icon={<Users size={16} className="text-gray-600" />}
              metric="winRate"
              kind="with"
              onClick={
                socialSynergies.duoPartner
                  ? () => onPlayerClick?.(socialSynergies.duoPartner!.user.id)
                  : undefined
              }
            />
            <SynergyRow
              label="Most Wins"
              labelClass="text-orange-500"
              borderClass="border-l-orange-500/50"
              bgClass="from-orange-500/10 to-transparent"
              player={socialSynergies.easyTarget}
              emptyLabel="No Enemies Yet"
              icon={<Swords size={16} className="text-gray-600" />}
              metric="winRate"
              kind="against"
              onClick={
                socialSynergies.easyTarget
                  ? () => onPlayerClick?.(socialSynergies.easyTarget!.user.id)
                  : undefined
              }
            />
            <SynergyRow
              label="Most Losses"
              labelClass="text-red-500"
              borderClass="border-l-red-500/50"
              bgClass="from-red-500/10 to-transparent"
              player={socialSynergies.archNemesis}
              emptyLabel="No Enemies Yet"
              icon={<Swords size={16} className="text-gray-600" />}
              metric="winRate"
              kind="against"
              metricAccent="text-red-500"
              onClick={
                socialSynergies.archNemesis
                  ? () => onPlayerClick?.(socialSynergies.archNemesis!.user.id)
                  : undefined
              }
            />
          </div>
        </section>

        {/* Danger Zone */}
        <section className="w-full mb-10 flex items-center justify-between gap-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="text-red-500/70 shrink-0" size={14} />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500/70">
                Danger Zone
              </h3>
            </div>
            <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
              Permanently purge your profile, pts, and match history.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              setIsDeleteConfirmOpen(true);
            }}
            className="shrink-0 text-[10px] font-black uppercase tracking-widest text-red-500/80 transition-all active:scale-95"
          >
            Delete
          </button>
        </section>
      </div>

      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        title="Purge Identity?"
        message="This will permanently delete your profile and rank from SmashX. This action cannot be undone."
        confirmLabel="Confirm Purge"
        isDestructive={true}
        onConfirm={() => {
          setIsDeleteConfirmOpen(false);
          onDeleteAccount();
        }}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
};

export default Profile;
