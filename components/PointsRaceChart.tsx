import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { MatchResult, User } from '../types';
import { getAvatarColor, getPlayerMatchDelta, triggerHaptic } from '../utils';

// Cumulative points across a session for the viewer, over a faint backdrop of the other players
// or against up to four chosen opponents.
// Both lines race in from the start with the player's avatar on the tip.

const HEIGHT = 230;
const PAD = { top: 14, right: 24, bottom: 12, left: 16 };
const AVATAR_RADIUS = 9;
const UPCOMING_LINE_OPACITY = 0.3; // the part of a line after the scrubbed match
const RACE_DURATION = 1800; // ms

const LINE_COLOR = '#00FF41';
const NEGATIVE_COLOR = '#EF4444';
// One color per opponent slot, in slot order; checked for colorblind separation against LINE_COLOR
export const OPPONENT_COLORS = ['#60A5FA', '#FB923C', '#F472B6', '#FFFFFF'];
export const EMPTY_OPPONENT_SLOTS: (string | null)[] = [null, null, null, null];
const ZERO_COLOR = 'rgba(255, 255, 255, 0.22)';
const FIELD_COLOR = 'rgba(148, 163, 184, 0.16)';

const firstName = (user: User) => user.name.split(' ')[0];
const formatDelta = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

interface Player {
  id: string;
  user: User;
  values: number[];
  final: number;
}

interface PointsRaceChartProps {
  matches: MatchResult[];
  usersMap: Map<string, User>;
  currentUserId: string;
  /** Called with the match being scrubbed to, or null when back at the end of the session. */
  onScrub?: (matchCount: number | null) => void;
  /** Called with the followed player first, then any opponents, each with their line color. */
  onVersusChange?: (players: { id: string; color: string }[]) => void;
  /** Slot index = line color. A player keeps their slot while others come and go. */
  opponentSlots?: (string | null)[];
  isPickingOpponents?: boolean;
  onTogglePicking?: () => void;
}

const PointsRaceChart: React.FC<PointsRaceChartProps> = ({ matches, usersMap, currentUserId, onScrub, onVersusChange, opponentSlots = EMPTY_OPPONENT_SLOTS, isPickingOpponents = false, onTogglePicking }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { onScrub?.(hoverIndex); }, [hoverIndex, onScrub]);
  useEffect(() => () => onScrub?.(null), [onScrub]);

  // series[n].values[i] = player's running total after match i (values[0] is the start, always 0)
  const series = useMemo(() => {
    const ids = [...new Set(matches.flatMap(m => [...m.team1Ids, ...m.team2Ids]))].filter(id => usersMap.has(id));
    return ids
      .map(id => {
        let total = 0;
        const values = [0, ...matches.map(match => {
          if (match.team1Ids.includes(id) || match.team2Ids.includes(id)) total += getPlayerMatchDelta(match, id);
          return total;
        })];
        return { id, user: usersMap.get(id)!, values, final: total };
      })
      .sort((a, b) => b.final - a.final || a.user.name.localeCompare(b.user.name));
  }, [matches, usersMap]);

  const focus = series.find(s => s.id === currentUserId) ?? null;
  const opponents = opponentSlots.flatMap((id, slot) => {
    const player = series.find(s => s.id === id && s.id !== focus?.id);
    return player ? [{ player, color: OPPONENT_COLORS[slot], slot }] : [];
  });
  const focusId = focus?.id ?? null;
  const opponentKey = opponents.map(o => o.player.id).join();
  const hasWidth = width > 0;

  useEffect(() => {
    if (!onVersusChange) return;
    const versus = opponents.map(o => ({ id: o.player.id, color: o.color }));
    onVersusChange(focusId ? [{ id: focusId, color: LINE_COLOR }, ...versus] : []);
    return () => onVersusChange([]);
    // opponentKey stands in for the opponents array, which is rebuilt on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, opponentKey, onVersusChange]);

  useEffect(() => {
    if (!hasWidth || (!focusId && !opponentKey)) return;
    // Picks show instantly while choosing; the race replays once when they're done
    if (isPickingOpponents || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1);
      return;
    }
    setProgress(0);
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / RACE_DURATION);
      setProgress(easeInOut(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [hasWidth, focusId, opponentKey, isPickingOpponents]);

  if (series.length === 0) return null;

  // Everyone is a faint backdrop until opponents narrow the chart down.
  // The scale fits whoever is drawn, so all visible lines are comparable.
  const fieldPlayers = opponents.length > 0 ? [] : series.filter(s => s.id !== focusId);
  const shownValues = [...(focus?.values ?? []), ...opponents.flatMap(o => o.player.values), ...fieldPlayers.flatMap(s => s.values)];
  const yMin = Math.min(0, ...shownValues);
  const yMax = Math.max(Math.max(0, ...shownValues), yMin + 1);

  const plotRight = Math.max(width - PAD.right, PAD.left + 1);
  const plotBottom = HEIGHT - PAD.bottom;
  const toX = (i: number) => PAD.left + (i / matches.length) * (plotRight - PAD.left);
  const toY = (v: number) => plotBottom - ((v - yMin) / (yMax - yMin)) * (plotBottom - PAD.top);

  // Tip of a racing line: everything up to the current match, plus a slice into the next one.
  // Scrubbing takes over from the race, so lines and avatars stop at the scrubbed match.
  const position = hoverIndex ?? progress * matches.length;
  const reached = Math.floor(position);
  const tipValueOf = (values: number[]) =>
    values[reached] + ((values[Math.min(reached + 1, matches.length)] - values[reached]) * (position - reached));
  const racedPoints = (values: number[]) =>
    [...values.slice(0, reached + 1).map((v, i) => `${toX(i)},${toY(v)}`), `${toX(position)},${toY(tipValueOf(values))}`].join(' ');

  const upcomingPoints = (values: number[]) =>
    [`${toX(position)},${toY(tipValueOf(values))}`, ...values.slice(reached + 1).map((v, i) => `${toX(reached + 1 + i)},${toY(v)}`)].join(' ');

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const left = e.currentTarget.getBoundingClientRect().left;
    const ratio = (e.clientX - left - PAD.left) / (plotRight - PAD.left);
    const index = Math.round(Math.min(1, Math.max(0, ratio)) * matches.length);
    setHoverIndex(index === 0 ? null : index);
  };

  // Red only applies solo: in a comparison each line's single color is what identifies the player
  const belowZeroColor = opponents.length > 0 ? LINE_COLOR : NEGATIVE_COLOR;

  const renderTip = (player: Player, ringColor: string, index: number) => {
    const tipX = toX(position);
    const tipY = toY(tipValueOf(player.values));
    return (
      <g>
        <clipPath id={`points-race-avatar-${index}`}>
          <circle cx={tipX} cy={tipY} r={AVATAR_RADIUS} />
        </clipPath>
        <circle cx={tipX} cy={tipY} r={AVATAR_RADIUS + 1.5} fill={getAvatarColor(player.user.avatar)} stroke={ringColor} strokeWidth={1.5} />
        <image
          href={player.user.avatar}
          x={tipX - AVATAR_RADIUS}
          y={tipY - AVATAR_RADIUS}
          width={AVATAR_RADIUS * 2}
          height={AVATAR_RADIUS * 2}
          clipPath={`url(#points-race-avatar-${index})`}
          preserveAspectRatio="xMidYMid slice"
        />
      </g>
    );
  };

  return (
    <div>
      <div ref={containerRef} className="relative px-0 select-none" style={{ height: HEIGHT }}>
        {onTogglePicking && (
          <button
            type="button"
            aria-pressed={isPickingOpponents}
            onClick={() => { triggerHaptic('light'); onTogglePicking(); }}
            className={`absolute z-10 left-4 sm:left-6 bottom-1 flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black italic uppercase tracking-widest -skew-x-12 rounded-none active:scale-95 transition-transform ${isPickingOpponents ? 'bg-[#00FF41] text-[#000B29]' : 'bg-[#001645] text-gray-300'}`}
          >
            <span className="flex items-center gap-1.5 skew-x-12">
              {isPickingOpponents ? `Done · ${opponents.length}/${OPPONENT_COLORS.length}` : <><Users size={12} /> Compare</>}
            </span>
          </button>
        )}
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={focus
              ? `Points across ${matches.length} matches. ${firstName(focus.user)} finished at ${formatDelta(focus.final)}.${opponents.map(o => ` ${firstName(o.player.user)} finished at ${formatDelta(o.player.final)}.`).join('')}`
              : `Points for ${series.length} players across ${matches.length} matches.`}
            onPointerDown={e => {
              // Keeps the drag alive if a finger slides off the chart
              e.currentTarget.setPointerCapture(e.pointerId);
              handlePointer(e);
            }}
            onPointerMove={e => { if (e.pointerType === 'mouse' || e.buttons > 0) handlePointer(e); }}
            onPointerUp={e => { if (e.pointerType !== 'mouse') setHoverIndex(null); }}
            onPointerCancel={() => setHoverIndex(null)}
            onPointerLeave={e => { if (e.pointerType === 'mouse') setHoverIndex(null); }}
            style={{ touchAction: 'pan-y' }}
          >
            <defs>
              {/* One line drawn twice, each copy clipped to its side of 0, so it changes color exactly at the crossing */}
              <clipPath id="points-race-above-zero">
                <rect x={0} y={0} width={width} height={toY(0)} />
              </clipPath>
              <clipPath id="points-race-below-zero">
                <rect x={0} y={toY(0)} width={width} height={HEIGHT - toY(0)} />
              </clipPath>
            </defs>

            <line x1={PAD.left} x2={plotRight} y1={toY(0)} y2={toY(0)} stroke={ZERO_COLOR} strokeWidth={1} />

            {fieldPlayers.map(s => (
              <polyline key={s.id} points={s.values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')} fill="none" stroke={FIELD_COLOR} strokeWidth={1} strokeLinejoin="round" strokeLinecap="round" />
            ))}

            {hoverIndex !== null && (
              <line x1={toX(hoverIndex)} x2={toX(hoverIndex)} y1={PAD.top} y2={plotBottom} stroke={ZERO_COLOR} strokeWidth={1} />
            )}

            {opponents.map(({ player, color, slot }) => (
              <g key={player.id}>
                {hoverIndex !== null && (
                  <polyline points={upcomingPoints(player.values)} fill="none" stroke={color} strokeOpacity={UPCOMING_LINE_OPACITY} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                )}
                <polyline points={racedPoints(player.values)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {renderTip(player, color, slot + 1)}
              </g>
            ))}

            {focus && (
              <>
                {hoverIndex !== null && (
                  <>
                    <polyline points={upcomingPoints(focus.values)} clipPath="url(#points-race-above-zero)" fill="none" stroke={LINE_COLOR} strokeOpacity={UPCOMING_LINE_OPACITY} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                    <polyline points={upcomingPoints(focus.values)} clipPath="url(#points-race-below-zero)" fill="none" stroke={belowZeroColor} strokeOpacity={UPCOMING_LINE_OPACITY} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                  </>
                )}
                <polyline points={racedPoints(focus.values)} clipPath="url(#points-race-above-zero)" fill="none" stroke={LINE_COLOR} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                <polyline points={racedPoints(focus.values)} clipPath="url(#points-race-below-zero)" fill="none" stroke={belowZeroColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {renderTip(focus, tipValueOf(focus.values) < 0 ? belowZeroColor : LINE_COLOR, 0)}
              </>
            )}
          </svg>
        )}
      </div>
    </div>
  );
};

export default PointsRaceChart;
