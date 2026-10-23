import React, { useMemo } from 'react';
import { getAvatarColor } from '../utils';

// Fallback roster used before real player avatars have loaded (same seeds as the splash screen)
const FALLBACK_AVATARS = [
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Alexander',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Jessica',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Ryan',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Sarah',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Christian',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Sofia',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Brian',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Amelia',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Leo',
];

interface Ring {
  diameter: number;
  count: number;
  avatar: number;
  duration: number;
  reverse: boolean;
  color: string; // r,g,b
  offset: number; // starting angle in degrees so avatars don't line up across rings
}

const RINGS: Record<'sm' | 'lg', Ring[]> = {
  sm: [
    { diameter: 56, count: 2, avatar: 16, duration: 3.2, reverse: false, color: '0,255,65', offset: 0 },
    { diameter: 96, count: 3, avatar: 18, duration: 5, reverse: true, color: '59,130,246', offset: 30 },
  ],
  lg: [
    { diameter: 92, count: 2, avatar: 22, duration: 4, reverse: false, color: '0,255,65', offset: 0 },
    { diameter: 156, count: 3, avatar: 26, duration: 6.5, reverse: true, color: '59,130,246', offset: 40 },
    { diameter: 224, count: 4, avatar: 30, duration: 10, reverse: false, color: '168,85,247', offset: 15 },
  ],
};

interface OrbitLoaderProps {
  size?: 'sm' | 'lg';
  label?: string;
  avatars?: string[];
  className?: string;
}

const OrbitLoader: React.FC<OrbitLoaderProps> = ({ size = 'lg', label, avatars, className = '' }) => {
  const rings = RINGS[size];
  const box = rings[rings.length - 1].diameter + rings[rings.length - 1].avatar + 8;

  const pool = useMemo(() => {
    const source = avatars && avatars.length > 0 ? avatars : FALLBACK_AVATARS;
    const needed = rings.reduce((n, r) => n + r.count, 0);
    return Array.from({ length: needed }, (_, i) => source[i % source.length]);
  }, [avatars, rings]);

  let poolIndex = 0;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} role="status" aria-live="polite">
      <style>{`
        @keyframes sx-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes sx-orbit-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes sx-core { 0%, 100% { transform: scale(0.85); opacity: 0.7; } 50% { transform: scale(1.1); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .sx-orbit-spin, .sx-orbit-core { animation: none !important; }
        }
      `}</style>

      <div className="relative" style={{ width: box, height: box }} aria-hidden="true">
        {/* Core */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="sx-orbit-core rounded-full bg-[#00FF41] shadow-[0_0_24px_rgba(0,255,65,0.7)]"
            style={{ width: size === 'lg' ? 14 : 8, height: size === 'lg' ? 14 : 8, animation: 'sx-core 1.6s ease-in-out infinite' }}
          />
        </div>

        {rings.map((ring, ringIdx) => {
          const spin = `${ring.reverse ? 'sx-orbit-rev' : 'sx-orbit'} ${ring.duration}s linear infinite`;
          const counter = `${ring.reverse ? 'sx-orbit' : 'sx-orbit-rev'} ${ring.duration}s linear infinite`;
          const radius = ring.diameter / 2;

          return (
            <div
              key={ringIdx}
              className="sx-orbit-spin absolute rounded-full"
              style={{
                width: ring.diameter,
                height: ring.diameter,
                left: (box - ring.diameter) / 2,
                top: (box - ring.diameter) / 2,
                border: `1px solid rgba(${ring.color},0.18)`,
                boxShadow: `0 0 24px rgba(${ring.color},0.06)`,
                animation: spin,
              }}
            >
              {Array.from({ length: ring.count }).map((_, i) => {
                const angle = ((360 / ring.count) * i + ring.offset) * (Math.PI / 180);
                const src = pool[poolIndex++];
                return (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      width: ring.avatar,
                      height: ring.avatar,
                      left: radius + radius * Math.cos(angle) - ring.avatar / 2,
                      top: radius + radius * Math.sin(angle) - ring.avatar / 2,
                    }}
                  >
                    {/* Counter-rotate so faces stay upright while the ring spins */}
                    <div className="sx-orbit-spin w-full h-full" style={{ animation: counter }}>
                      <img
                        src={src}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                        style={{
                          backgroundColor: getAvatarColor(src),
                          border: `1.5px solid rgba(${ring.color},0.5)`,
                          boxShadow: `0 0 10px rgba(${ring.color},0.25)`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {label && (
        <span className={`${size === 'lg' ? 'mt-6' : 'mt-3'} text-gray-500 font-black uppercase tracking-widest text-[10px]`}>
          {label}
        </span>
      )}
    </div>
  );
};

export default OrbitLoader;
