import React from 'react';
import { cn } from '../../utils/cn';
import type { StatusBadgeClasses } from '../../theme/statusColors';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'outline';

export interface BadgeProps {
  variant?: BadgeVariant;
  statusClass?: StatusBadgeClasses;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-inset text-brand-black',
  success: 'bg-success-light text-success-dark',
  danger: 'bg-danger-light text-danger-dark',
  warning: 'bg-warning-light text-warning-dark',
  info: 'bg-info-light text-info-dark',
  outline: 'bg-transparent text-text-muted border border-border-subtle',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  statusClass,
  className,
  children,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium whitespace-nowrap',
        statusClass ?? variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
