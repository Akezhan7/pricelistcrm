import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

export interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const variantConfig: Record<
  ToastVariant,
  { container: string; icon: React.ElementType; iconClass: string }
> = {
  success: {
    container: 'bg-brand-white border-border-subtle shadow-sm',
    icon: CheckCircle,
    iconClass: 'text-success',
  },
  error: {
    container: 'bg-brand-white border-danger/20 shadow-sm',
    icon: AlertCircle,
    iconClass: 'text-danger',
  },
  info: {
    container: 'bg-brand-white border-info/20 shadow-sm',
    icon: Info,
    iconClass: 'text-info',
  },
  warning: {
    container: 'bg-brand-white border-warning/20 shadow-sm',
    icon: AlertTriangle,
    iconClass: 'text-warning',
  },
};

const DEFAULT_DURATION = 4000;

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const config = variantConfig[toast.variant];
  const Icon = config.icon;
  const duration = toast.duration ?? DEFAULT_DURATION;

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 w-full max-w-sm rounded-xl border px-4 py-3 animate-toast-in',
        config.container
      )}
    >
      <Icon className={cn('h-4 w-4 flex-shrink-0 mt-0.5', config.iconClass)} aria-hidden />
      <p className="flex-1 text-body-medium text-brand-black leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-1 rounded-lg text-text-muted hover:text-brand-black hover:bg-surface-inset transition-colors duration-200 min-h-8 min-w-8 flex items-center justify-center"
        aria-label="Закрыть уведомление"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'bottom-center';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  position = 'top-right',
}) => {
  if (toasts.length === 0) return null;

  const positionClasses =
    position === 'bottom-center'
      ? 'bottom-4 left-4 right-4 items-center pb-safe'
      : 'top-4 right-4 items-end pt-safe';

  return (
    <div
      className={cn('fixed z-[100] flex flex-col gap-2 pointer-events-none', positionClasses)}
      aria-label="Уведомления"
    >
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto w-full max-w-sm">
          <Toast toast={item} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};
