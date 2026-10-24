import React from 'react';

// Flat navy placeholder blocks with a slow pulse; sized to match the rows they stand in for.
const Block: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`sx-skeleton bg-[#001645] ${className}`} />
);

const SkeletonStyles = () => (
  <style>{`
    @keyframes sx-skeleton-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
    .sx-skeleton { animation: sx-skeleton-pulse 1.6s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) { .sx-skeleton { animation: none; } }
  `}</style>
);

export const LeaderboardRowsSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
  <div role="status" aria-label="Loading rankings">
    <SkeletonStyles />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="py-3 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Block className="w-6 h-4 shrink-0" />
          <Block className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex flex-col gap-2">
            <Block className="h-3 w-28" />
            <Block className="h-2 w-16" />
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Block className="h-3 w-8" />
          <Block className="h-3 w-8" />
          <Block className="h-3 w-10" />
          <Block className="h-4 w-12" />
        </div>
      </div>
    ))}
  </div>
);

export const LeaderboardSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-label="Loading rankings">
    <SkeletonStyles />
    <Block className="h-7 w-48" />
    <div className="flex gap-3">
      <Block className="h-8 flex-1" />
      <Block className="h-8 flex-1" />
    </div>
    <Block className="h-10 w-full" />
    <LeaderboardRowsSkeleton />
  </div>
);

export const GroupsSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-label="Loading groups">
    <SkeletonStyles />
    <div className="flex items-center justify-between">
      <Block className="h-7 w-44" />
      <Block className="h-9 w-24" />
    </div>
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-[#001645] p-4 flex items-center gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <Block className="h-4 w-36 !bg-[#002266]" />
            <Block className="h-2 w-24 !bg-[#002266]" />
          </div>
          <div className="flex -space-x-2">
            {[0, 1, 2].map(n => <Block key={n} className="w-9 h-9 rounded-full !bg-[#002266] border-2 border-[#001645]" />)}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const StatsSkeleton: React.FC = () => (
  <div className="space-y-4" role="status" aria-label="Loading stats">
    <SkeletonStyles />
    <Block className="h-40 w-full" />
    <div className="grid grid-cols-3 gap-3">
      <Block className="h-20" />
      <Block className="h-20" />
      <Block className="h-20" />
    </div>
    <Block className="h-48 w-full" />
  </div>
);
