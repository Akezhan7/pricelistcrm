import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export type AlertVariant = 'error' | 'warning' | 'info' | 'success';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  icon?: LucideIcon | false;
  className?: string;
  children: React.ReactNode;
}

const variantConfig: Record<
  AlertVariant,
  { container: string; icon: LucideIcon; iconClass: string }
> = {
  error: {
    container: 'bg-danger-light/80 border-danger/15 text-danger-dark',
    icon: AlertCircle,
    iconClass: 'text-danger',
  },
  warning: {
    container: 'bg-warning-light border-warning/15 text-warning-dark',
    icon: AlertTriangle,
    iconClass: 'text-warning',
  },
  info: {
    container: 'bg-info-light/80 border-info/15 text-info-dark',
    icon: Info,
    iconClass: 'text-info',
  },
  success: {
    container: 'bg-success-light/80 border-success/15 text-success-dark',
    icon: CheckCircle,
    iconClass: 'text-success',
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  icon,
  className,
  children,
}) => {
  const config = variantConfig[variant];
  const Icon = icon === false ? null : icon ?? config.icon;

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-xl border px-4 py-3',
        config.container,
        className
      )}
    >
      {Icon && (
        <Icon className={cn('h-4 w-4 flex-shrink-0 mt-0.5', config.iconClass)} aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        {title && (
          <p className="text-body-medium text-brand-black mb-0.5">{title}</p>
        )}
        <div className="text-body text-brand-black/80 leading-relaxed">{children}</div>
      </div>
    </div>
  );
};
