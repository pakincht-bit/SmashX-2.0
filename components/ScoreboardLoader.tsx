import React, { useEffect, useMemo, useState } from 'react';

// LED dot-matrix panel: every cell twinkles on its own random rhythm, so it reads as "busy"
// without showing anything that could be mistaken for a real score.
const GRID = {
  sm: { cols: 12, rows: 5, cell: 8, gap: 3, pad: 8 },
  lg: { cols: 18, rows: 8, cell: 12, gap: 4, pad: 14 },
};

const FULL_CELL = 14;
const FULL_GAP = 4;

interface ScoreboardLoaderProps {
  size?: 'sm' | 'lg';
  fullPage?: boolean;
  label?: string;
  className?: string;
}

const ScoreboardLoader: React.FC<ScoreboardLoaderProps> = ({ size = 'lg', fullPage = false, label, className = '' }) => {
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));

  useEffect(() => {
    if (!fullPage) return;
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fullPage]);

  const { cols, rows, cell, gap, pad } = fullPage
    ? {
        cols: Math.ceil(viewport.w / (FULL_CELL + FULL_GAP)),
        rows: Math.ceil(viewport.h / (FULL_CELL + FULL_GAP)),
        cell: FULL_CELL,
        gap: FULL_GAP,
        pad: 0,
      }
    : GRID[size];

  const cells = useMemo(
    () =>
      Array.from({ length: cols * rows }, () => ({
        duration: 1.2 + Math.random() * 2.4,
        delay: -Math.random() * 3.6,
        peak: (0.35 + Math.random() * 0.65) * (fullPage ? 0.4 : 1),
      })),
    [cols, rows, fullPage]
  );

  const keyframes = (
    <style>{`
        @keyframes sx-led-twinkle {
          0%, 100% { opacity: 0.06; box-shadow: none; }
          50% { opacity: var(--peak); box-shadow: 0 0 6px rgba(59,130,246,calc(var(--peak) * 0.8)); }
        }
        @media (prefers-reduced-motion: reduce) { .sx-led { animation: none !important; opacity: 0.2; } }
      `}</style>
  );

  const leds = cells.map((c, i) => (
    <span
      key={i}
      className="sx-led block bg-[#3B82F6]"
      style={{
        width: cell,
        height: cell,
        opacity: 0.06,
        ['--peak' as string]: c.peak,
        animation: `sx-led-twinkle ${c.duration}s ease-in-out ${c.delay}s infinite`,
      }}
    />
  ));

  if (fullPage) {
    return (
      <div className={`fixed inset-0 bg-[#00040f] overflow-hidden ${className}`} role="status" aria-live="polite">
        {keyframes}
        <div
          className="absolute inset-0 justify-center content-center"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap }}
          aria-hidden="true"
        >
          {leds}
        </div>
        {label && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-[#000B29] px-6 py-3 text-[#3B82F6] font-black italic uppercase tracking-widest text-xs shadow-[0_0_30px_rgba(0,0,0,0.9)]">
              {label}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} role="status" aria-live="polite">
      {keyframes}

      <div
        className="bg-[#00040f] border border-[#3B82F6]/20 shadow-[0_0_30px_rgba(59,130,246,0.08)]"
        style={{
          padding: pad,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
          gap,
        }}
        aria-hidden="true"
      >
        {leds}
      </div>

      {label && (
        <span className={`${size === 'lg' ? 'mt-6' : 'mt-3'} text-gray-500 font-black uppercase tracking-widest text-[10px]`}>
          {label}
        </span>
      )}
    </div>
  );
};

export default ScoreboardLoader;
