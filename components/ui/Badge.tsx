import React from 'react';

export type BadgeVariant = 'default' | 'live' | 'full' | 'finished' | 'processing';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  skewed?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', skewed = true, children, ...props }, ref) => {
    
    const baseClasses = `px-2 py-1.5 flex items-center justify-center border transition-all ${
      skewed ? '-skew-x-12 rounded-none' : 'rounded-none'
    }`;
    
    const variantClasses = {
      default: 'bg-navy-card border-navy-border text-white',
      live: 'bg-neon-primary/10 border-neon-primary/30 text-neon-primary shadow-[0_0_10px_rgba(0,255,65,0.2)]',
      full: 'bg-red-500/10 border-red-500/30 text-red-500',
      finished: 'bg-gray-900/50 border-gray-700 text-gray-400',
      processing: 'bg-gray-800 border-gray-600 text-gray-400 cursor-wait'
    };

    const innerClasses = `flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${
      skewed ? 'skew-x-12' : ''
    }`;

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        <span className={innerClasses}>
          {children}
        </span>
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
