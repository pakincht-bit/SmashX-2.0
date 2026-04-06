import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
 interactive?: boolean;
 variant?: 'solid' | 'struct';
 children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
 ({ className = '', variant = 'solid', interactive = false, children, ...props }, ref) => {
 
 const baseClasses = `relative border rounded-none overflow-hidden transition-all duration-300`;
 
 const variantClasses = {
 solid: 'bg-navy-card border-navy-border',
 struct: 'bg-navy-struct border-navy-border shadow-sm'
 };

 const interactiveClasses = interactive
 ? 'cursor-pointer active:scale-[0.99] shadow-deep-card' 
 : '';

 return (
 <div
 ref={ref}
 className={`${baseClasses} ${variantClasses[variant]} ${interactiveClasses} ${className}`}
 {...props}
 >
 {children}
 </div>
 );
 }
);

Card.displayName = 'Card';

export { Card };
