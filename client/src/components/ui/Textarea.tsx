import React from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const fieldBaseClasses =
  'w-full px-3 py-2.5 text-body rounded-lg bg-brand-white border border-border-input text-brand-black shadow-sm ' +
  'placeholder:text-text-muted resize-y min-h-[100px] transition-[border-color,box-shadow,background-color] duration-200 ' +
  'hover:border-text-muted/60 ' +
  'focus:outline-none focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20 ' +
  'disabled:bg-surface-inset disabled:border-border-subtle disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed';

const labelClasses = 'block text-caption font-medium text-brand-black mb-1.5';

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const textareaId =
      id ?? (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className={labelClasses}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            fieldBaseClasses,
            error && 'border-danger focus:ring-danger/20 focus:border-danger',
            className
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="mt-1.5 text-caption text-danger" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${textareaId}-helper`} className="mt-1.5 text-caption text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
