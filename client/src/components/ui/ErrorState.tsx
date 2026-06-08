import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
  retryLabel = 'Повторить',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-14 px-6',
        className
      )}
      role="alert"
    >
      <div className="mb-5 rounded-xl bg-danger-light p-4">
        <AlertCircle className="h-8 w-8 text-danger" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="text-section-title text-brand-black">Что-то пошло не так</p>
      <p className="mt-2 text-body text-text-muted max-w-sm leading-relaxed">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
