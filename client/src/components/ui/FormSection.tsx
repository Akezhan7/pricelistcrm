import React from 'react';
import { cn } from '../../utils/cn';

export interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'inset' | 'accent';
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  children,
  className,
  variant = 'inset',
}) => (
  <div
    className={cn(
      'space-y-4 p-4 rounded-xl',
      variant === 'inset'
        ? 'bg-surface-inset border border-border-subtle'
        : 'bg-surface-accent border border-brand-yellow/20',
      className
    )}
  >
    <h3 className="text-overline text-text-muted tracking-wider">{title}</h3>
    {children}
  </div>
);
