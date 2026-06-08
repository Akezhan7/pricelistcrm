import React from 'react';
import { cn } from '../../utils/cn';

export interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ active = false, className, type = 'button', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3.5 py-2 text-caption font-medium',
        'transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2',
        active
          ? 'border-brand-yellow/40 bg-brand-yellow/10 text-brand-black'
          : 'border-border-subtle bg-brand-white text-text-muted hover:bg-surface-inset hover:text-brand-black',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

FilterChip.displayName = 'FilterChip';
