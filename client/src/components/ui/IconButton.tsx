import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export type IconButtonVariant = 'default' | 'ghost' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  title: string;
}

const variantClasses: Record<IconButtonVariant, string> = {
  default:
    'bg-surface-inset text-brand-black hover:bg-surface-inset/80 focus-visible:ring-brand-yellow',
  ghost:
    'text-text-muted hover:bg-surface-inset hover:text-brand-black focus-visible:ring-brand-yellow',
  danger:
    'text-danger hover:bg-danger-light focus-visible:ring-danger/30',
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8 min-h-8 min-w-8',
  md: 'h-11 w-11 min-h-11 min-w-11',
  lg: 'h-12 w-12 min-h-12 min-w-12',
};

const iconSizeClasses: Record<IconButtonSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      variant = 'ghost',
      size = 'md',
      title,
      className,
      type = 'button',
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        aria-label={title}
        title={title}
        className={cn(
          'inline-flex items-center justify-center rounded-lg transition-colors duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <Icon className={iconSizeClasses[size]} strokeWidth={1.75} aria-hidden />
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
