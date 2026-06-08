import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-14 px-6',
        className
      )}
    >
      {Icon && (
        <div className="mb-5 rounded-xl bg-surface-inset p-4">
          <Icon className="h-8 w-8 text-text-muted" strokeWidth={1.5} aria-hidden />
        </div>
      )}
      <h3 className="text-section-title text-brand-black">{title}</h3>
      {description && (
        <p className="mt-2 text-body text-text-muted max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};
