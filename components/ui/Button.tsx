import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'outline' | 'danger' | 'ghost' | 'status-joined';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
 variant?: ButtonVariant;
 size?: ButtonSize;
 isLoading?: boolean;
 skewed?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
 ({ className = '', variant = 'primary', size = 'md', isLoading = false, skewed = false, children, disabled, ...props }, ref) => {
 // Default to true for primary, otherwise let skewed prop dictate
 const isSkewed = skewed || variant === 'primary' || variant === 'status-joined';
 
 const baseClasses = `relative flex items-center justify-center transition-all duration-300 active:scale-95 group font-black uppercase tracking-widest ${
 isSkewed ? '-skew-x-12 rounded-none overflow-hidden' : 'rounded-none'
 }`;
 
 // Size adjustments
 const sizeClasses = {
 sm: 'px-3 py-1.5 text-[10px]',
 md: 'px-5 py-3 text-xs',
 lg: 'px-8 py-4 text-sm'
 };

 // Variant specific styling
 const variantClasses = {
 primary: 'bg-neon-primary text-navy-base border border-neon-primary shadow-glow-primary ',
 outline: 'bg-transparent border border-navy-border text-gray-400 ',
 danger: 'bg-red-500/10 border border-red-500/40 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)] ',
 ghost: 'bg-transparent text-gray-400 ',
 'status-joined': 'bg-blue-500/10 border border-blue-500/30 text-blue-400 ' // specific to SessionCard logic
 };

 const disabledClasses = (disabled || isLoading) 
 ? 'opacity-70 cursor-not-allowed transition-none active:scale-100 placeholder:pointer-events-none filter grayscale-[0.2]' 
 : '';

 // If button container is skewed, we must reverse-skew the inner content
 const innerClasses = `flex items-center justify-center gap-2 w-full ${isSkewed ? 'skew-x-12' : ''}`;

 return (
 <button
 ref={ref}
 disabled={disabled || isLoading}
 className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabledClasses} ${className}`}
 {...props}
 >
 <span className={innerClasses}>
 {isLoading && <Loader2 size={16} className="animate-spin shrink-0" />}
 {children}
 </span>
 </button>
 );
 }
);

Button.displayName = 'Button';

export { Button };
