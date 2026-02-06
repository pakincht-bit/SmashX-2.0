
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Zap } from 'lucide-react';
import { triggerHaptic } from '../utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

const THRESHOLD = 80;

const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, className = "" }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const hapticTriggered = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Check if the current element is at the top of its scroll
    const target = e.currentTarget as HTMLElement;
    if (target.scrollTop === 0) {
      startY.current = e.touches[0].pageY;
      isDragging.current = true;
      hapticTriggered.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || isRefreshing) return;

    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.current;

    // Only allow pulling down
    if (diff > 0) {
      // Add resistance to the pull
      const distance = Math.pow(diff, 0.85);
      setPullDistance(distance);

      // Trigger haptic when crossing the threshold
      if (distance > THRESHOLD && !hapticTriggered.current) {
        triggerHaptic('medium');
        hapticTriggered.current = true;
      } else if (distance <= THRESHOLD && hapticTriggered.current) {
        hapticTriggered.current = false;
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (pullDistance > THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
        triggerHaptic('success');
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div 
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refresh Indicator */}
      <div 
        className="absolute left-0 right-0 flex flex-col items-center justify-center overflow-hidden pointer-events-none z-[100]"
        style={{ 
          height: `${pullDistance}px`,
          opacity: Math.min(pullDistance / THRESHOLD, 1),
          transition: isDragging.current ? 'none' : 'height 0.3s ease, opacity 0.3s ease'
        }}
      >
        <div className="flex flex-col items-center gap-2">
            <div className={`relative ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullDistance * 2}deg)` }}>
                <div className="w-10 h-10 rounded-full border-2 border-[#00FF41]/20 flex items-center justify-center">
                    <Zap size={20} className={`${pullDistance > THRESHOLD ? 'text-[#00FF41]' : 'text-gray-600'} transition-colors shadow-[0_0_10px_rgba(0,255,65,0.5)]`} />
                </div>
                {/* Scanning ring effect */}
                <div className="absolute inset-0 border-2 border-t-[#00FF41] rounded-full animate-pulse opacity-50"></div>
            </div>
            <span className={`text-[8px] font-black uppercase tracking-[0.3em] italic transition-colors ${pullDistance > THRESHOLD ? 'text-[#00FF41]' : 'text-gray-500'}`}>
                {isRefreshing ? 'Syncing Arena...' : (pullDistance > THRESHOLD ? 'Release to Sync' : 'Pull to Sync')}
            </span>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="h-full"
        style={{ 
          transform: `translateY(${isRefreshing ? THRESHOLD : pullDistance}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
