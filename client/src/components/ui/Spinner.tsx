import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export type SpinnerSize = 'sm' | 'md' | 'lg';
export type SpinnerColor = 'brand' | 'accent' | 'white' | 'muted';

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  useLucide?: boolean;
  className?: string;
  'aria-label'?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

const colorClasses: Record<SpinnerColor, string> = {
  brand: 'border-brand-yellow/30 border-t-brand-yellow',
  accent: 'border-accent/30 border-t-accent',
  white: 'border-white/30 border-t-white',
  muted: 'border-border-subtle border-t-text-muted',
};

const lucideColorClasses: Record<SpinnerColor, string> = {
  brand: 'text-brand-yellow',
  accent: 'text-accent',
  white: 'text-white',
  muted: 'text-text-muted',
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'brand',
  useLucide = true,
  className,
  'aria-label': ariaLabel = 'Загрузка',
}) => {
  if (useLucide) {
    return (
      <Loader2
        className={cn(
          'animate-spin',
          sizeClasses[size],
          lucideColorClasses[color],
          className
        )}
        aria-label={ariaLabel}
        role="status"
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-2',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      aria-label={ariaLabel}
      role="status"
    />
  );
};
