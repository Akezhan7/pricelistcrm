import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Spinner } from './Spinner';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'destructive'
  | 'ghost'
  | 'outline';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-yellow text-brand-black font-semibold hover:bg-brand-yellow-hover active:scale-[0.98] focus-visible:ring-brand-yellow',
  secondary:
    'bg-brand-white text-brand-black font-medium border border-border-subtle hover:bg-surface-inset active:scale-[0.98] focus-visible:ring-brand-yellow',
  accent:
    'bg-brand-yellow text-brand-black font-semibold hover:bg-brand-yellow-hover active:scale-[0.98] focus-visible:ring-brand-yellow',
  destructive:
    'bg-danger text-white font-semibold hover:bg-danger-dark active:scale-[0.98] focus-visible:ring-danger/40',
  ghost:
    'text-brand-black font-medium hover:bg-surface-inset active:scale-[0.98] focus-visible:ring-brand-yellow',
  outline:
    'border border-border-subtle text-brand-black font-medium bg-brand-white hover:bg-surface-inset active:scale-[0.98] focus-visible:ring-brand-yellow',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 min-h-8 px-3 text-caption gap-1.5 rounded-lg',
  md: 'h-10 min-h-10 px-4 text-body gap-2 rounded-lg',
  lg: 'h-11 min-h-11 px-5 text-body gap-2.5 rounded-lg',
};

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-4 w-4',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      fullWidth = false,
      type = 'button',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center transition-colors duration-200 ease-product',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <Spinner
            size={size === 'lg' ? 'md' : 'sm'}
            color={
              variant === 'primary' || variant === 'accent'
                ? 'brand'
                : variant === 'destructive'
                  ? 'white'
                  : 'muted'
            }
          />
        ) : (
          LeftIcon && <LeftIcon className={iconSizeClasses[size]} aria-hidden />
        )}
        {children}
        {!loading && RightIcon && <RightIcon className={iconSizeClasses[size]} aria-hidden />}
      </button>
    );
  }
);

Button.displayName = 'Button';
