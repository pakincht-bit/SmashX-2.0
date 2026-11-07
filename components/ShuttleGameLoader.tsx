import React, { useEffect, useRef, useState } from 'react';
import { triggerHaptic } from '../utils';
import { submitKeepItUpScore } from '../services/keepItUpScores';

// "Keep it up" mini game shown while the app loads: tap the shuttle to knock it back up.
// Physics runs in a rAF loop on refs and writes transforms directly, so React only
// re-renders when the score changes.

const BEST_KEY = 'sx-shuttle-best';
const GRAVITY = 1500; // px/s²
const HIT_SPEED = 720; // upward px/s on a hit
const HIT_RADIUS = 52; // generous touch target around the shuttle centre
const SHUTTLE_SIZE = 44;

const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};

const writeBest = (best: number) => {
  try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* storage unavailable */ }
};

// The server keeps each player's best; clearing on logout stops the next player on this device inheriting it
export const clearLocalBest = () => {
  try { localStorage.removeItem(BEST_KEY); } catch { /* storage unavailable */ }
};

const Shuttlecock: React.FC = () => (
  // Cork at the bottom, feathers flaring up — rotation makes the cork lead the direction of travel
  <svg viewBox="0 0 44 44" width={SHUTTLE_SIZE} height={SHUTTLE_SIZE} aria-hidden="true">
    <path d="M8 4 L36 4 L27 30 L17 30 Z" fill="rgba(255,255,255,0.92)" />
    <path d="M14 4 L19 30 M22 4 L22 30 M30 4 L25 30" stroke="rgba(0,11,41,0.35)" strokeWidth="1.2" />
    <path d="M10.5 11 L33.5 11 M13 19 L31 19" stroke="rgba(0,255,65,0.55)" strokeWidth="1.4" />
    <rect x="16" y="29" width="12" height="3" fill="#00FF41" />
    <path d="M16 32 h12 v2 a6 6 0 0 1 -12 0 Z" fill="#00FF41" />
  </svg>
);

interface ShuttleGameLoaderProps {
  label?: string;
  className?: string;
}

const ShuttleGameLoader: React.FC<ShuttleGameLoaderProps> = ({ label, className = '' }) => {
  const fieldRef = useRef<HTMLDivElement>(null);
  const shuttleRef = useRef<HTMLDivElement>(null);
  const state = useRef({ x: 0, y: 0, vx: 0, vy: 0, angle: 0, playing: false, t: 0 });

  const [count, setCount] = useState(0);
  const [best, setBest] = useState(readBest);
  const [dropped, setDropped] = useState<number | null>(null);
  const countRef = useRef(0);

  // Sync both ways on open: uploads a best this device holds, restores one earned elsewhere
  useEffect(() => {
    const localBest = readBest();
    void submitKeepItUpScore(localBest).then(serverBest => {
      if (serverBest !== null && serverBest > localBest) {
        writeBest(serverBest);
        setBest(serverBest);
      }
    });
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const field = () => fieldRef.current?.getBoundingClientRect();

    // Start hovering in the middle of the field
    const f0 = field();
    if (f0) {
      state.current.x = f0.width / 2;
      state.current.y = f0.height * 0.45;
    }

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;
      const s = state.current;
      const f = field();

      if (f) {
        if (s.playing) {
          s.vy += GRAVITY * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;

          // Side walls
          const half = SHUTTLE_SIZE / 2;
          if (s.x < half) { s.x = half; s.vx = Math.abs(s.vx) * 0.8; }
          if (s.x > f.width - half) { s.x = f.width - half; s.vx = -Math.abs(s.vx) * 0.8; }
          // Ceiling
          if (s.y < half) { s.y = half; s.vy = Math.abs(s.vy) * 0.3; }

          // Floor: rally over
          if (s.y > f.height - half) {
            s.playing = false;
            s.y = f.height * 0.45;
            s.x = f.width / 2;
            s.vx = 0;
            s.vy = 0;
            const final = countRef.current;
            countRef.current = 0;
            setCount(0);
            if (final > 0) {
              setDropped(final);
              triggerHaptic('medium');
              if (final > readBest()) {
                writeBest(final);
                setBest(final);
                void submitKeepItUpScore(final);
              }
            }
          }

          // Cork leads the direction of travel; ease the rotation so it doesn't snap
          const target = (Math.atan2(s.vy, s.vx) * 180) / Math.PI - 90;
          let diff = ((target - s.angle + 540) % 360) - 180;
          s.angle += diff * Math.min(1, dt * 10);
        } else {
          // Idle hover: gentle bob, cork down
          s.t += dt;
          s.angle += (0 - s.angle) * Math.min(1, dt * 6);
        }

        const bob = s.playing ? 0 : Math.sin(s.t * 2.4) * 6;
        if (shuttleRef.current) {
          shuttleRef.current.style.transform =
            `translate(${s.x - SHUTTLE_SIZE / 2}px, ${s.y - SHUTTLE_SIZE / 2 + bob}px) rotate(${s.angle}deg)`;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const f = fieldRef.current?.getBoundingClientRect();
    if (!f) return;
    const s = state.current;
    const px = e.clientX - f.left;
    const py = e.clientY - f.top;
    if (Math.hypot(px - s.x, py - s.y) > HIT_RADIUS) return;

    // Hitting off-centre pushes the shuttle the other way, like a racket face
    s.vx = Math.max(-260, Math.min(260, (s.x - px) * 8 + (Math.random() - 0.5) * 120));
    s.vy = -HIT_SPEED;
    s.playing = true;
    setDropped(null);
    countRef.current += 1;
    setCount(countRef.current);
    triggerHaptic('light');
  };

  const idle = count === 0;

  return (
    <div className={`flex flex-col items-center w-full ${className}`} role="status" aria-live="polite">
      <div className="h-16 flex flex-col items-center justify-end select-none">
        {idle ? (
          dropped !== null ? (
            <>
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Dropped at</span>
              <span className="text-4xl font-black italic tracking-tighter text-white tabular-nums leading-none">{dropped}</span>
            </>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tap the shuttle</span>
          )
        ) : (
          <span className="text-5xl font-black italic tracking-tighter text-[#00FF41] tabular-nums leading-none drop-shadow-[0_0_16px_rgba(0,255,65,0.4)]">
            {count}
          </span>
        )}
      </div>
      <span className="mt-1 text-[9px] font-black uppercase tracking-widest text-gray-600 tabular-nums select-none">
        Best {best}
      </span>

      <div
        ref={fieldRef}
        onPointerDown={handlePointerDown}
        className="relative w-full max-w-sm h-[min(52vh,380px)] mt-2 touch-none select-none cursor-pointer"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div ref={shuttleRef} className="absolute left-0 top-0 will-change-transform pointer-events-none">
          <Shuttlecock />
        </div>
        {/* Court floor */}
        <div className="absolute left-4 right-4 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00FF41]/40 to-transparent" />
      </div>

      {label && (
        <span className="mt-5 text-gray-500 font-black uppercase tracking-widest text-[10px] select-none">{label}</span>
      )}
    </div>
  );
};

export default ShuttleGameLoader;
