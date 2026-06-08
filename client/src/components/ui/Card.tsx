import React from 'react';
import { cn } from '../../utils/cn';

export type CardVariant = 'default' | 'elevated' | 'inset' | 'interactive';

export interface CardProps {
  className?: string;
  children: React.ReactNode;
  variant?: CardVariant;
  selected?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-surface-base border border-border-subtle',
  elevated: 'bg-surface-elevated border border-border-subtle shadow-sm',
  inset: 'bg-surface-inset border border-transparent',
  interactive:
    'bg-surface-elevated border border-border-subtle shadow-sm cursor-pointer transition-colors duration-200 ease-product hover:shadow-md hover:-translate-y-px active:scale-[0.99] active:translate-y-0 active:shadow-sm',
};

export const Card: React.FC<CardProps> = ({
  className,
  children,
  variant = 'elevated',
  selected = false,
}) => {
  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden',
        variantClasses[variant],
        selected && 'ring-2 ring-brand-yellow ring-offset-2 bg-surface-accent',
        className
      )}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
  inset?: boolean;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  className,
  children,
  inset = false,
}) => {
  return (
    <div
      className={cn(
        'px-4 py-3.5 md:px-5',
        inset
          ? 'bg-transparent'
          : 'border-b border-border-subtle bg-surface-base',
        className
      )}
    >
      {children}
    </div>
  );
};

export interface CardBodyProps {
  className?: string;
  children: React.ReactNode;
  compact?: boolean;
}

export const CardBody: React.FC<CardBodyProps> = ({
  className,
  children,
  compact = false,
}) => {
  return (
    <div className={cn(compact ? 'p-3' : 'p-4 md:p-5', className)}>{children}</div>
  );
};

export interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({ className, children }) => {
  return (
    <h3 className={cn('text-card-title text-brand-black', className)}>{children}</h3>
  );
};

export interface CardDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  className,
  children,
}) => {
  return (
    <p className={cn('text-caption text-text-muted mt-0.5', className)}>{children}</p>
  );
};
