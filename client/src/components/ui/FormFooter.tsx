import React from 'react';
import { cn } from '../../utils/cn';
import { Button, ButtonProps } from './Button';

export interface FormFooterProps {
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  onSubmit?: () => void;
  submitType?: 'button' | 'submit';
  submitLoading?: boolean;
  submitDisabled?: boolean;
  submitVariant?: ButtonProps['variant'];
  showBorder?: boolean;
  showSubmit?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const FormFooter: React.FC<FormFooterProps> = ({
  onCancel,
  cancelLabel = 'Отмена',
  submitLabel = 'Сохранить',
  onSubmit,
  submitType = 'submit',
  submitLoading = false,
  submitDisabled = false,
  submitVariant = 'primary',
  showBorder = true,
  showSubmit = true,
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-4 py-3.5 sm:px-5',
        onCancel && showSubmit ? 'justify-between' : 'justify-end',
        showBorder && 'border-t border-border-subtle',
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {children}
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
      </div>
      {showSubmit && (
        <Button
          type={submitType}
          variant={submitVariant}
          onClick={submitType === 'button' ? onSubmit : undefined}
          loading={submitLoading}
          disabled={submitDisabled}
        >
          {submitLabel}
        </Button>
      )}
    </div>
  );
};
